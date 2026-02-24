import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getClassById } from "@/lib/classes";
import { getKnowledgePoints, getQuestions } from "@/lib/content";
import { generateQuestionDraft } from "@/lib/ai";

export const dynamic = "force-dynamic";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    classId?: string;
    subject?: string;
    grade?: string;
    knowledgePointIds?: string[];
    difficulty?: string;
    questionType?: string;
    durationMinutes?: number;
    questionCount?: number;
    mode?: "bank" | "ai";
  };

  let subject = body.subject ?? "math";
  let grade = body.grade ?? "4";
  let className = "";

  if (body.classId) {
    const klass = await getClassById(body.classId);
    if (!klass || klass.teacherId !== user.id) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    subject = klass.subject;
    grade = klass.grade;
    className = klass.name;
  }

  const questionCountInput = Number(body.questionCount) || 0;
  const durationMinutes = Number(body.durationMinutes) || 0;
  let count = questionCountInput;
  if (!count) {
    count = durationMinutes ? Math.max(5, Math.round(durationMinutes / 2)) : 10;
  }
  count = Math.max(1, Math.min(count, 50));

  const knowledgePointIds = Array.isArray(body.knowledgePointIds) ? body.knowledgePointIds : [];
  const difficulty = body.difficulty && body.difficulty !== "all" ? body.difficulty : undefined;
  const questionType = body.questionType && body.questionType !== "all" ? body.questionType : undefined;

  const questions = (await getQuestions()).filter((q) => {
    if (q.subject !== subject || q.grade !== grade) return false;
    if (knowledgePointIds.length && !knowledgePointIds.includes(q.knowledgePointId)) return false;
    if (difficulty && q.difficulty !== difficulty) return false;
    if (questionType && q.questionType !== questionType) return false;
    return true;
  });

  const selected = shuffle(questions).slice(0, count);
  let generated: Array<{
    id: string;
    stem: string;
    options: string[];
    answer: string;
    explanation: string;
    knowledgePointId: string;
    source: "bank" | "ai";
  }> = selected.map((item) => ({ ...item, source: "bank" as const }));

  if ((body.mode ?? "bank") === "ai" && generated.length < count) {
    const missing = count - generated.length;
    const knowledgePoints = await getKnowledgePoints();
    const kpPool = knowledgePointIds.length
      ? knowledgePoints.filter((kp) => knowledgePointIds.includes(kp.id))
      : knowledgePoints.filter((kp) => kp.subject === subject && kp.grade === grade);

    for (let i = 0; i < missing; i += 1) {
      const kp = kpPool[i % Math.max(1, kpPool.length)];
      if (!kp) break;
      const draft = await generateQuestionDraft({
        subject,
        grade,
        knowledgePointTitle: kp.title,
        chapter: kp.chapter,
        difficulty: (difficulty as any) ?? "medium",
        questionType: questionType ?? "choice"
      });
      if (!draft) continue;
      generated.push({
        id: `ai-${crypto.randomBytes(6).toString("hex")}`,
        stem: draft.stem,
        options: draft.options,
        answer: draft.answer,
        explanation: draft.explanation,
        knowledgePointId: kp.id,
        source: "ai"
      });
    }
  }

  const kpMap = new Map((await getKnowledgePoints()).map((kp) => [kp.id, kp]));
  const result = generated.map((item) => ({
    ...item,
    knowledgePointTitle: kpMap.get(item.knowledgePointId)?.title ?? "未归类",
    chapter: kpMap.get(item.knowledgePointId)?.chapter ?? "",
    unit: kpMap.get(item.knowledgePointId)?.unit ?? ""
  }));

  return NextResponse.json({
    data: {
      subject,
      grade,
      className,
      count: result.length,
      durationMinutes,
      questions: result
    }
  });
}
