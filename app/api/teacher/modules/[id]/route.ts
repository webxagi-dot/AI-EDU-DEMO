import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassById } from "@/lib/classes";
import { getModuleById, updateModule } from "@/lib/modules";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const moduleId = context.params.id;
  const moduleRecord = await getModuleById(moduleId);
  if (!moduleRecord) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const klass = await getClassById(moduleRecord.classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    parentId?: string | null;
    orderIndex?: number;
  };

  const updated = await updateModule({
    id: moduleId,
    title: body.title,
    description: body.description,
    parentId: body.parentId,
    orderIndex: body.orderIndex
  });
  return NextResponse.json({ data: updated });
}
