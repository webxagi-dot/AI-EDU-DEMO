import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { getAssignmentsByClassIds, getAssignmentProgressByStudent } from "@/lib/assignments";
import { getModuleById, getModuleResources } from "@/lib/modules";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const moduleId = context.params.id;
  const moduleRecord = await getModuleById(moduleId);
  if (!moduleRecord) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const classes = await getClassesByStudent(user.id);
  const classIds = new Set(classes.map((item) => item.id));
  if (!classIds.has(moduleRecord.classId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const resources = await getModuleResources(moduleId);
  const assignments = await getAssignmentsByClassIds([moduleRecord.classId]);
  const moduleAssignments = assignments.filter((assignment) => assignment.moduleId === moduleId);
  const progress = await getAssignmentProgressByStudent(user.id);
  const progressMap = new Map(progress.map((item) => [item.assignmentId, item]));

  const assignmentData = moduleAssignments.map((assignment) => ({
    ...assignment,
    status: progressMap.get(assignment.id)?.status ?? "pending"
  }));

  return NextResponse.json({ data: { module: moduleRecord, resources, assignments: assignmentData } });
}
