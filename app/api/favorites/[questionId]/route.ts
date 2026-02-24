import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFavoriteByUserQuestion, removeFavorite, upsertFavorite } from "@/lib/favorites";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { questionId: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const favorite = await getFavoriteByUserQuestion(user.id, context.params.questionId);
  return NextResponse.json({ data: favorite });
}

export async function PATCH(request: Request, context: { params: { questionId: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { tags?: string[]; note?: string };
  const tags = Array.isArray(body.tags)
    ? body.tags.map((item) => String(item).trim()).filter(Boolean)
    : undefined;

  const record = await upsertFavorite({
    userId: user.id,
    questionId: context.params.questionId,
    tags,
    note: body.note
  });

  return NextResponse.json({ data: record });
}

export async function DELETE(_: Request, context: { params: { questionId: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const removed = await removeFavorite(user.id, context.params.questionId);
  return NextResponse.json({ removed });
}
