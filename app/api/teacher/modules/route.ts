import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassById, getClassesByTeacher } from "@/lib/classes";
import { createModule, getModulesByClass } from "@/lib/modules";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId") ?? "";
  if (!classId) {
    const classes = await getClassesByTeacher(user.id);
    return NextResponse.json({ data: [], classes });
  }
  const klass = await getClassById(classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "class not found" }, { status: 404 });
  }
  const modules = await getModulesByClass(classId);
  return NextResponse.json({ data: modules });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    classId?: string;
    title?: string;
    description?: string;
    parentId?: string;
    orderIndex?: number;
  };
  if (!body.classId || !body.title) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const klass = await getClassById(body.classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "class not found" }, { status: 404 });
  }
  const created = await createModule({
    classId: body.classId,
    title: body.title,
    description: body.description,
    parentId: body.parentId,
    orderIndex: body.orderIndex
  });
  return NextResponse.json({ data: created });
}
