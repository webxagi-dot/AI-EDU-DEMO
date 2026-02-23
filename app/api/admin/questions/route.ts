import { NextResponse } from "next/server";
import { createQuestion, getQuestions } from "@/lib/content";
import { requireRole } from "@/lib/guard";
import { addAdminLog } from "@/lib/admin-log";
import type { Subject, Difficulty } from "@/lib/types";
export const dynamic = "force-dynamic";

const ALLOWED_SUBJECTS: Subject[] = ["math", "chinese", "english"];
const ALLOWED_DIFFICULTY: Difficulty[] = ["easy", "medium", "hard"];

export async function GET() {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ data: await getQuestions() });
}

export async function POST(request: Request) {
  const user = await requireRole("admin");
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
    difficulty?: Difficulty;
    questionType?: string;
    tags?: string[];
    abilities?: string[];
  };

  if (!body.subject || !body.grade || !body.knowledgePointId || !body.stem || !body.options || !body.answer) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!ALLOWED_SUBJECTS.includes(body.subject as Subject)) {
    return NextResponse.json({ error: "invalid subject" }, { status: 400 });
  }
  const difficulty = ALLOWED_DIFFICULTY.includes(body.difficulty as Difficulty)
    ? (body.difficulty as Difficulty)
    : "medium";

  const next = await createQuestion({
    subject: body.subject as Subject,
    grade: body.grade,
    knowledgePointId: body.knowledgePointId,
    stem: body.stem,
    options: body.options,
    answer: body.answer,
    explanation: body.explanation ?? "",
    difficulty,
    questionType: body.questionType ?? "choice",
    tags: body.tags ?? [],
    abilities: body.abilities ?? []
  });

  if (next) {
    await addAdminLog({
      adminId: user.id,
      action: "create_question",
      entityType: "question",
      entityId: next.id,
      detail: `${next.subject} ${next.grade} ${next.knowledgePointId}`
    });
  }

  return NextResponse.json({ data: next });
}
