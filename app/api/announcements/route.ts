import { NextResponse } from "next/server";
import { getCurrentUser, getParentsByStudentId } from "@/lib/auth";
import { getClassesByStudent, getClassesByTeacher, getClassById, getClassStudentIds } from "@/lib/classes";
import { createAnnouncement, getAnnouncementsByClassIds } from "@/lib/announcements";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let classes: Array<{ id: string; name: string; subject: string; grade: string }> = [];
  if (user.role === "teacher") {
    classes = await getClassesByTeacher(user.id);
  } else if (user.role === "student") {
    classes = await getClassesByStudent(user.id);
  } else if (user.role === "parent") {
    if (!user.studentId) {
      return NextResponse.json({ error: "missing student" }, { status: 400 });
    }
    classes = await getClassesByStudent(user.studentId);
  } else {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const classMap = new Map(classes.map((item) => [item.id, item]));
  const announcements = await getAnnouncementsByClassIds(classes.map((item) => item.id));
  const data = announcements.map((item) => ({
    ...item,
    className: classMap.get(item.classId)?.name ?? "-",
    classSubject: classMap.get(item.classId)?.subject ?? "-",
    classGrade: classMap.get(item.classId)?.grade ?? "-"
  }));

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { classId?: string; title?: string; content?: string };
  if (!body.classId || !body.title || !body.content) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const klass = await getClassById(body.classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "class not found" }, { status: 404 });
  }

  const created = await createAnnouncement({
    classId: klass.id,
    authorId: user.id,
    title: body.title,
    content: body.content
  });

  const studentIds = await getClassStudentIds(klass.id);
  for (const studentId of studentIds) {
    await createNotification({
      userId: studentId,
      title: "班级公告",
      content: `班级「${klass.name}」发布公告：${created.title}`,
      type: "announcement"
    });
    const parents = await getParentsByStudentId(studentId);
    for (const parent of parents) {
      await createNotification({
        userId: parent.id,
        title: "孩子班级公告",
        content: `孩子所在班级「${klass.name}」发布公告：${created.title}`,
        type: "announcement"
      });
    }
  }

  return NextResponse.json({ data: created });
}
