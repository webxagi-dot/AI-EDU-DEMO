import { NextResponse } from "next/server";
import { getCurrentUser, getParentsByStudentId } from "@/lib/auth";
import { getClassById, getClassStudentIds, getClassesByStudent, getClassesByTeacher } from "@/lib/classes";
import { getStudentContext } from "@/lib/user-context";
import { createThread, getThreadsForUser } from "@/lib/inbox";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await getThreadsForUser(user.id);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json()) as {
    subject?: string;
    content?: string;
    recipientIds?: string[];
    classId?: string;
    includeParents?: boolean;
  };
  if (!body.subject || !body.content) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  let recipientIds = (body.recipientIds ?? []).filter(Boolean);

  if (body.classId) {
    const klass = await getClassById(body.classId);
    if (!klass) return NextResponse.json({ error: "class not found" }, { status: 404 });

    if (user.role === "teacher") {
      if (klass.teacherId !== user.id) {
        return NextResponse.json({ error: "class not found" }, { status: 404 });
      }
      const studentIds = await getClassStudentIds(klass.id);
      recipientIds = studentIds;
      if (body.includeParents) {
        const parentIds: string[] = [];
        for (const studentId of studentIds) {
          const parents = await getParentsByStudentId(studentId);
          parents.forEach((parent) => parentIds.push(parent.id));
        }
        recipientIds = Array.from(new Set([...recipientIds, ...parentIds]));
      }
    } else {
      const student = user.role === "parent" ? await getStudentContext() : null;
      const classes =
        user.role === "student"
          ? await getClassesByStudent(user.id)
          : student
            ? await getClassesByStudent(student.id)
            : [];
      if (!classes.find((item) => item.id === klass.id)) {
        return NextResponse.json({ error: "class not found" }, { status: 404 });
      }
      if (!klass.teacherId) {
        return NextResponse.json({ error: "class has no teacher" }, { status: 400 });
      }
      recipientIds = [klass.teacherId];
    }
  }

  if (!recipientIds.length) {
    return NextResponse.json({ error: "missing recipients" }, { status: 400 });
  }

  const uniqueRecipients = Array.from(new Set(recipientIds.filter((id) => id !== user.id)));
  if (!uniqueRecipients.length) {
    return NextResponse.json({ error: "invalid recipients" }, { status: 400 });
  }

  const result = await createThread({
    subject: body.subject,
    senderId: user.id,
    recipientIds: uniqueRecipients,
    content: body.content
  });

  return NextResponse.json({ data: result });
}
