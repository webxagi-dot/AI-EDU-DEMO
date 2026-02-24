import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassById, getClassesByStudent } from "@/lib/classes";
import { getStudentContext } from "@/lib/user-context";
import { getSyllabusByClass, upsertSyllabus } from "@/lib/syllabus";

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
  const syllabus = await getSyllabusByClass(classId);
  return NextResponse.json({ data: syllabus, class: klass });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    classId?: string;
    summary?: string;
    objectives?: string;
    gradingPolicy?: string;
    scheduleText?: string;
  };
  if (!body.classId) {
    return NextResponse.json({ error: "missing classId" }, { status: 400 });
  }
  const klass = await canAccessClass(user.id, user.role, body.classId);
  if (!klass) {
    return NextResponse.json({ error: "class not found" }, { status: 404 });
  }
  const syllabus = await upsertSyllabus({
    classId: body.classId,
    summary: body.summary ?? "",
    objectives: body.objectives ?? "",
    gradingPolicy: body.gradingPolicy ?? "",
    scheduleText: body.scheduleText ?? ""
  });
  return NextResponse.json({ data: syllabus });
}
