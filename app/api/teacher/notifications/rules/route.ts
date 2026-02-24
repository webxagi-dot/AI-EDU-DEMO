import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassesByTeacher } from "@/lib/classes";
import { getRulesByClassIds, upsertRule } from "@/lib/notification-rules";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const classes = await getClassesByTeacher(user.id);
  const rules = await getRulesByClassIds(classes.map((item) => item.id));
  return NextResponse.json({ classes, rules });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    classId?: string;
    enabled?: boolean;
    dueDays?: number;
    overdueDays?: number;
    includeParents?: boolean;
  };
  if (!body.classId) {
    return NextResponse.json({ error: "missing classId" }, { status: 400 });
  }
  const classes = await getClassesByTeacher(user.id);
  if (!classes.find((item) => item.id === body.classId)) {
    return NextResponse.json({ error: "class not found" }, { status: 404 });
  }
  const rule = await upsertRule({
    classId: body.classId,
    enabled: body.enabled ?? true,
    dueDays: Number(body.dueDays ?? 2),
    overdueDays: Number(body.overdueDays ?? 0),
    includeParents: body.includeParents ?? true
  });
  return NextResponse.json({ data: rule });
}
