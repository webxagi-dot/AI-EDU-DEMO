import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { getAssignmentById, getAssignmentItems, getAssignmentProgressForStudent } from "@/lib/assignments";
import { getQuestions } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const assignmentId = context.params.id;
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const classes = await getClassesByStudent(user.id);
  const classMap = new Map(classes.map((item) => [item.id, item]));
  const klass = classMap.get(assignment.classId);
  if (!klass) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const items = await getAssignmentItems(assignment.id);
  const questions = await getQuestions();
  const questionMap = new Map(questions.map((item) => [item.id, item]));
  const payloadQuestions = items
    .map((item) => questionMap.get(item.questionId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      id: item.id,
      stem: item.stem,
      options: item.options
    }));

  const progress = await getAssignmentProgressForStudent(assignment.id, user.id);

  return NextResponse.json({
    assignment,
    class: { id: klass.id, name: klass.name, subject: klass.subject, grade: klass.grade },
    questions: payloadQuestions,
    progress
  });
}
