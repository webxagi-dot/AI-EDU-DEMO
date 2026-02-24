import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassesByStudent, getClassesByTeacher } from "@/lib/classes";
import { getStudentContext } from "@/lib/user-context";
import { createCourseFile, getCourseFilesByClassIds } from "@/lib/course-files";

export const dynamic = "force-dynamic";

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

async function getAccessibleClassIds(role: string, userId: string) {
  if (role === "teacher") {
    const classes = await getClassesByTeacher(userId);
    return classes.map((item) => item.id);
  }
  if (role === "student") {
    const classes = await getClassesByStudent(userId);
    return classes.map((item) => item.id);
  }
  if (role === "parent") {
    const student = await getStudentContext();
    if (!student) return [];
    const classes = await getClassesByStudent(student.id);
    return classes.map((item) => item.id);
  }
  return [];
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const accessible = await getAccessibleClassIds(user.role, user.id);
  if (!accessible.length) {
    return NextResponse.json({ data: [] });
  }
  const classIds = classId && accessible.includes(classId) ? [classId] : accessible;
  const data = await getCourseFilesByClassIds(classIds);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const accessible = await getAccessibleClassIds(user.role, user.id);

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const classId = String(formData.get("classId") ?? "");
    const folder = String(formData.get("folder") ?? "");
    const title = String(formData.get("title") ?? "");
    if (!classId) return NextResponse.json({ error: "missing classId" }, { status: 400 });
    if (!accessible.includes(classId)) {
      return NextResponse.json({ error: "class not found" }, { status: 404 });
    }
    const files = formData.getAll("files");
    const picked = files.length ? files : [formData.get("file")].filter(Boolean);
    if (!picked.length) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }
    const saved = [];
    for (const entry of picked) {
      if (!(entry instanceof File)) continue;
      if (!ALLOWED_TYPES.includes(entry.type)) {
        return NextResponse.json({ error: `不支持的文件类型：${entry.type}` }, { status: 400 });
      }
      const sizeMb = entry.size / (1024 * 1024);
      if (sizeMb > MAX_SIZE_MB) {
        return NextResponse.json({ error: `单个文件不能超过 ${MAX_SIZE_MB}MB` }, { status: 400 });
      }
      const buffer = Buffer.from(await entry.arrayBuffer());
      const base64 = buffer.toString("base64");
      const record = await createCourseFile({
        classId,
        folder: folder || undefined,
        title: title || entry.name,
        resourceType: "file",
        fileName: entry.name,
        mimeType: entry.type,
        size: entry.size,
        contentBase64: base64,
        uploadedBy: user.id
      });
      saved.push(record);
    }
    return NextResponse.json({ data: saved });
  }

  const body = (await request.json()) as {
    classId?: string;
    folder?: string;
    title?: string;
    resourceType?: "link" | "file";
    linkUrl?: string;
  };
  if (!body.classId || !body.title) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (!accessible.includes(body.classId)) {
    return NextResponse.json({ error: "class not found" }, { status: 404 });
  }
  if (body.resourceType === "link" && !body.linkUrl) {
    return NextResponse.json({ error: "missing link" }, { status: 400 });
  }

  const record = await createCourseFile({
    classId: body.classId,
    folder: body.folder,
    title: body.title,
    resourceType: body.resourceType === "link" ? "link" : "file",
    linkUrl: body.linkUrl,
    uploadedBy: user.id
  });
  return NextResponse.json({ data: record });
}
