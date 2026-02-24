import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassById } from "@/lib/classes";
import { getAssignmentById } from "@/lib/assignments";
import { getAssignmentRubrics, replaceAssignmentRubrics } from "@/lib/rubrics";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const assignment = await getAssignmentById(context.params.id);
  if (!assignment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const klass = await getClassById(assignment.classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const rubrics = await getAssignmentRubrics(assignment.id);
  return NextResponse.json({ data: rubrics });
}

export async function POST(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const assignment = await getAssignmentById(context.params.id);
  if (!assignment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const klass = await getClassById(assignment.classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = (await request.json()) as {
    items?: Array<{
      title?: string;
      description?: string;
      maxScore?: number;
      weight?: number;
      levels?: Array<{ label: string; score: number; description: string }>;
    }>;
  };
  if (!body.items || !body.items.length) {
    return NextResponse.json({ error: "missing items" }, { status: 400 });
  }
  const cleaned = body.items
    .map((item) => ({
      title: item.title?.trim() ?? "",
      description: item.description?.trim() ?? "",
      maxScore: Number(item.maxScore ?? 5),
      weight: Number(item.weight ?? 1),
      levels: item.levels?.filter((level) => level.label && level.description) ?? []
    }))
    .filter((item) => item.title);
  if (!cleaned.length) {
    return NextResponse.json({ error: "missing items" }, { status: 400 });
  }
  const saved = await replaceAssignmentRubrics({ assignmentId: assignment.id, items: cleaned });
  return NextResponse.json({ data: saved });
}
