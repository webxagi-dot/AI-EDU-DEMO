import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getKnowledgePoints, getQuestions } from "@/lib/content";
import { generateExplainVariants } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { questionId?: string };
  if (!body.questionId) {
    return NextResponse.json({ error: "missing questionId" }, { status: 400 });
  }

  const questions = await getQuestions();
  const question = questions.find((q) => q.id === body.questionId);
  if (!question) {
    return NextResponse.json({ error: "question not found" }, { status: 404 });
  }

  const kps = await getKnowledgePoints();
  const kp = kps.find((item) => item.id === question.knowledgePointId);

  const variants = await generateExplainVariants({
    subject: question.subject,
    grade: question.grade,
    stem: question.stem,
    answer: question.answer,
    explanation: question.explanation,
    knowledgePointTitle: kp?.title
  });

  return NextResponse.json({ data: variants });
}
