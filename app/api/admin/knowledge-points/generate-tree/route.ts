import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { createKnowledgePoint, getKnowledgePoints } from "@/lib/content";
import { generateKnowledgeTreeDraft } from "@/lib/ai";
import { addAdminLog } from "@/lib/admin-log";
import type { Subject } from "@/lib/types";
import { SUBJECT_OPTIONS } from "@/lib/constants";
export const dynamic = "force-dynamic";

const ALLOWED_SUBJECTS: Subject[] = SUBJECT_OPTIONS.map((item) => item.value as Subject);

function normalizeKey(unit: string, chapter: string, title: string) {
  return `${unit}`.toLowerCase().replace(/\s+/g, "") + "|" + `${chapter}`.toLowerCase().replace(/\s+/g, "") + "|" + `${title}`.toLowerCase().replace(/\s+/g, "");
}

export async function POST(request: Request) {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subject?: string;
    grade?: string;
    edition?: string;
    volume?: string;
    unitCount?: number;
  };

  if (!body.subject || !body.grade) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!ALLOWED_SUBJECTS.includes(body.subject as Subject)) {
    return NextResponse.json({ error: "invalid subject" }, { status: 400 });
  }

  const subject = body.subject as Subject;
  const draft = await generateKnowledgeTreeDraft({
    subject,
    grade: body.grade,
    edition: body.edition ?? "人教版",
    volume: body.volume ?? "上册",
    unitCount: body.unitCount
  });

  if (!draft) {
    return NextResponse.json({ error: "AI 生成失败，请检查模型配置" }, { status: 400 });
  }

  const existing = (await getKnowledgePoints()).filter((kp) => kp.subject === subject && kp.grade === body.grade);
  const existingKeys = new Set(existing.map((kp) => normalizeKey(kp.unit ?? "未分单元", kp.chapter, kp.title)));

  const created: any[] = [];
  const skipped: { index: number; reason: string }[] = [];

  let index = 0;
  for (const unit of draft.units) {
    for (const chapter of unit.chapters) {
      for (const point of chapter.points) {
        const key = normalizeKey(unit.title, chapter.title, point.title);
        if (existingKeys.has(key)) {
          skipped.push({ index, reason: "已存在" });
          index += 1;
          continue;
        }
        const next = await createKnowledgePoint({
          subject,
          grade: body.grade,
          title: point.title,
          chapter: chapter.title,
          unit: unit.title
        });
        if (!next) {
          skipped.push({ index, reason: "保存失败" });
        } else {
          created.push(next);
          existingKeys.add(key);
        }
        index += 1;
        if (created.length + skipped.length >= 200) break;
      }
      if (created.length + skipped.length >= 200) break;
    }
    if (created.length + skipped.length >= 200) break;
  }

  await addAdminLog({
    adminId: user.id,
    action: "ai_generate_tree",
    entityType: "knowledge_point",
    entityId: null,
    detail: `created=${created.length}, skipped=${skipped.length}`
  });

  return NextResponse.json({ created, skipped });
}
