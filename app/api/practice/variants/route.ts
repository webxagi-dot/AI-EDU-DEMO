import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getKnowledgePoints, getQuestions } from "@/lib/content";
import { generateVariantDrafts, generateWrongExplanation } from "@/lib/ai";
import { getPracticeQuestions } from "@/lib/progress";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { questionId?: string; studentAnswer?: string };
  if (!body.questionId) {
    return NextResponse.json({ error: "missing questionId" }, { status: 400 });
  }

  const question = (await getQuestions()).find((q) => q.id === body.questionId);
  if (!question) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const kp = (await getKnowledgePoints()).find((item) => item.id === question.knowledgePointId);
  const wrongExplanation = await generateWrongExplanation({
    subject: question.subject,
    grade: question.grade,
    question: question.stem,
    studentAnswer: body.studentAnswer ?? "",
    correctAnswer: question.answer,
    explanation: question.explanation,
    knowledgePointTitle: kp?.title
  });

  const drafts = await generateVariantDrafts({
    subject: question.subject,
    grade: question.grade,
    knowledgePointTitle: kp?.title ?? "",
    chapter: kp?.chapter,
    seedQuestion: question.stem,
    count: 3,
    difficulty: question.difficulty ?? "medium"
  });

  let variants = drafts ?? [];
  if (!variants.length) {
    const pool = await getPracticeQuestions(question.subject, question.grade, question.knowledgePointId);
    const fallback = pool.filter((q) => q.id !== question.id).slice(0, 3);
    variants = fallback.map((item) => ({
      stem: item.stem,
      options: item.options,
      answer: item.answer,
      explanation: item.explanation
    }));
  }

  return NextResponse.json({
    data: {
      explanation:
        wrongExplanation ?? {
          analysis: "建议先回顾题目对应的知识点，再关注关键条件与运算顺序。",
          hints: ["先找出题干已知条件", "对照正确答案检查步骤"]
        },
      variants
    }
  });
}
