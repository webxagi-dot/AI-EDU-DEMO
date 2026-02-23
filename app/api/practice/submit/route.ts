import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getQuestions } from "@/lib/content";
import { addAttempt } from "@/lib/progress";

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { questionId?: string; answer?: string };
  if (!body.questionId || !body.answer) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const question = getQuestions().find((q) => q.id === body.questionId);
  if (!question) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const correct = body.answer === question.answer;
  addAttempt({
    id: crypto.randomBytes(10).toString("hex"),
    userId: user.id,
    questionId: question.id,
    subject: question.subject,
    knowledgePointId: question.knowledgePointId,
    correct,
    answer: body.answer,
    createdAt: new Date().toISOString()
  });

  return NextResponse.json({
    correct,
    answer: question.answer,
    explanation: question.explanation
  });
}
