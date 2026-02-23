import { NextResponse } from "next/server";
import { deleteQuestion, updateQuestion } from "@/lib/content";
import { requireRole } from "@/lib/guard";

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const user = requireRole("admin");
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
  };

  const next = updateQuestion(context.params.id, body as any);
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

  const ok = deleteQuestion(context.params.id);
  if (!ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
