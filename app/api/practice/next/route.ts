import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAdaptiveQuestions, getPracticeQuestions, getWrongQuestionIds } from "@/lib/progress";
import { getQuestions } from "@/lib/content";
import { getStudentProfile } from "@/lib/profiles";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subject?: string;
    grade?: string;
    knowledgePointId?: string;
    mode?: string;
  };
  const subject = body.subject ?? "math";
  const profile = await getStudentProfile(user.id);
  const grade = body.grade ?? profile?.grade ?? (user.grade ?? "4");
  let questions = await getPracticeQuestions(subject, grade, body.knowledgePointId);
  if (body.mode === "wrong") {
    const wrongIds = await getWrongQuestionIds(user.id);
    const all = await getQuestions();
    questions = all.filter(
      (q) =>
        wrongIds.includes(q.id) &&
        (!body.subject || q.subject === subject) &&
        (!body.grade || q.grade === grade) &&
        (!body.knowledgePointId || q.knowledgePointId === body.knowledgePointId)
    );
  }
  if (body.mode === "adaptive") {
    questions = await getAdaptiveQuestions({
      userId: user.id,
      subject,
      grade,
      knowledgePointId: body.knowledgePointId
    });
  }
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
