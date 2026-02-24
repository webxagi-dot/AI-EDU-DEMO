import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { createKnowledgePoint, getKnowledgePoints } from "@/lib/content";
import { generateKnowledgePointsDraft } from "@/lib/ai";
import { addAdminLog } from "@/lib/admin-log";
import type { Subject } from "@/lib/types";
import { SUBJECT_OPTIONS } from "@/lib/constants";
export const dynamic = "force-dynamic";

const ALLOWED_SUBJECTS: Subject[] = SUBJECT_OPTIONS.map((item) => item.value as Subject);

function normalizeKey(title: string, chapter: string) {
  return `${title}`.toLowerCase().replace(/\s+/g, "") + "|" + `${chapter}`.toLowerCase().replace(/\s+/g, "");
}

export async function POST(request: Request) {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subject?: string;
    grade?: string;
    chapter?: string;
    count?: number;
  };

  if (!body.subject || !body.grade) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!ALLOWED_SUBJECTS.includes(body.subject as Subject)) {
    return NextResponse.json({ error: "invalid subject" }, { status: 400 });
  }

  const subject = body.subject as Subject;
  const count = Math.min(Math.max(Number(body.count) || 5, 1), 10);

  const drafts = await generateKnowledgePointsDraft({
    subject,
    grade: body.grade,
    chapter: body.chapter,
    count
  });

  if (!drafts) {
    return NextResponse.json({ error: "AI 生成失败，请检查模型配置" }, { status: 400 });
  }

  const existing = (await getKnowledgePoints()).filter((kp) => kp.subject === subject && kp.grade === body.grade);
  const existingKeys = new Set(existing.map((kp) => normalizeKey(kp.title, kp.chapter)));

  const created: any[] = [];
  const skipped: { index: number; reason: string }[] = [];

  for (const [index, draft] of drafts.entries()) {
    const chapter = draft.chapter || body.chapter || "未归类";
    const key = normalizeKey(draft.title, chapter);
    if (existingKeys.has(key)) {
      skipped.push({ index, reason: "已存在" });
      continue;
    }

    const next = await createKnowledgePoint({
      subject,
      grade: body.grade,
      title: draft.title,
      chapter
    });

    if (!next) {
      skipped.push({ index, reason: "保存失败" });
      continue;
    }
    created.push(next);
    existingKeys.add(key);
  }

  await addAdminLog({
    adminId: user.id,
    action: "ai_generate_knowledge_points",
    entityType: "knowledge_point",
    entityId: null,
    detail: `count=${count}, created=${created.length}, skipped=${skipped.length}`
  });

  return NextResponse.json({ created, skipped });
}
