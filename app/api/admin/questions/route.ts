import { NextResponse } from "next/server";
import { createQuestion, getQuestions } from "@/lib/content";
import { requireRole } from "@/lib/guard";

export async function GET() {
  const user = requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ data: getQuestions() });
}

export async function POST(request: Request) {
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

  if (!body.subject || !body.grade || !body.knowledgePointId || !body.stem || !body.options || !body.answer) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const next = createQuestion({
    subject: body.subject as any,
    grade: body.grade,
    knowledgePointId: body.knowledgePointId,
    stem: body.stem,
    options: body.options,
    answer: body.answer,
    explanation: body.explanation ?? ""
  });

  return NextResponse.json({ data: next });
}
