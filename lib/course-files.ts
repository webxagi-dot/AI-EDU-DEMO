import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";

export type CourseFile = {
  id: string;
  classId: string;
  folder?: string;
  title: string;
  resourceType: "file" | "link";
  fileName?: string;
  mimeType?: string;
  size?: number;
  contentBase64?: string;
  linkUrl?: string;
  createdAt: string;
  uploadedBy?: string;
};

const FILE = "course-files.json";

type DbCourseFile = {
  id: string;
  class_id: string;
  folder: string | null;
  title: string;
  resource_type: string;
  file_name: string | null;
  mime_type: string | null;
  size: number | null;
  content_base64: string | null;
  link_url: string | null;
  created_at: string;
  uploaded_by: string | null;
};

function mapCourseFile(row: DbCourseFile): CourseFile {
  return {
    id: row.id,
    classId: row.class_id,
    folder: row.folder ?? undefined,
    title: row.title,
    resourceType: row.resource_type === "link" ? "link" : "file",
    fileName: row.file_name ?? undefined,
    mimeType: row.mime_type ?? undefined,
    size: row.size ?? undefined,
    contentBase64: row.content_base64 ?? undefined,
    linkUrl: row.link_url ?? undefined,
    createdAt: row.created_at,
    uploadedBy: row.uploaded_by ?? undefined
  };
}

export async function getCourseFiles(): Promise<CourseFile[]> {
  if (!isDbEnabled()) {
    return readJson<CourseFile[]>(FILE, []);
  }
  const rows = await query<DbCourseFile>("SELECT * FROM course_files");
  return rows.map(mapCourseFile);
}

export async function getCourseFilesByClassIds(classIds: string[]): Promise<CourseFile[]> {
  if (!classIds.length) return [];
  if (!isDbEnabled()) {
    const list = await getCourseFiles();
    return list.filter((item) => classIds.includes(item.classId));
  }
  const rows = await query<DbCourseFile>(
    "SELECT * FROM course_files WHERE class_id = ANY($1) ORDER BY created_at DESC",
    [classIds]
  );
  return rows.map(mapCourseFile);
}

export async function createCourseFile(input: {
  classId: string;
  folder?: string;
  title: string;
  resourceType: "file" | "link";
  fileName?: string;
  mimeType?: string;
  size?: number;
  contentBase64?: string;
  linkUrl?: string;
  uploadedBy?: string;
}): Promise<CourseFile> {
  const createdAt = new Date().toISOString();
  const next: CourseFile = {
    id: `file-${crypto.randomBytes(6).toString("hex")}`,
    classId: input.classId,
    folder: input.folder,
    title: input.title,
    resourceType: input.resourceType,
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.size,
    contentBase64: input.contentBase64,
    linkUrl: input.linkUrl,
    createdAt,
    uploadedBy: input.uploadedBy
  };

  if (!isDbEnabled()) {
    const list = readJson<CourseFile[]>(FILE, []);
    list.push(next);
    writeJson(FILE, list);
    return next;
  }

  const row = await queryOne<DbCourseFile>(
    `INSERT INTO course_files
     (id, class_id, folder, title, resource_type, file_name, mime_type, size, content_base64, link_url, created_at, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      next.id,
      next.classId,
      next.folder ?? null,
      next.title,
      next.resourceType,
      next.fileName ?? null,
      next.mimeType ?? null,
      next.size ?? null,
      next.contentBase64 ?? null,
      next.linkUrl ?? null,
      createdAt,
      next.uploadedBy ?? null
    ]
  );
  return row ? mapCourseFile(row) : next;
}
