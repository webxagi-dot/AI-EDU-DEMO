import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/user-context";
import { getWeakKnowledgePoints, getWeeklyStats } from "@/lib/progress";

export async function GET() {
  const student = getStudentContext();
  if (!student) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stats = getWeeklyStats(student.id);
  const weakMath = getWeakKnowledgePoints(student.id, "math");

  return NextResponse.json({
    student: { id: student.id, name: student.name, grade: student.grade },
    stats,
    weakPoints: weakMath.map((item) => ({
      id: item.kp.id,
      title: item.kp.title,
      ratio: Math.round(item.ratio * 100),
      total: item.total
    }))
  });
}
