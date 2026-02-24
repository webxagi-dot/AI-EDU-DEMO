import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateAssistAnswer } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    question?: string;
    subject?: string;
    grade?: string;
    studentAnswer?: string;
  };
  if (!body.question) {
    return NextResponse.json({ error: "missing question" }, { status: 400 });
  }

  const assist = await generateAssistAnswer({
    question: body.question,
    subject: body.subject,
    grade: body.grade
  });

  const checkpoints = [
    "你能先说出题目里给了哪些已知条件吗？",
    "这道题对应哪个知识点或公式？",
    "下一步你准备怎么做？"
  ];

  const feedback = body.studentAnswer
    ? `我看到你的思路：${body.studentAnswer}。我们先对照已知条件和关键公式，再把步骤拆成 2-3 步。`
    : null;

  return NextResponse.json({
    data: {
      answer: assist.answer,
      steps: assist.steps,
      hints: assist.hints,
      checkpoints,
      feedback,
      provider: assist.provider
    }
  });
}
