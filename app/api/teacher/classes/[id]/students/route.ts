import { NextResponse } from "next/server";
import { getCurrentUser, getUserByEmail } from "@/lib/auth";
import { addStudentToClass, getClassById, getClassStudents } from "@/lib/classes";
import { createAssignmentProgress, getAssignmentsByClass } from "@/lib/assignments";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const classId = context.params.id;
  const klass = await getClassById(classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const students = await getClassStudents(classId);
  return NextResponse.json({ data: students });
}

export async function POST(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const classId = context.params.id;
  const klass = await getClassById(classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = (await request.json()) as { email?: string };
  if (!body.email) {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }

  const student = await getUserByEmail(body.email);
  if (!student || student.role !== "student") {
    return NextResponse.json({ error: "student not found" }, { status: 404 });
  }

  const added = await addStudentToClass(classId, student.id);
  if (added) {
    const assignments = await getAssignmentsByClass(classId);
    for (const assignment of assignments) {
      await createAssignmentProgress(assignment.id, student.id);
    }
    await createNotification({
      userId: student.id,
      title: "加入班级",
      content: `你已加入班级「${klass.name}」`,
      type: "class"
    });
  }

  return NextResponse.json({ added });
}
