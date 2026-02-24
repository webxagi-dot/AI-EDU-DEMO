import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { generateKnowledgeTreeDraft } from "@/lib/ai";
import type { Subject } from "@/lib/types";
import { SUBJECT_OPTIONS } from "@/lib/constants";
export const dynamic = "force-dynamic";

const ALLOWED_SUBJECTS: Subject[] = SUBJECT_OPTIONS.map((item) => item.value as Subject);

export async function POST(request: Request) {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subjects?: string[];
    grades?: string[];
    edition?: string;
    volume?: string;
    unitCount?: number;
    chaptersPerUnit?: number;
    pointsPerChapter?: number;
  };

  const subjects = Array.isArray(body.subjects) ? body.subjects.filter(Boolean) : [];
  const grades = Array.isArray(body.grades) ? body.grades.filter(Boolean) : [];

  if (!subjects.length || !grades.length) {
    return NextResponse.json({ error: "subjects and grades required" }, { status: 400 });
  }

  const normalizedSubjects = subjects.filter((s) => ALLOWED_SUBJECTS.includes(s as Subject)) as Subject[];
  if (!normalizedSubjects.length) {
    return NextResponse.json({ error: "invalid subjects" }, { status: 400 });
  }

  const combos: { subject: Subject; grade: string }[] = [];
  normalizedSubjects.forEach((subject) => {
    grades.forEach((grade) => combos.push({ subject, grade }));
  });

  if (combos.length > 18) {
    return NextResponse.json({ error: "too many combinations (max 18)" }, { status: 400 });
  }

  const items: any[] = [];
  const failed: { subject: string; grade: string; reason: string }[] = [];

  for (const combo of combos) {
    const draft = await generateKnowledgeTreeDraft({
      subject: combo.subject,
      grade: combo.grade,
      edition: body.edition ?? "人教版",
      volume: body.volume ?? "上册",
      unitCount: body.unitCount,
      chaptersPerUnit: body.chaptersPerUnit,
      pointsPerChapter: body.pointsPerChapter
    });

    if (!draft) {
      failed.push({ subject: combo.subject, grade: combo.grade, reason: "AI 生成失败" });
      continue;
    }

    items.push({ subject: combo.subject, grade: combo.grade, units: draft.units });
  }

  return NextResponse.json({ items, failed });
}
