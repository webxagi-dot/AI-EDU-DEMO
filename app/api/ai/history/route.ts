import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addHistoryItem, getHistoryByUser } from "@/lib/ai-history";

export async function GET() {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const list = getHistoryByUser(user.id);
  return NextResponse.json({ data: list });
}

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { question?: string; answer?: string };
  if (!body.question || !body.answer) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const next = addHistoryItem({
    userId: user.id,
    question: body.question,
    answer: body.answer,
    favorite: false,
    tags: []
  });

  return NextResponse.json({ data: next });
}
