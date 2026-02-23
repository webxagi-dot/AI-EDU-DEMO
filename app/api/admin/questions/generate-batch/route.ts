import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { createQuestion, getKnowledgePoints, getQuestions } from "@/lib/content";
import { generateQuestionDraft } from "@/lib/ai";
import type { Subject, Difficulty } from "@/lib/types";
import { addAdminLog } from "@/lib/admin-log";
export const dynamic = "force-dynamic";

const ALLOWED_SUBJECTS: Subject[] = ["math", "chinese", "english"];
const ALLOWED_DIFFICULTY: Difficulty[] = ["easy", "medium", "hard"];

function normalizeStem(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。！？,.!?;:；：、]/g, "");
}

function shuffle<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function POST(request: Request) {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subject?: string;
    grade?: string;
    count?: number;
    chapter?: string;
    difficulty?: Difficulty;
  };

  if (!body.subject || !body.grade) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  if (!ALLOWED_SUBJECTS.includes(body.subject as Subject)) {
    return NextResponse.json({ error: "invalid subject" }, { status: 400 });
  }

  const subject = body.subject as Subject;
  const difficulty = ALLOWED_DIFFICULTY.includes(body.difficulty as Difficulty)
    ? (body.difficulty as Difficulty)
    : "medium";

  const allKps = await getKnowledgePoints();
  const available = allKps.filter((kp) => {
    if (kp.subject !== subject) return false;
    if (kp.grade !== body.grade) return false;
    if (body.chapter && kp.chapter !== body.chapter) return false;
    return true;
  });

  if (!available.length) {
    return NextResponse.json({ error: "no knowledge points" }, { status: 400 });
  }

  const total = Math.min(Math.max(Number(body.count) || 10, 10), 50);
  const kpList = shuffle(available);

  const existing = (await getQuestions()).filter((q) => q.subject === subject && q.grade === body.grade);
  const existingStems = new Set(existing.map((q) => normalizeStem(q.stem)));
  const createdStems = new Set<string>();

  const created: any[] = [];
  const failed: { index: number; reason: string }[] = [];

  for (let i = 0; i < total; i += 1) {
    const kp = kpList[i % kpList.length];
    let draft = null;
    let attempts = 0;

    while (!draft && attempts < 3) {
      attempts += 1;
      const next = await generateQuestionDraft({
        subject,
        grade: body.grade,
        knowledgePointTitle: kp.title,
        chapter: kp.chapter,
        difficulty
      });
      if (!next) continue;
      const key = normalizeStem(next.stem);
      if (existingStems.has(key) || createdStems.has(key)) {
        continue;
      }
      draft = next;
      createdStems.add(key);
    }

    if (!draft) {
      failed.push({ index: i, reason: "AI 生成失败" });
      continue;
    }

    const next = await createQuestion({
      subject,
      grade: body.grade,
      knowledgePointId: kp.id,
      stem: draft.stem,
      options: draft.options,
      answer: draft.answer,
      explanation: draft.explanation,
      difficulty,
      questionType: "choice",
      tags: [],
      abilities: []
    });

    if (!next) {
      failed.push({ index: i, reason: "保存题目失败" });
      continue;
    }

    created.push(next);
  }

  await addAdminLog({
    adminId: user.id,
    action: "ai_generate_batch",
    entityType: "question",
    entityId: null,
    detail: `count=${total}, created=${created.length}, failed=${failed.length}`
  });

  return NextResponse.json({ created, failed });
}
