import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassById, getClassesByStudent } from "@/lib/classes";
import { getStudentContext } from "@/lib/user-context";
import { getAssignmentsByClass } from "@/lib/assignments";
import { getModulesByClass } from "@/lib/modules";
import { getCourseFilesByClassIds } from "@/lib/course-files";

export const dynamic = "force-dynamic";

async function canAccessClass(userId: string, role: string, classId: string) {
  const klass = await getClassById(classId);
  if (!klass) return null;
  if (role === "teacher") {
    return klass.teacherId === userId ? klass : null;
  }
  if (role === "student") {
    const classes = await getClassesByStudent(userId);
    return classes.find((item) => item.id === classId) ?? null;
  }
  if (role === "parent") {
    const student = await getStudentContext();
    if (!student) return null;
    const classes = await getClassesByStudent(student.id);
    return classes.find((item) => item.id === classId) ?? null;
  }
  return null;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  if (!classId) {
    return NextResponse.json({ error: "missing classId" }, { status: 400 });
  }
  const klass = await canAccessClass(user.id, user.role, classId);
  if (!klass) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const assignments = await getAssignmentsByClass(classId);
  const upcoming = assignments
    .filter((item) => new Date(item.dueDate).getTime() >= Date.now())
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      title: item.title,
      dueDate: item.dueDate,
      submissionType: item.submissionType ?? "quiz"
    }));

  const modules = await getModulesByClass(classId);
  const files = await getCourseFilesByClassIds([classId]);

  return NextResponse.json({
    class: klass,
    summary: {
      moduleCount: modules.length,
      resourceCount: files.length,
      upcomingAssignments: upcoming
    }
  });
}
