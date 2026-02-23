import { NextResponse } from "next/server";
import { createKnowledgePoint, getKnowledgePoints } from "@/lib/content";
import { requireRole } from "@/lib/guard";

export async function GET() {
  const user = requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ data: getKnowledgePoints() });
}

export async function POST(request: Request) {
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

  if (!body.subject || !body.grade || !body.title || !body.chapter) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const next = createKnowledgePoint({
    subject: body.subject as any,
    grade: body.grade,
    title: body.title,
    chapter: body.chapter
  });

  return NextResponse.json({ data: next });
}
