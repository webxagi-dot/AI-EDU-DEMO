import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPracticeQuestions } from "@/lib/progress";

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { subject?: string; grade?: string };
  const subject = body.subject ?? "math";
  const grade = body.grade ?? (user.grade ?? "4");

  const questions = getPracticeQuestions(subject, grade).slice(0, 10);

  return NextResponse.json({
    subject,
    grade,
    questions: questions.map((q) => ({
      id: q.id,
      stem: q.stem,
      options: q.options,
      knowledgePointId: q.knowledgePointId
    }))
  });
}
