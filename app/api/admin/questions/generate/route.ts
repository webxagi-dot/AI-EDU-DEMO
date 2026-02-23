import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { createQuestion, getKnowledgePoints } from "@/lib/content";
import { generateQuestionDraft } from "@/lib/ai";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subject?: string;
    grade?: string;
    knowledgePointId?: string;
    count?: number;
  };

  if (!body.subject || !body.grade || !body.knowledgePointId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const kp = (await getKnowledgePoints()).find((item) => item.id === body.knowledgePointId);
  if (!kp) {
    return NextResponse.json({ error: "knowledge point not found" }, { status: 404 });
  }

  const total = Math.min(Math.max(Number(body.count) || 1, 1), 5);
  const created: any[] = [];
  const failed: { index: number; reason: string }[] = [];

  for (let i = 0; i < total; i += 1) {
    const draft = await generateQuestionDraft({
      subject: body.subject,
      grade: body.grade,
      knowledgePointTitle: kp.title,
      chapter: kp.chapter
    });

    if (!draft) {
      failed.push({ index: i, reason: "AI 生成失败，请检查模型配置" });
      continue;
    }

    const next = await createQuestion({
      subject: body.subject,
      grade: body.grade,
      knowledgePointId: body.knowledgePointId,
      stem: draft.stem,
      options: draft.options,
      answer: draft.answer,
      explanation: draft.explanation
    });

    if (!next) {
      failed.push({ index: i, reason: "保存题目失败" });
      continue;
    }
    created.push(next);
  }

  return NextResponse.json({ created, failed });
}
