import { NextResponse } from "next/server";
import { deleteKnowledgePoint, updateKnowledgePoint } from "@/lib/content";
import { requireRole } from "@/lib/guard";

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const user = requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subject?: string;
    grade?: string;
    title?: string;
    chapter?: string;
  };

  const next = updateKnowledgePoint(context.params.id, body as any);
  if (!next) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ data: next });
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  const user = requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ok = deleteKnowledgePoint(context.params.id);
  if (!ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
