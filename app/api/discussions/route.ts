import { NextResponse } from "next/server";
import { getCurrentUser, getUsers } from "@/lib/auth";
import { getClassesByStudent, getClassesByTeacher } from "@/lib/classes";
import { getStudentContext } from "@/lib/user-context";
import { createDiscussionTopic, getDiscussionTopicsByClassIds } from "@/lib/discussions";

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

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const accessible = await getAccessibleClassIds(user.role, user.id);
  if (!accessible.length) {
    return NextResponse.json({ data: [] });
  }
  const classIds = classId && accessible.includes(classId) ? [classId] : accessible;
  const topics = await getDiscussionTopicsByClassIds(classIds);
  const users = await getUsers();
  const userMap = new Map(users.map((item) => [item.id, item]));
  const data = topics.map((topic) => ({
    ...topic,
    authorName: topic.authorId ? userMap.get(topic.authorId)?.name ?? "老师" : "老师"
  }));
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    classId?: string;
    title?: string;
    content?: string;
    pinned?: boolean;
  };
  if (!body.classId || !body.title || !body.content) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const accessible = await getAccessibleClassIds(user.role, user.id);
  if (!accessible.includes(body.classId)) {
    return NextResponse.json({ error: "class not found" }, { status: 404 });
  }
  const topic = await createDiscussionTopic({
    classId: body.classId,
    authorId: user.id,
    title: body.title,
    content: body.content,
    pinned: body.pinned
  });
  return NextResponse.json({ data: topic });
}
