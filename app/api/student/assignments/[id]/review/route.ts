import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { getAssignmentById, getAssignmentItems, getAssignmentSubmission } from "@/lib/assignments";
import { getQuestions } from "@/lib/content";
import { getReview } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { id: string } }) {
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

  const submission = await getAssignmentSubmission(assignment.id, user.id);
  const items = await getAssignmentItems(assignment.id);
  const questions = await getQuestions();
  const questionMap = new Map(questions.map((item) => [item.id, item]));

  const details = items
    .map((item) => {
      const question = questionMap.get(item.questionId);
      if (!question) return null;
      const answer = submission?.answers?.[question.id] ?? "";
      const correct = answer === question.answer;
      return {
        id: question.id,
        stem: question.stem,
        correct,
        answer,
        correctAnswer: question.answer,
        explanation: question.explanation
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const reviewResult = await getReview(assignment.id, user.id);
  return NextResponse.json({
    assignment,
    submission,
    questions: details,
    review: reviewResult.review,
    reviewItems: reviewResult.items
  });
}
