import { NextResponse } from "next/server";
import { createKnowledgePoint, getKnowledgePoints } from "@/lib/content";
import { requireRole } from "@/lib/guard";
import { addAdminLog } from "@/lib/admin-log";
import type { Subject } from "@/lib/types";
import { SUBJECT_OPTIONS } from "@/lib/constants";
export const dynamic = "force-dynamic";

const ALLOWED_SUBJECTS: Subject[] = SUBJECT_OPTIONS.map((item) => item.value as Subject);

export async function GET() {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ data: await getKnowledgePoints() });
}

export async function POST(request: Request) {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subject?: string;
    grade?: string;
    title?: string;
    chapter?: string;
    unit?: string;
  };

  if (!body.subject || !body.grade || !body.title || !body.chapter) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!ALLOWED_SUBJECTS.includes(body.subject as Subject)) {
    return NextResponse.json({ error: "invalid subject" }, { status: 400 });
  }

  const next = await createKnowledgePoint({
    subject: body.subject as Subject,
    grade: body.grade,
    title: body.title,
    chapter: body.chapter,
    unit: body.unit && body.unit.trim().length ? body.unit.trim() : "未分单元"
  });

  if (next) {
    await addAdminLog({
      adminId: user.id,
      action: "create_knowledge_point",
      entityType: "knowledge_point",
      entityId: next.id,
      detail: `${next.subject} ${next.grade} ${next.unit ?? "未分单元"} ${next.title}`
    });
  }

  return NextResponse.json({ data: next });
}
