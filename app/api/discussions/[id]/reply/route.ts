import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent, getClassesByTeacher } from "@/lib/classes";
import { getStudentContext } from "@/lib/user-context";
import { addDiscussionReply, getDiscussionById } from "@/lib/discussions";

export const dynamic = "force-dynamic";

async function getAccessibleClassIds(role: string, userId: string) {
  if (role === "teacher") {
    const classes = await getClassesByTeacher(userId);
    return classes.map((item) => item.id);
  }
  if (role === "student") {
    const classes = await getClassesByStudent(userId);
    return classes.map((item) => item.id);
  }
  if (role === "parent") {
    const student = await getStudentContext();
    if (!student) return [];
    const classes = await getClassesByStudent(student.id);
    return classes.map((item) => item.id);
  }
  return [];
}

export async function POST(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const topic = await getDiscussionById(context.params.id);
  if (!topic) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const accessible = await getAccessibleClassIds(user.role, user.id);
  if (!accessible.includes(topic.classId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = (await request.json()) as { content?: string; parentId?: string };
  if (!body.content) {
    return NextResponse.json({ error: "missing content" }, { status: 400 });
  }
  const reply = await addDiscussionReply({
    discussionId: topic.id,
    authorId: user.id,
    content: body.content,
    parentId: body.parentId
  });
  return NextResponse.json({ data: reply });
}
