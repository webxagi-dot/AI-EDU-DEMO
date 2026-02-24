import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassesByTeacher, getClassStudents } from "@/lib/classes";
import {
  getAssignmentsByClass,
  getAssignmentProgress,
  getAssignmentSubmissionsByAssignment
} from "@/lib/assignments";
import { getAssignmentUploads } from "@/lib/assignment-uploads";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const status = searchParams.get("status") ?? "all";

  const classes = await getClassesByTeacher(user.id);
  const targetClasses = classId ? classes.filter((item) => item.id === classId) : classes;
  if (!targetClasses.length) {
    return NextResponse.json({ data: [], classes });
  }

  const rows: Array<{
    assignmentId: string;
    assignmentTitle: string;
    submissionType: string;
    dueDate: string;
    classId: string;
    className: string;
    subject: string;
    grade: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    status: string;
    score: number | null;
    total: number | null;
    completedAt: string | null;
    submittedAt?: string | null;
    uploadCount: number;
  }> = [];

  for (const klass of targetClasses) {
    const students = await getClassStudents(klass.id);
    const assignments = await getAssignmentsByClass(klass.id);
    for (const assignment of assignments) {
      const progress = await getAssignmentProgress(assignment.id);
      const progressMap = new Map(progress.map((item) => [item.studentId, item]));
      const submissions = await getAssignmentSubmissionsByAssignment(assignment.id);
      const submissionMap = new Map(submissions.map((item) => [item.studentId, item]));
      const uploads = assignment.submissionType === "upload" || assignment.submissionType === "essay"
        ? await getAssignmentUploads(assignment.id)
        : [];
      const uploadMap = new Map<string, number>();
      uploads.forEach((upload) => {
        uploadMap.set(upload.studentId, (uploadMap.get(upload.studentId) ?? 0) + 1);
      });

      students.forEach((student) => {
        const record = progressMap.get(student.id);
        const submission = submissionMap.get(student.id);
        const rowStatus = record?.status ?? "pending";
        const dueTime = new Date(assignment.dueDate).getTime();
        const isOverdue = rowStatus !== "completed" && dueTime < Date.now();
        const statusLabel = rowStatus === "completed" ? "completed" : isOverdue ? "overdue" : "pending";
        rows.push({
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          submissionType: assignment.submissionType ?? "quiz",
          dueDate: assignment.dueDate,
          classId: klass.id,
          className: klass.name,
          subject: klass.subject,
          grade: klass.grade,
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          status: statusLabel,
          score: record?.score ?? null,
          total: record?.total ?? null,
          completedAt: record?.completedAt ?? null,
          submittedAt: submission?.submittedAt ?? null,
          uploadCount: uploadMap.get(student.id) ?? 0
        });
      });
    }
  }

  const filtered =
    status === "all" ? rows : rows.filter((row) => row.status === status);

  return NextResponse.json({ data: filtered, classes });
}
