import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateWritingFeedback } from "@/lib/ai";
import { addWritingSubmission } from "@/lib/writing";

export const dynamic = "force-dynamic";

function fallbackFeedback(content: string) {
  const length = content.trim().length;
  const base = Math.min(85, Math.max(60, Math.round(length / 3)));
  return {
    scores: {
      structure: base,
      grammar: Math.max(55, base - 5),
      vocab: Math.max(55, base - 8)
    },
    summary: "已完成基础批改，请根据建议优化结构与表达。",
    strengths: ["表达较完整", "有一定连贯性"],
    improvements: ["增加过渡句", "注意语法与标点"],
    corrected: undefined
  };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subject?: string;
    grade?: string;
    title?: string;
    content?: string;
  };
  if (!body.content || !body.subject || !body.grade) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const feedback =
    (await generateWritingFeedback({
      subject: body.subject,
      grade: body.grade,
      title: body.title,
      content: body.content
    })) ?? fallbackFeedback(body.content);

  const submission = await addWritingSubmission({
    userId: user.id,
    subject: body.subject,
    grade: body.grade,
    title: body.title,
    content: body.content,
    feedback
  });

  return NextResponse.json({ data: submission });
}
