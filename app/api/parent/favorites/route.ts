import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuestions, getKnowledgePoints } from "@/lib/content";
import { getFavoritesByUser } from "@/lib/favorites";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "parent") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!user.studentId) {
    return NextResponse.json({ error: "missing student" }, { status: 400 });
  }

  const favorites = await getFavoritesByUser(user.studentId);
  const questions = await getQuestions();
  const knowledgePoints = await getKnowledgePoints();
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const kpMap = new Map(knowledgePoints.map((kp) => [kp.id, kp]));

  const data = favorites.map((fav) => {
    const question = questionMap.get(fav.questionId);
    const kp = question ? kpMap.get(question.knowledgePointId) : null;
    return {
      ...fav,
      question: question
        ? {
            id: question.id,
            stem: question.stem,
            subject: question.subject,
            grade: question.grade,
            knowledgePointId: question.knowledgePointId,
            knowledgePointTitle: kp?.title ?? "知识点"
          }
        : null
    };
  });

  return NextResponse.json({ data });
}
