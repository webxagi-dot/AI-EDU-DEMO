import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getQuestions } from "@/lib/content";
import { addAttempt, generateStudyPlan } from "@/lib/progress";

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subject?: string;
    grade?: string;
    answers?: { questionId: string; answer: string }[];
  };

  if (!body.subject || !body.grade || !body.answers?.length) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const questions = getQuestions();
  let correctCount = 0;

  body.answers.forEach((item) => {
    const question = questions.find((q) => q.id === item.questionId);
    if (!question) return;
    const correct = item.answer === question.answer;
    if (correct) correctCount += 1;
    addAttempt({
      id: crypto.randomBytes(10).toString("hex"),
      userId: user.id,
      questionId: question.id,
      subject: question.subject,
      knowledgePointId: question.knowledgePointId,
      correct,
      answer: item.answer,
      createdAt: new Date().toISOString()
    });
  });

  const plan = generateStudyPlan(user.id, body.subject);

  return NextResponse.json({
    total: body.answers.length,
    correct: correctCount,
    accuracy: Math.round((correctCount / body.answers.length) * 100),
    plan
  });
}
