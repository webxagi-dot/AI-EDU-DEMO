import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassById, getClassStudents } from "@/lib/classes";
import { getAssignmentById, getAssignmentProgress } from "@/lib/assignments";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const assignmentId = context.params.id;
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const klass = await getClassById(assignment.classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const students = await getClassStudents(assignment.classId);
  const progress = await getAssignmentProgress(assignment.id);
  const progressMap = new Map(progress.map((item) => [item.studentId, item]));

  const roster = students.map((student) => {
    const record = progressMap.get(student.id);
    return {
      ...student,
      status: record?.status ?? "pending",
      score: record?.score ?? null,
      total: record?.total ?? null,
      completedAt: record?.completedAt ?? null
    };
  });

  return NextResponse.json({
    assignment,
    class: klass,
    students: roster
  });
}
