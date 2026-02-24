import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { createKnowledgePoint, getKnowledgePoints } from "@/lib/content";
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
    items?: {
      subject: string;
      grade: string;
      units: { title: string; chapters: { title: string; points: { title: string }[] }[] }[];
    }[];
  };

  if (!body.items?.length) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  const created: any[] = [];
  const skipped: { index: number; reason: string }[] = [];

  const existing = await getKnowledgePoints();
  const existingKeys = new Set(
    existing.map((kp) => normalizeKey(kp.unit ?? "未分单元", kp.chapter, kp.title))
  );

  let index = 0;
  for (const item of body.items) {
    if (!ALLOWED_SUBJECTS.includes(item.subject as Subject)) {
      skipped.push({ index, reason: "invalid subject" });
      index += 1;
      continue;
    }

    for (const unit of item.units) {
      const unitTitle = unit.title || "未分单元";
      for (const chapter of unit.chapters || []) {
        for (const point of chapter.points || []) {
          const key = normalizeKey(unitTitle, chapter.title, point.title);
          if (existingKeys.has(key)) {
            skipped.push({ index, reason: "已存在" });
            index += 1;
            continue;
          }
          const next = await createKnowledgePoint({
            subject: item.subject as Subject,
            grade: item.grade,
            title: point.title,
            chapter: chapter.title,
            unit: unitTitle
          });
          if (!next) {
            skipped.push({ index, reason: "保存失败" });
          } else {
            created.push(next);
            existingKeys.add(key);
          }
          index += 1;
          if (created.length + skipped.length >= 500) break;
        }
        if (created.length + skipped.length >= 500) break;
      }
      if (created.length + skipped.length >= 500) break;
    }
  }

  await addAdminLog({
    adminId: user.id,
    action: "import_knowledge_tree",
    entityType: "knowledge_point",
    entityId: null,
    detail: `created=${created.length}, skipped=${skipped.length}`
  });

  return NextResponse.json({ created, skipped });
}
