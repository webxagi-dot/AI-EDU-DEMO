import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassById } from "@/lib/classes";
import { getAssignmentById } from "@/lib/assignments";
import { getAssignmentUploads } from "@/lib/assignment-uploads";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "missing studentId" }, { status: 400 });
  }

  const assignment = await getAssignmentById(context.params.id);
  if (!assignment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const klass = await getClassById(assignment.classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const uploads = await getAssignmentUploads(assignment.id, studentId);
  return NextResponse.json({ data: uploads });
}
