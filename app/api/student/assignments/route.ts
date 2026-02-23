import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { getAssignmentProgressByStudent, getAssignmentsByClassIds } from "@/lib/assignments";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const classes = await getClassesByStudent(user.id);
  const classMap = new Map(classes.map((item) => [item.id, item]));
  const assignments = await getAssignmentsByClassIds(classes.map((item) => item.id));
  const progress = await getAssignmentProgressByStudent(user.id);
  const progressMap = new Map(progress.map((item) => [item.assignmentId, item]));

  const data = assignments.map((assignment) => {
    const klass = classMap.get(assignment.classId);
    const record = progressMap.get(assignment.id);
    return {
      ...assignment,
      className: klass?.name ?? "-",
      classSubject: klass?.subject ?? "-",
      classGrade: klass?.grade ?? "-",
      status: record?.status ?? "pending",
      score: record?.score ?? null,
      total: record?.total ?? null,
      completedAt: record?.completedAt ?? null
    };
  });

  return NextResponse.json({ data });
}
