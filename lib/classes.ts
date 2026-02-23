import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";
import { getUsers } from "./auth";
import type { Subject } from "./types";

export type ClassItem = {
  id: string;
  name: string;
  subject: Subject;
  grade: string;
  teacherId: string | null;
  createdAt: string;
  joinCode?: string;
  joinMode?: "approval" | "auto";
};

export type ClassStudent = {
  id: string;
  classId: string;
  studentId: string;
  joinedAt: string;
};

export type ClassStudentInfo = {
  id: string;
  name: string;
  email: string;
  grade?: string;
};

export type ClassJoinRequest = {
  id: string;
  classId: string;
  studentId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt?: string;
};

const CLASS_FILE = "classes.json";
const CLASS_STUDENT_FILE = "class-students.json";
const JOIN_REQUEST_FILE = "class-join-requests.json";

type DbClass = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacher_id: string | null;
  created_at: string;
  join_code: string | null;
  join_mode: string | null;
};

type DbClassStudent = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

type DbStudentInfo = {
  id: string;
  name: string;
  email: string;
  grade: string | null;
};

type DbJoinRequest = {
  id: string;
  class_id: string;
  student_id: string;
  status: string;
  created_at: string;
  decided_at: string | null;
};

function mapClass(row: DbClass): ClassItem {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject as Subject,
    grade: row.grade,
    teacherId: row.teacher_id,
    createdAt: row.created_at,
    joinCode: row.join_code ?? undefined,
    joinMode: (row.join_mode as ClassItem["joinMode"]) ?? "approval"
  };
}

function mapClassStudent(row: DbClassStudent): ClassStudent {
  return {
    id: row.id,
    classId: row.class_id,
    studentId: row.student_id,
    joinedAt: row.joined_at
  };
}

export async function getClasses(): Promise<ClassItem[]> {
  if (!isDbEnabled()) {
    return readJson<ClassItem[]>(CLASS_FILE, []);
  }
  const rows = await query<DbClass>("SELECT * FROM classes");
  return rows.map(mapClass);
}

export async function getClassById(id: string): Promise<ClassItem | null> {
  if (!isDbEnabled()) {
    const list = await getClasses();
    return list.find((item) => item.id === id) ?? null;
  }
  const row = await queryOne<DbClass>("SELECT * FROM classes WHERE id = $1", [id]);
  return row ? mapClass(row) : null;
}

export async function getClassesByTeacher(teacherId: string): Promise<ClassItem[]> {
  if (!isDbEnabled()) {
    const list = await getClasses();
    return list.filter((item) => item.teacherId === teacherId);
  }
  const rows = await query<DbClass>("SELECT * FROM classes WHERE teacher_id = $1", [teacherId]);
  return rows.map(mapClass);
}

export async function getClassesByStudent(studentId: string): Promise<ClassItem[]> {
  if (!isDbEnabled()) {
    const classStudents = readJson<ClassStudent[]>(CLASS_STUDENT_FILE, []);
    const classIds = new Set(
      classStudents.filter((item) => item.studentId === studentId).map((item) => item.classId)
    );
    return (await getClasses()).filter((item) => classIds.has(item.id));
  }
  const rows = await query<DbClass>(
    `SELECT c.* FROM classes c
     JOIN class_students cs ON c.id = cs.class_id
     WHERE cs.student_id = $1`,
    [studentId]
  );
  return rows.map(mapClass);
}

