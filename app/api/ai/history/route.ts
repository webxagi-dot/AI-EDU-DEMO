import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addHistoryItem, getHistoryByUser } from "@/lib/ai-history";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const list = await getHistoryByUser(user.id);
  return NextResponse.json({ data: list });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { question?: string; answer?: string };
  if (!body.question || !body.answer) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const next = await addHistoryItem({
    userId: user.id,
    question: body.question,
    answer: body.answer,
    favorite: false,
    tags: []
  });

  return NextResponse.json({ data: next });
}
