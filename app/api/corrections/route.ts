import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/user-context";
import { getCorrectionTasksByUser, addCorrectionTasks } from "@/lib/corrections";
import { getQuestions } from "@/lib/content";
export const dynamic = "force-dynamic";

function parseDueDate(input?: string) {
  if (!input) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 3);
    fallback.setHours(23, 59, 0, 0);
    return fallback.toISOString();
  }
  const [year, month, day] = input.split("-").map((item) => Number(item));
  if (!year || !month || !day) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 3);
    fallback.setHours(23, 59, 0, 0);
    return fallback.toISOString();
  }
  const due = new Date(year, month - 1, day, 23, 59, 0, 0);
  return due.toISOString();
}

export async function GET() {
  const student = await getStudentContext();
  if (!student) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tasks = await getCorrectionTasksByUser(student.id);
  const questions = await getQuestions();
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const now = Date.now();
  const pending = tasks.filter((t) => t.status === "pending");
  const overdue = pending.filter((t) => new Date(t.dueDate).getTime() < now);
  const dueSoon = pending.filter((t) => {
    const diff = new Date(t.dueDate).getTime() - now;
    return diff >= 0 && diff <= 2 * 24 * 60 * 60 * 1000;
  });

  return NextResponse.json({
    data: tasks.map((task) => ({
      ...task,
      question: questionMap.get(task.questionId) ?? null
    })),
    summary: {
      pending: pending.length,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      completed: tasks.filter((t) => t.status === "completed").length
    }
  });
}

export async function POST(request: Request) {
  const student = await getStudentContext();
  if (!student) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { questionIds?: string[]; dueDate?: string };
  const questionIds = Array.isArray(body.questionIds) ? body.questionIds.filter(Boolean) : [];
  if (!questionIds.length) {
    return NextResponse.json({ error: "questionIds required" }, { status: 400 });
  }

  const uniqueIds = Array.from(new Set(questionIds));
  const dueDate = parseDueDate(body.dueDate);
  const result = await addCorrectionTasks({
    userId: student.id,
    questionIds: uniqueIds,
    dueDate
  });

  return NextResponse.json(result);
}
