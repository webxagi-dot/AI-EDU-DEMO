import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuestions, getKnowledgePoints } from "@/lib/content";
import { getFavoritesByUser, upsertFavorite } from "@/lib/favorites";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeQuestion = searchParams.get("includeQuestion") === "1";

  const favorites = await getFavoritesByUser(user.id);
  if (!includeQuestion) {
    return NextResponse.json({ data: favorites });
  }

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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { questionId?: string; tags?: string[]; note?: string };
  if (!body.questionId) {
    return NextResponse.json({ error: "missing questionId" }, { status: 400 });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.map((item) => String(item).trim()).filter(Boolean)
    : [];

  const record = await upsertFavorite({
    userId: user.id,
    questionId: body.questionId,
    tags,
    note: body.note
  });

  return NextResponse.json({ data: record });
}
