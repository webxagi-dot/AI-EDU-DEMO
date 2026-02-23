import { NextResponse } from "next/server";
import { createQuestion } from "@/lib/content";
import { requireRole } from "@/lib/guard";

export async function POST(request: Request) {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    items?: {
      subject?: string;
      grade?: string;
      knowledgePointId?: string;
      stem?: string;
      options?: string[];
      answer?: string;
      explanation?: string;
    }[];
  };

  if (!body.items?.length) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  const created: string[] = [];
  const failed: { index: number; reason: string }[] = [];

  for (const [index, item] of body.items.entries()) {
    if (!item.subject || !item.grade || !item.knowledgePointId || !item.stem || !item.options?.length || !item.answer) {
      failed.push({ index, reason: "missing fields" });
      continue;
    }
    const next = await createQuestion({
      subject: item.subject as any,
      grade: item.grade,
      knowledgePointId: item.knowledgePointId,
      stem: item.stem,
      options: item.options,
      answer: item.answer,
      explanation: item.explanation ?? ""
    });
    if (next?.id) created.push(next.id);
  }

  return NextResponse.json({ created: created.length, failed });
}
