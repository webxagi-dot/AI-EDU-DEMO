import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getKnowledgePoints, getQuestions } from "@/lib/content";
import { addAttempt, generateStudyPlan } from "@/lib/progress";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subject?: string;
    grade?: string;
    answers?: { questionId: string; answer: string; reason?: string }[];
  };

  if (!body.subject || !body.grade || !body.answers?.length) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const questions = await getQuestions();
  const kpList = await getKnowledgePoints();
  const kpMap = new Map(kpList.map((kp) => [kp.id, kp.title]));
  let correctCount = 0;
  const breakdown = new Map<string, { correct: number; total: number }>();
  const wrongReasons = new Map<string, number>();

  for (const item of body.answers) {
    const question = questions.find((q) => q.id === item.questionId);
    if (!question) continue;
    const correct = item.answer === question.answer;
    if (correct) correctCount += 1;
    const stat = breakdown.get(question.knowledgePointId) ?? { correct: 0, total: 0 };
    stat.total += 1;
    if (correct) stat.correct += 1;
    breakdown.set(question.knowledgePointId, stat);
    if (!correct && item.reason) {
      wrongReasons.set(item.reason, (wrongReasons.get(item.reason) ?? 0) + 1);
    }
    await addAttempt({
      id: crypto.randomBytes(10).toString("hex"),
      userId: user.id,
      questionId: question.id,
      subject: question.subject,
      knowledgePointId: question.knowledgePointId,
      correct,
      answer: item.answer,
      reason: item.reason,
      createdAt: new Date().toISOString()
    });
  }

  const plan = await generateStudyPlan(user.id, body.subject);

  return NextResponse.json({
    total: body.answers.length,
    correct: correctCount,
    accuracy: Math.round((correctCount / body.answers.length) * 100),
    plan,
    breakdown: Array.from(breakdown.entries()).map(([knowledgePointId, stat]) => ({
      knowledgePointId,
      title: kpMap.get(knowledgePointId) ?? "知识点",
      total: stat.total,
      correct: stat.correct,
      accuracy: stat.total === 0 ? 0 : Math.round((stat.correct / stat.total) * 100)
    })),
    wrongReasons: Array.from(wrongReasons.entries()).map(([reason, count]) => ({ reason, count }))
  });
}