export async function createClass(input: {
  name: string;
  subject: Subject;
  grade: string;
  teacherId: string | null;
}): Promise<ClassItem> {
  const createdAt = new Date().toISOString();
  const joinCode = generateJoinCode();
  const joinMode: ClassItem["joinMode"] = "approval";
  if (!isDbEnabled()) {
    const list = await getClasses();
    const next: ClassItem = {
      id: `class-${crypto.randomBytes(6).toString("hex")}`,
      name: input.name,
      subject: input.subject,
      grade: input.grade,
      teacherId: input.teacherId,
      createdAt,
      joinCode,
      joinMode
    };
    list.push(next);
    writeJson(CLASS_FILE, list);
    return next;
  }
  const id = `class-${crypto.randomBytes(6).toString("hex")}`;
  const row = await queryOne<DbClass>(
    `INSERT INTO classes (id, name, subject, grade, teacher_id, created_at, join_code, join_mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [id, input.name, input.subject, input.grade, input.teacherId, createdAt, joinCode, joinMode]
  );
  return row ? mapClass(row) : { id, ...input, createdAt, joinCode, joinMode };
}

export async function updateClassSettings(
  id: string,
  input: { joinCode?: string; joinMode?: ClassItem["joinMode"] }
): Promise<ClassItem | null> {
  if (!isDbEnabled()) {
    const list = await getClasses();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const next: ClassItem = {
      ...list[index],
      joinCode: input.joinCode ?? list[index].joinCode,
      joinMode: input.joinMode ?? list[index].joinMode
    };
    list[index] = next;
    writeJson(CLASS_FILE, list);
    return next;
  }
  const row = await queryOne<DbClass>(
    `UPDATE classes
     SET join_code = COALESCE($2, join_code),
         join_mode = COALESCE($3, join_mode)
     WHERE id = $1
     RETURNING *`,
    [id, input.joinCode ?? null, input.joinMode ?? null]
  );
  return row ? mapClass(row) : null;
}

export async function getClassByJoinCode(code: string): Promise<ClassItem | null> {
  if (!isDbEnabled()) {
    const list = await getClasses();
    return list.find((item) => item.joinCode === code) ?? null;
  }
  const row = await queryOne<DbClass>("SELECT * FROM classes WHERE join_code = $1", [code]);
  return row ? mapClass(row) : null;
}

export async function getClassStudents(classId: string): Promise<ClassStudentInfo[]> {
  if (!isDbEnabled()) {
    const classStudents = readJson<ClassStudent[]>(CLASS_STUDENT_FILE, []);
    const studentIds = classStudents.filter((item) => item.classId === classId).map((item) => item.studentId);
    const users = await getUsers();
    return users
      .filter((user) => studentIds.includes(user.id))
      .map((user) => ({ id: user.id, name: user.name, email: user.email, grade: user.grade }));
  }
  const rows = await query<DbStudentInfo>(
    `SELECT u.id, u.name, u.email, u.grade
     FROM class_students cs
     JOIN users u ON cs.student_id = u.id
     WHERE cs.class_id = $1
     ORDER BY u.name`,
    [classId]
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    grade: row.grade ?? undefined
  }));
}

export async function getClassStudentIds(classId: string): Promise<string[]> {
  if (!isDbEnabled()) {
    const classStudents = readJson<ClassStudent[]>(CLASS_STUDENT_FILE, []);
    return classStudents.filter((item) => item.classId === classId).map((item) => item.studentId);
  }
  const rows = await query<{ student_id: string }>("SELECT student_id FROM class_students WHERE class_id = $1", [
    classId
  ]);
  return rows.map((row) => row.student_id);
}

export async function addStudentToClass(classId: string, studentId: string): Promise<boolean> {
  if (!isDbEnabled()) {
    const classStudents = readJson<ClassStudent[]>(CLASS_STUDENT_FILE, []);
    const exists = classStudents.some((item) => item.classId === classId && item.studentId === studentId);
    if (exists) return false;
    classStudents.push({
      id: `class-student-${crypto.randomBytes(6).toString("hex")}`,
      classId,
      studentId,
      joinedAt: new Date().toISOString()
    });
    writeJson(CLASS_STUDENT_FILE, classStudents);
    return true;
  }
  const row = await queryOne<DbClassStudent>(
    `INSERT INTO class_students (id, class_id, student_id, joined_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (class_id, student_id) DO NOTHING
     RETURNING *`,
    [
      `class-student-${crypto.randomBytes(6).toString("hex")}`,
      classId,
      studentId,
      new Date().toISOString()
    ]
  );
  return Boolean(row);
}

export async function getJoinRequests(): Promise<ClassJoinRequest[]> {
  if (!isDbEnabled()) {
    return readJson<ClassJoinRequest[]>(JOIN_REQUEST_FILE, []);
  }
  const rows = await query<DbJoinRequest>("SELECT * FROM class_join_requests");
  return rows.map((row) => ({
    id: row.id,
    classId: row.class_id,
    studentId: row.student_id,
    status: row.status as ClassJoinRequest["status"],
    createdAt: row.created_at,
    decidedAt: row.decided_at ?? undefined
  }));
}

export async function getJoinRequestsByTeacher(teacherId: string): Promise<ClassJoinRequest[]> {
  if (!isDbEnabled()) {
    const classes = await getClassesByTeacher(teacherId);
    const classIds = new Set(classes.map((item) => item.id));
    return (await getJoinRequests()).filter((item) => classIds.has(item.classId));
  }
  const rows = await query<DbJoinRequest>(
    `SELECT r.* FROM class_join_requests r
     JOIN classes c ON r.class_id = c.id
     WHERE c.teacher_id = $1
     ORDER BY r.created_at DESC`,
    [teacherId]
  );
  return rows.map((row) => ({
    id: row.id,
    classId: row.class_id,
    studentId: row.student_id,
    status: row.status as ClassJoinRequest["status"],
    createdAt: row.created_at,
    decidedAt: row.decided_at ?? undefined
  }));
}

export async function getJoinRequestsByStudent(studentId: string): Promise<ClassJoinRequest[]> {
  if (!isDbEnabled()) {
    return (await getJoinRequests()).filter((item) => item.studentId === studentId);
  }
  const rows = await query<DbJoinRequest>(
    "SELECT * FROM class_join_requests WHERE student_id = $1 ORDER BY created_at DESC",
    [studentId]
  );
  return rows.map((row) => ({
    id: row.id,
    classId: row.class_id,
    studentId: row.student_id,
    status: row.status as ClassJoinRequest["status"],
    createdAt: row.created_at,
    decidedAt: row.decided_at ?? undefined
  }));
}

export async function createJoinRequest(classId: string, studentId: string): Promise<ClassJoinRequest> {
  const createdAt = new Date().toISOString();
  if (!isDbEnabled()) {
    const list = await getJoinRequests();
    const existing = list.find(
      (item) => item.classId === classId && item.studentId === studentId && item.status === "pending"
    );
    if (existing) return existing;
    const next: ClassJoinRequest = {
      id: `join-${crypto.randomBytes(6).toString("hex")}`,
      classId,
      studentId,
      status: "pending",
      createdAt
    };
    list.push(next);
    writeJson(JOIN_REQUEST_FILE, list);
    return next;
  }
  const row = await queryOne<DbJoinRequest>(
    `INSERT INTO class_join_requests (id, class_id, student_id, status, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (class_id, student_id) DO UPDATE SET
       status = CASE WHEN class_join_requests.status = 'rejected' THEN 'pending' ELSE class_join_requests.status END,
       created_at = EXCLUDED.created_at
     RETURNING *`,
    [`join-${crypto.randomBytes(6).toString("hex")}`, classId, studentId, "pending", createdAt]
  );
  return row
    ? {
        id: row.id,
        classId: row.class_id,
        studentId: row.student_id,
        status: row.status as ClassJoinRequest["status"],
        createdAt: row.created_at,
        decidedAt: row.decided_at ?? undefined
      }
    : { id: "", classId, studentId, status: "pending", createdAt };
}

export async function decideJoinRequest(id: string, status: "approved" | "rejected") {
  const decidedAt = new Date().toISOString();
  if (!isDbEnabled()) {
    const list = await getJoinRequests();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const next = { ...list[index], status, decidedAt };
    list[index] = next;
    writeJson(JOIN_REQUEST_FILE, list);
    return next;
  }
  const row = await queryOne<DbJoinRequest>(
    `UPDATE class_join_requests
     SET status = $2, decided_at = $3
     WHERE id = $1
     RETURNING *`,
    [id, status, decidedAt]
  );
  return row
    ? {
        id: row.id,
        classId: row.class_id,
        studentId: row.student_id,
        status: row.status as ClassJoinRequest["status"],
        createdAt: row.created_at,
        decidedAt: row.decided_at ?? undefined
      }
    : null;
}

function generateJoinCode() {
  return crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}
