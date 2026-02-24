import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassesByTeacher, getClassById, getClassStudents } from "@/lib/classes";
import { getAssignmentsByClass, getAssignmentProgress } from "@/lib/assignments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const classes = await getClassesByTeacher(user.id);
  if (!classes.length) {
    return NextResponse.json({ classes: [], class: null, assignments: [], students: [], summary: null });
  }

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId") ?? classes[0].id;
  const klass = classes.find((item) => item.id === classId) ?? classes[0];
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "class not found" }, { status: 404 });
  }

  const assignments = await getAssignmentsByClass(klass.id);
  const students = await getClassStudents(klass.id);

  const progressLists = await Promise.all(assignments.map((assignment) => getAssignmentProgress(assignment.id)));
  const progressMaps = progressLists.map(
    (list) => new Map(list.map((item) => [item.studentId, item]))
  );
  const now = Date.now();

  let totalProgress = 0;
  let completedProgress = 0;
  let scoreSum = 0;
  let totalSum = 0;

  const assignmentStats = assignments.map((assignment, index) => {
    const progress = progressLists[index] ?? [];
    const completed = progress.filter((item) => item.status === "completed").length;
    const total = students.length;
    const dueTime = new Date(assignment.dueDate).getTime();
    const pending = total - completed;
    const overdue = dueTime < now ? pending : 0;
    return { assignmentId: assignment.id, completed, total, overdue };
  });

  const studentRows = students.map((student) => {
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    let late = 0;
    let studentScore = 0;
    let studentTotal = 0;
    const progress: Record<
      string,
      { status: string; score: number | null; total: number | null; completedAt: string | null }
    > = {};

    assignments.forEach((assignment, index) => {
      const record = progressMaps[index]?.get(student.id) ?? null;
      const status = record?.status ?? "pending";
      const dueTime = new Date(assignment.dueDate).getTime();
      const completedAt = record?.completedAt ? new Date(record.completedAt).getTime() : null;

      if (status === "completed") {
        completed += 1;
        if (completedAt && completedAt > dueTime) {
          late += 1;
        }
      } else {
        pending += 1;
        if (dueTime < now) {
          overdue += 1;
        }
      }

      if (
        assignment.submissionType === "quiz" &&
        typeof record?.score === "number" &&
        typeof record?.total === "number" &&
        record.total > 0
      ) {
        studentScore += record.score;
        studentTotal += record.total;
      }

      progress[assignment.id] = {
        status,
        score: record?.score ?? null,
        total: record?.total ?? null,
        completedAt: record?.completedAt ?? null
      };
    });

    totalProgress += assignments.length;
    completedProgress += completed;
    scoreSum += studentScore;
    totalSum += studentTotal;

    const avgScore = studentTotal ? Math.round((studentScore / studentTotal) * 100) : 0;

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      grade: student.grade,
      stats: { completed, pending, overdue, late, avgScore },
      progress
    };
  });

  const completionRate = totalProgress ? Math.round((completedProgress / totalProgress) * 100) : 0;
  const avgScore = totalSum ? Math.round((scoreSum / totalSum) * 100) : 0;

  return NextResponse.json({
    classes,
    class: klass,
    assignments,
    assignmentStats,
    students: studentRows,
    summary: {
      students: students.length,
      assignments: assignments.length,
      completionRate,
      avgScore
    }
  });
}
