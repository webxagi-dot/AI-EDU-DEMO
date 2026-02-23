import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import {
  completeAssignmentProgress,
  getAssignmentById,
  getAssignmentItems,
  upsertAssignmentSubmission
} from "@/lib/assignments";
import { getQuestions } from "@/lib/content";
import { addAttempt } from "@/lib/progress";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const assignmentId = context.params.id;
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const classes = await getClassesByStudent(user.id);
  const classIds = new Set(classes.map((item) => item.id));
  if (!classIds.has(assignment.classId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = (await request.json()) as { answers?: Record<string, string> };
  const answers = body.answers ?? {};

  const items = await getAssignmentItems(assignment.id);
  const questions = await getQuestions();
  const questionMap = new Map(questions.map((item) => [item.id, item]));

  let score = 0;
  const details = [] as Array<{
    questionId: string;
    correct: boolean;
    answer: string;
    correctAnswer: string;
    explanation: string;
  }>;

  for (const item of items) {
    const question = questionMap.get(item.questionId);
    if (!question) {
      continue;
    }
    const answer = answers[question.id] ?? "";
    const correct = answer === question.answer;
    if (correct) score += 1;

    await addAttempt({
      id: crypto.randomBytes(10).toString("hex"),
      userId: user.id,
      questionId: question.id,
      subject: question.subject,
      knowledgePointId: question.knowledgePointId,
      correct,
      answer,
      createdAt: new Date().toISOString()
    });

    details.push({
      questionId: question.id,
      correct,
      answer,
      correctAnswer: question.answer,
      explanation: question.explanation
    });
  }

  const total = items.length;
  await completeAssignmentProgress({
    assignmentId: assignment.id,
    studentId: user.id,
    score,
    total
  });

  await upsertAssignmentSubmission({
    assignmentId: assignment.id,
    studentId: user.id,
    answers,
    score,
    total
  });

  return NextResponse.json({ score, total, details });
}
