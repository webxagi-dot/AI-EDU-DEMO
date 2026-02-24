import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";

export type AssignmentUpload = {
  id: string;
  assignmentId: string;
  studentId: string;
  fileName: string;
  mimeType: string;
  size: number;
  contentBase64: string;
  createdAt: string;
};

const FILE = "assignment-uploads.json";

type DbUpload = {
  id: string;
  assignment_id: string;
  student_id: string;
  file_name: string;
  mime_type: string;
  size: number;
  content_base64: string;
  created_at: string;
};

function mapUpload(row: DbUpload): AssignmentUpload {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    size: row.size,
    contentBase64: row.content_base64,
    createdAt: row.created_at
  };
}

export async function getAssignmentUploads(assignmentId: string, studentId?: string) {
  if (!isDbEnabled()) {
    const list = readJson<AssignmentUpload[]>(FILE, []);
    return list.filter(
      (item) => item.assignmentId === assignmentId && (!studentId || item.studentId === studentId)
    );
  }
  if (studentId) {
    const rows = await query<DbUpload>(
      "SELECT * FROM assignment_uploads WHERE assignment_id = $1 AND student_id = $2 ORDER BY created_at DESC",
      [assignmentId, studentId]
    );
    return rows.map(mapUpload);
  }
  const rows = await query<DbUpload>(
    "SELECT * FROM assignment_uploads WHERE assignment_id = $1 ORDER BY created_at DESC",
    [assignmentId]
  );
  return rows.map(mapUpload);
}

export async function addAssignmentUpload(input: Omit<AssignmentUpload, "id" | "createdAt">) {
  const createdAt = new Date().toISOString();
  if (!isDbEnabled()) {
    const list = readJson<AssignmentUpload[]>(FILE, []);
    const record: AssignmentUpload = {
      id: `upload-${crypto.randomBytes(6).toString("hex")}`,
      createdAt,
      ...input
    };
    list.unshift(record);
    writeJson(FILE, list);
    return record;
  }
  const id = `upload-${crypto.randomBytes(6).toString("hex")}`;
  const row = await queryOne<DbUpload>(
    `INSERT INTO assignment_uploads
     (id, assignment_id, student_id, file_name, mime_type, size, content_base64, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      input.assignmentId,
      input.studentId,
      input.fileName,
      input.mimeType,
      input.size,
      input.contentBase64,
      createdAt
    ]
  );
  return row ? mapUpload(row) : null;
}

export async function deleteAssignmentUpload(id: string, studentId?: string) {
  if (!isDbEnabled()) {
    const list = readJson<AssignmentUpload[]>(FILE, []);
    const next = list.filter((item) => item.id !== id || (studentId && item.studentId !== studentId));
    writeJson(FILE, next);
    return next.length !== list.length;
  }
  const rows = await query<{ id: string }>(
    studentId
      ? "DELETE FROM assignment_uploads WHERE id = $1 AND student_id = $2 RETURNING id"
      : "DELETE FROM assignment_uploads WHERE id = $1 RETURNING id",
    studentId ? [id, studentId] : [id]
  );
  return rows.length > 0;
}
