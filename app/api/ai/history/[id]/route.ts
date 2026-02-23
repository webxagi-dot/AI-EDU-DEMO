import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteHistoryItem, updateHistoryItem } from "@/lib/ai-history";

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { favorite?: boolean; tags?: string[] };
  const next = await updateHistoryItem(context.params.id, body as any);
  if (!next) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ data: next });
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ok = await deleteHistoryItem(context.params.id);
  if (!ok) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
