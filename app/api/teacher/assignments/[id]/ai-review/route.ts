import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassById } from "@/lib/classes";
import { getAssignmentById, getAssignmentSubmission } from "@/lib/assignments";
import { getAssignmentUploads } from "@/lib/assignment-uploads";
import { generateHomeworkReview } from "@/lib/ai";
import { upsertAssignmentAIReview } from "@/lib/assignment-ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { studentId?: string };
  if (!body.studentId) {
    return NextResponse.json({ error: "missing studentId" }, { status: 400 });
  }

  const assignment = await getAssignmentById(context.params.id);
  if (!assignment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const klass = await getClassById(assignment.classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const uploads = await getAssignmentUploads(assignment.id, body.studentId);
  if (!uploads.length) {
    return NextResponse.json({ error: "学生未上传作业" }, { status: 400 });
  }

  const submission = await getAssignmentSubmission(assignment.id, body.studentId);

  const review = await generateHomeworkReview({
    subject: klass.subject,
    grade: klass.grade,
    assignmentTitle: assignment.title,
    assignmentDescription: assignment.description,
    focus: assignment.gradingFocus,
    studentNote: submission?.submissionText,
    images: uploads.map((item) => ({
      mimeType: item.mimeType,
      base64: item.contentBase64,
      fileName: item.fileName
    }))
  });

  const saved = await upsertAssignmentAIReview({
    assignmentId: assignment.id,
    studentId: body.studentId,
    result: review,
    provider: review.provider
  });

  return NextResponse.json({ data: saved });
}
