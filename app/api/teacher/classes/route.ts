import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClass, getClassesByTeacher, getClassStudentIds } from "@/lib/classes";
import type { Subject } from "@/lib/types";
import { getAssignmentsByClass } from "@/lib/assignments";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const classes = await getClassesByTeacher(user.id);
  const data = await Promise.all(
    classes.map(async (item) => {
      const studentIds = await getClassStudentIds(item.id);
      const assignments = await getAssignmentsByClass(item.id);
      return {
        ...item,
        studentCount: studentIds.length,
        assignmentCount: assignments.length
      };
    })
  );

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string; subject?: string; grade?: string };
  if (!body.name || !body.subject || !body.grade) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const allowedSubjects: Subject[] = ["math", "chinese", "english"];
  if (!allowedSubjects.includes(body.subject as Subject)) {
    return NextResponse.json({ error: "invalid subject" }, { status: 400 });
  }

  const created = await createClass({
    name: body.name,
    subject: body.subject as Subject,
    grade: body.grade,
    teacherId: user.id
  });

  return NextResponse.json({ data: created });
}
