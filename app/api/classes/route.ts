import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent, getClassesByTeacher } from "@/lib/classes";
import { getStudentContext } from "@/lib/user-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (user.role === "teacher") {
    const classes = await getClassesByTeacher(user.id);
    return NextResponse.json({ data: classes });
  }

  if (user.role === "student") {
    const classes = await getClassesByStudent(user.id);
    return NextResponse.json({ data: classes });
  }

  if (user.role === "parent") {
    const student = await getStudentContext();
    if (!student) return NextResponse.json({ data: [] });
    const classes = await getClassesByStudent(student.id);
    return NextResponse.json({ data: classes });
  }

  return NextResponse.json({ data: [] });
}
