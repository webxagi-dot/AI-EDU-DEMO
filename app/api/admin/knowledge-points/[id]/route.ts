import { NextResponse } from "next/server";
import { deleteKnowledgePoint, updateKnowledgePoint } from "@/lib/content";
import { requireRole } from "@/lib/guard";
import { addAdminLog } from "@/lib/admin-log";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: { id: string } }) {
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

  const next = await updateKnowledgePoint(context.params.id, body as any);
  if (!next) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await addAdminLog({
    adminId: user.id,
    action: "update_knowledge_point",
    entityType: "knowledge_point",
    entityId: next.id,
    detail: `${next.subject} ${next.grade} ${next.unit ?? "未分单元"} ${next.title}`
  });

  return NextResponse.json({ data: next });
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ok = await deleteKnowledgePoint(context.params.id);
  if (!ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await addAdminLog({
    adminId: user.id,
    action: "delete_knowledge_point",
    entityType: "knowledge_point",
    entityId: context.params.id,
    detail: ""
  });

  return NextResponse.json({ ok: true });
}
