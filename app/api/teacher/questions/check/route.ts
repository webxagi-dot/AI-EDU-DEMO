import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuestions } from "@/lib/content";
import { generateQuestionCheck } from "@/lib/ai";

export const dynamic = "force-dynamic";

function basicCheck(payload: {
  stem: string;
  options: string[];
  answer: string;
  explanation?: string;
}) {
  const issues: string[] = [];
  const trimmedOptions = payload.options.map((opt) => opt.trim()).filter(Boolean);
  const uniqueOptions = new Set(trimmedOptions);
  if (trimmedOptions.length < 4) {
    issues.push("选项数量不足 4 个。");
  }
  if (uniqueOptions.size !== trimmedOptions.length) {
    issues.push("存在重复选项，可能导致歧义。");
  }
  if (!trimmedOptions.includes(payload.answer.trim())) {
    issues.push("答案不在选项中，需检查答案是否正确。");
  }
  if (!payload.explanation || payload.explanation.trim().length < 5) {
    issues.push("解析过短，建议补充解题步骤。");
  }
  const risk = issues.length >= 3 ? "high" : issues.length >= 1 ? "medium" : "low";
  return { issues, risk };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    questionId?: string;
    stem?: string;
    options?: string[];
    answer?: string;
    explanation?: string;
    subject?: string;
    grade?: string;
  };

  let stem = body.stem ?? "";
  let options = Array.isArray(body.options) ? body.options : [];
  let answer = body.answer ?? "";
  let explanation = body.explanation ?? "";
  let subject = body.subject;
  let grade = body.grade;

  if (body.questionId) {
    const question = (await getQuestions()).find((q) => q.id === body.questionId);
    if (!question) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    stem = question.stem;
    options = question.options;
    answer = question.answer;
    explanation = question.explanation;
    subject = question.subject;
    grade = question.grade;
  }

  if (!stem || !options.length || !answer) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const base = basicCheck({ stem, options, answer, explanation });
  const ai = await generateQuestionCheck({
    stem,
    options,
    answer,
    explanation,
    subject,
    grade
  });

  const issues = [...base.issues, ...(ai?.issues ?? [])];
  const risk = ai?.risk ?? base.risk;

  return NextResponse.json({
    data: {
      issues,
      risk,
      suggestedAnswer: ai?.suggestedAnswer,
      notes: ai?.notes
    }
  });
}
