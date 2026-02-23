import { NextResponse } from "next/server";
import { createKnowledgePoint, getKnowledgePoints } from "@/lib/content";
import { requireRole } from "@/lib/guard";
import { addAdminLog } from "@/lib/admin-log";
import type { Subject } from "@/lib/types";
export const dynamic = "force-dynamic";

const ALLOWED_SUBJECTS: Subject[] = ["math", "chinese", "english"];

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
    chapter: body.chapter
  });

  if (next) {
    await addAdminLog({
      adminId: user.id,
      action: "create_knowledge_point",
      entityType: "knowledge_point",
      entityId: next.id,
      detail: `${next.subject} ${next.grade} ${next.title}`
    });
  }

  return NextResponse.json({ data: next });
}
