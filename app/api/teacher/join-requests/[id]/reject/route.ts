import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { decideJoinRequest, getClassById, getJoinRequestsByTeacher } from "@/lib/classes";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(_: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const requestId = context.params.id;
  const requests = await getJoinRequestsByTeacher(user.id);
  const record = requests.find((item) => item.id === requestId);
  if (!record) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const klass = await getClassById(record.classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await decideJoinRequest(record.id, "rejected");
  await createNotification({
    userId: record.studentId,
    title: "加入班级被拒绝",
    content: `班级「${klass.name}」拒绝了你的加入申请，如有疑问请联系老师。`,
    type: "class"
  });

  return NextResponse.json({ ok: true });
}
