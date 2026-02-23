import { NextResponse } from "next/server";
import { generateAssistAnswer } from "@/lib/ai";
export const dynamic = "force-dynamic";

type AssistRequest = {
  question: string;
  subject?: string;
  grade?: string;
  knowledgePoint?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AssistRequest;

  if (!body?.question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const response = await generateAssistAnswer({
    question: body.question,
    subject: body.subject,
    grade: body.grade
  });

  return NextResponse.json({
    answer: response.answer,
    steps: response.steps,
    hints: response.hints,
    source: response.sources,
    provider: response.provider
  });
}
