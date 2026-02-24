import { NextResponse } from "next/server";
import { getCurrentUser, getParentsByStudentId, getUserById } from "@/lib/auth";
import { getClassById, getClassStudentIds } from "@/lib/classes";
import { getAssignmentById, getAssignmentItems, getAssignmentSubmission } from "@/lib/assignments";
import { getQuestions } from "@/lib/content";
import { createNotification } from "@/lib/notifications";
import { saveReview, getReview } from "@/lib/reviews";
import { getAssignmentUploads } from "@/lib/assignment-uploads";
import { getAssignmentAIReview } from "@/lib/assignment-ai";
import { ensureDefaultRubrics, getReviewRubrics, saveReviewRubrics } from "@/lib/rubrics";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { id: string; studentId: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const assignmentId = context.params.id;
  const studentId = context.params.studentId;

  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const klass = await getClassById(assignment.classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const studentIds = await getClassStudentIds(klass.id);
  if (!studentIds.includes(studentId)) {
    return NextResponse.json({ error: "student not in class" }, { status: 404 });
  }

  const student = await getUserById(studentId);
  if (!student) {
    return NextResponse.json({ error: "student not found" }, { status: 404 });
  }

  const submission = await getAssignmentSubmission(assignment.id, studentId);
  const uploads = await getAssignmentUploads(assignment.id, studentId);
  const aiReview = await getAssignmentAIReview(assignment.id, studentId);
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
        options: question.options,
        answer,
        correctAnswer: question.answer,
        explanation: question.explanation,
        correct
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const reviewResult = await getReview(assignment.id, studentId);
  const rubrics = await ensureDefaultRubrics({
    assignmentId: assignment.id,
    submissionType: assignment.submissionType
  });
  const reviewRubrics = reviewResult.review ? await getReviewRubrics(reviewResult.review.id) : [];

  return NextResponse.json({
    assignment,
    class: klass,
    student: { id: student.id, name: student.name, email: student.email },
    submission,
    uploads,
    aiReview,
    questions: details,
    review: reviewResult.review,
    reviewItems: reviewResult.items,
    rubrics,
    reviewRubrics
  });
}

export async function POST(request: Request, context: { params: { id: string; studentId: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const assignmentId = context.params.id;
  const studentId = context.params.studentId;
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const klass = await getClassById(assignment.classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const studentIds = await getClassStudentIds(klass.id);
  if (!studentIds.includes(studentId)) {
    return NextResponse.json({ error: "student not in class" }, { status: 404 });
  }

  const body = (await request.json()) as {
    overallComment?: string;
    items?: Array<{ questionId: string; wrongTag?: string; comment?: string }>;
    rubrics?: Array<{ rubricId: string; score: number; comment?: string }>;
  };

  const saved = await saveReview({
    assignmentId,
    studentId,
    overallComment: body.overallComment?.trim(),
    items: body.items ?? []
  });

  if (saved.review && body.rubrics?.length) {
    await saveReviewRubrics({
      reviewId: saved.review.id,
      items: body.rubrics.map((item) => ({
        rubricId: item.rubricId,
        score: item.score,
        comment: item.comment
      }))
    });
  }

  await createNotification({
    userId: studentId,
    title: "作业批改已完成",
    content: `作业「${assignment.title}」已完成批改，请查看老师点评。`,
    type: "review"
  });

  const parents = await getParentsByStudentId(studentId);
  for (const parent of parents) {
    await createNotification({
      userId: parent.id,
      title: "孩子作业批改完成",
      content: `作业「${assignment.title}」已完成批改，可查看老师点评。`,
      type: "review"
    });
  }

  const reviewRubrics = saved.review ? await getReviewRubrics(saved.review.id) : [];
  return NextResponse.json({ review: saved.review, reviewItems: saved.items, reviewRubrics });
}
