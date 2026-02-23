import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPracticeQuestions } from "@/lib/progress";

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { subject?: string; grade?: string; knowledgePointId?: string };
  const subject = body.subject ?? "math";
  const grade = body.grade ?? (user.grade ?? "4");
  const questions = getPracticeQuestions(subject, grade, body.knowledgePointId);
  const question = questions[Math.floor(Math.random() * questions.length)];

  if (!question) {
    return NextResponse.json({ error: "no questions" }, { status: 404 });
  }

  return NextResponse.json({
    question: {
      id: question.id,
      stem: question.stem,
      options: question.options,
      knowledgePointId: question.knowledgePointId
    }
  });
}
