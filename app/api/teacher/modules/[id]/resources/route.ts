import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassById } from "@/lib/classes";
import { addModuleResource, deleteModuleResource, getModuleById, getModuleResources } from "@/lib/modules";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { id: string } }) {
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
  const resources = await getModuleResources(moduleId);
  return NextResponse.json({ data: resources });
}

export async function POST(request: Request, context: { params: { id: string } }) {
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
    resourceType?: "file" | "link";
    fileName?: string;
    mimeType?: string;
    size?: number;
    contentBase64?: string;
    linkUrl?: string;
  };

  if (!body.title || !body.resourceType) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (body.resourceType === "file" && !body.contentBase64) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (body.resourceType === "link" && !body.linkUrl) {
    return NextResponse.json({ error: "missing link" }, { status: 400 });
  }

  const created = await addModuleResource({
    moduleId,
    title: body.title,
    resourceType: body.resourceType,
    fileName: body.fileName,
    mimeType: body.mimeType,
    size: body.size,
    contentBase64: body.contentBase64,
    linkUrl: body.linkUrl
  });
  return NextResponse.json({ data: created });
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
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
  const body = (await request.json()) as { resourceId?: string };
  if (!body.resourceId) {
    return NextResponse.json({ error: "missing resource" }, { status: 400 });
  }
  await deleteModuleResource(body.resourceId);
  return NextResponse.json({ ok: true });
}
