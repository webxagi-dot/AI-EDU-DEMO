import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  addStudentToClass,
  createJoinRequest,
  getClassByJoinCode,
  getClassStudentIds,
  getJoinRequestsByStudent
} from "@/lib/classes";
import { createAssignmentProgress, getAssignmentsByClass } from "@/lib/assignments";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  const klass = await getClassByJoinCode(code);
  if (!klass) {
    return NextResponse.json({ error: "邀请码无效" }, { status: 404 });
  }

  const memberIds = await getClassStudentIds(klass.id);
  if (memberIds.includes(user.id)) {
    return NextResponse.json({ status: "joined", message: "你已在班级中" });
  }

  if (klass.joinMode === "auto") {
    await addStudentToClass(klass.id, user.id);
    const assignments = await getAssignmentsByClass(klass.id);
    for (const assignment of assignments) {
      await createAssignmentProgress(assignment.id, user.id);
    }
    await createNotification({
      userId: user.id,
      title: "加入班级成功",
      content: `你已加入班级「${klass.name}」`,
      type: "class"
    });
    return NextResponse.json({ status: "joined", message: "已加入班级" });
  }

  const existing = await getJoinRequestsByStudent(user.id);
  const pending = existing.find((item) => item.classId === klass.id && item.status === "pending");
  if (pending) {
    return NextResponse.json({ status: "pending", message: "已提交加入申请" });
  }

  const requestRecord = await createJoinRequest(klass.id, user.id);
  await createNotification({
    userId: user.id,
    title: "已提交加入申请",
    content: `已向班级「${klass.name}」提交加入申请，请等待老师审核。`,
    type: "class"
  });
  if (klass.teacherId) {
    await createNotification({
      userId: klass.teacherId,
      title: "新的加入申请",
      content: `${user.name} 申请加入班级「${klass.name}」。`,
      type: "class"
    });
  }

  return NextResponse.json({ status: requestRecord.status, message: "已提交加入申请" });
}
