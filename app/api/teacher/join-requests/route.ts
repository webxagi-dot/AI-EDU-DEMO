import { NextResponse } from "next/server";
import { getCurrentUser, getUserById } from "@/lib/auth";
import { getClassesByTeacher, getJoinRequestsByTeacher, getClassById } from "@/lib/classes";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const requests = await getJoinRequestsByTeacher(user.id);
  const classes = await getClassesByTeacher(user.id);
  const classMap = new Map(classes.map((item) => [item.id, item]));

  const data = await Promise.all(
    requests.map(async (req) => {
      const klass = classMap.get(req.classId) ?? (await getClassById(req.classId));
      const student = await getUserById(req.studentId);
      return {
        ...req,
        className: klass?.name ?? "-",
        subject: klass?.subject ?? "-",
        grade: klass?.grade ?? "-",
        studentName: student?.name ?? "-",
        studentEmail: student?.email ?? "-"
      };
    })
  );

  return NextResponse.json({ data });
}
