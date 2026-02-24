import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuestions, getKnowledgePoints } from "@/lib/content";
import { getFavoritesByUser } from "@/lib/favorites";
import { isStudentInTeacherClasses } from "@/lib/classes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "missing studentId" }, { status: 400 });
  }

  const allowed = await isStudentInTeacherClasses(user.id, studentId);
  if (!allowed) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const favorites = await getFavoritesByUser(studentId);
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
