import { NextResponse } from "next/server";
import { deleteQuestion, updateQuestion } from "@/lib/content";
import { requireRole } from "@/lib/guard";
import { addAdminLog } from "@/lib/admin-log";
import type { Difficulty } from "@/lib/types";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subject?: string;
    grade?: string;
    knowledgePointId?: string;
    stem?: string;
    options?: string[];
    answer?: string;
    explanation?: string;
    difficulty?: Difficulty;
  };

  const next = await updateQuestion(context.params.id, body as any);
  if (!next) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await addAdminLog({
    adminId: user.id,
    action: "update_question",
    entityType: "question",
    entityId: next.id,
    detail: `${next.subject} ${next.grade} ${next.knowledgePointId}`
  });

  return NextResponse.json({ data: next });
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ok = await deleteQuestion(context.params.id);
  if (!ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await addAdminLog({
    adminId: user.id,
    action: "delete_question",
    entityType: "question",
    entityId: context.params.id,
    detail: ""
  });

  return NextResponse.json({ ok: true });
}
