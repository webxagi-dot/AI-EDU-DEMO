import { NextResponse } from "next/server";
import { getCurrentUser, getUsers } from "@/lib/auth";
import { getClassesByStudent, getClassesByTeacher } from "@/lib/classes";
import { getStudentContext } from "@/lib/user-context";
import { getDiscussionById, getDiscussionReplies } from "@/lib/discussions";

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

export async function GET(_: Request, context: { params: { id: string } }) {
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
  const replies = await getDiscussionReplies(topic.id);
  const users = await getUsers();
  const userMap = new Map(users.map((item) => [item.id, item]));
  return NextResponse.json({
    topic: {
      ...topic,
      authorName: topic.authorId ? userMap.get(topic.authorId)?.name ?? "老师" : "老师"
    },
    replies: replies.map((reply) => ({
      ...reply,
      authorName: reply.authorId ? userMap.get(reply.authorId)?.name ?? "成员" : "成员"
    }))
  });
}
