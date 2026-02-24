import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent } from "@/lib/classes";
import { getAssignmentById } from "@/lib/assignments";
import { addAssignmentUpload, deleteAssignmentUpload, getAssignmentUploads } from "@/lib/assignment-uploads";

export const dynamic = "force-dynamic";

const MAX_SIZE_MB = 3;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export async function GET(_: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const assignment = await getAssignmentById(context.params.id);
  if (!assignment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (assignment.submissionType !== "upload" && assignment.submissionType !== "essay") {
    return NextResponse.json({ error: "该作业不支持上传" }, { status: 400 });
  }

  const classes = await getClassesByStudent(user.id);
  if (!classes.find((item) => item.id === assignment.classId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const uploads = await getAssignmentUploads(assignment.id, user.id);
  return NextResponse.json({ data: uploads });
}

export async function POST(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const assignment = await getAssignmentById(context.params.id);
  if (!assignment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (assignment.submissionType !== "upload" && assignment.submissionType !== "essay") {
    return NextResponse.json({ error: "该作业不支持上传" }, { status: 400 });
  }

  const classes = await getClassesByStudent(user.id);
  if (!classes.find((item) => item.id === assignment.classId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files");
  const picked = files.length ? files : [formData.get("file")].filter(Boolean);
  const uploaded = await getAssignmentUploads(assignment.id, user.id);
  const maxUploads = assignment.maxUploads ?? 3;
  if (uploaded.length + picked.length > maxUploads) {
    return NextResponse.json({ error: `最多上传 ${maxUploads} 份文件` }, { status: 400 });
  }

  const saved = [];
  for (const entry of picked) {
    if (!(entry instanceof File)) {
      continue;
    }
    if (!ALLOWED_TYPES.includes(entry.type)) {
      return NextResponse.json({ error: `不支持的文件类型：${entry.type}` }, { status: 400 });
    }
    const sizeMb = entry.size / (1024 * 1024);
    if (sizeMb > MAX_SIZE_MB) {
      return NextResponse.json({ error: `单个文件不能超过 ${MAX_SIZE_MB}MB` }, { status: 400 });
    }
    const buffer = Buffer.from(await entry.arrayBuffer());
    const base64 = buffer.toString("base64");
    const record = await addAssignmentUpload({
      assignmentId: assignment.id,
      studentId: user.id,
      fileName: entry.name,
      mimeType: entry.type,
      size: entry.size,
      contentBase64: base64
    });
    if (record) saved.push(record);
  }

  return NextResponse.json({ data: saved });
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get("uploadId");
  if (!uploadId) {
    return NextResponse.json({ error: "missing uploadId" }, { status: 400 });
  }

  const assignment = await getAssignmentById(context.params.id);
  if (!assignment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (assignment.submissionType !== "upload" && assignment.submissionType !== "essay") {
    return NextResponse.json({ error: "该作业不支持上传" }, { status: 400 });
  }

  const classes = await getClassesByStudent(user.id);
  if (!classes.find((item) => item.id === assignment.classId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const removed = await deleteAssignmentUpload(uploadId, user.id);
  return NextResponse.json({ removed });
}
