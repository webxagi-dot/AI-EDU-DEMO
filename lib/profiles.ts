import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";

export type StudentProfile = {
  id: string;
  userId: string;
  grade: string;
  subjects: string[];
  target?: string;
  school?: string;
  updatedAt: string;
};

const PROFILE_FILE = "student-profiles.json";

type DbProfile = {
  id: string;
  user_id: string;
  grade: string;
  subjects: string[];
  target: string | null;
  school: string | null;
  updated_at: string;
};

function mapProfile(row: DbProfile): StudentProfile {
  return {
    id: row.id,
    userId: row.user_id,
    grade: row.grade,
    subjects: row.subjects,
    target: row.target ?? "",
    school: row.school ?? "",
    updatedAt: row.updated_at
  };
}

export async function getStudentProfiles(): Promise<StudentProfile[]> {
  if (!isDbEnabled()) {
    return readJson<StudentProfile[]>(PROFILE_FILE, []);
  }
  const rows = await query<DbProfile>("SELECT * FROM student_profiles");
  return rows.map(mapProfile);
}

export async function saveStudentProfiles(list: StudentProfile[]) {
  if (!isDbEnabled()) {
    writeJson(PROFILE_FILE, list);
  }
}

export async function getStudentProfile(userId: string) {
  if (!isDbEnabled()) {
    const list = await getStudentProfiles();
    return list.find((item) => item.userId === userId) ?? null;
  }
  const row = await queryOne<DbProfile>("SELECT * FROM student_profiles WHERE user_id = $1", [userId]);
  return row ? mapProfile(row) : null;
}

export async function upsertStudentProfile(input: Omit<StudentProfile, "id" | "updatedAt">) {
  const updatedAt = new Date().toISOString();

  if (!isDbEnabled()) {
    const list = await getStudentProfiles();
    const existingIndex = list.findIndex((item) => item.userId === input.userId);
    if (existingIndex >= 0) {
      const next = { ...list[existingIndex], ...input, updatedAt };
      list[existingIndex] = next;
      await saveStudentProfiles(list);
      return next;
    }
    const next: StudentProfile = {
      id: `sp-${crypto.randomBytes(6).toString("hex")}`,
      updatedAt,
      ...input
    };
    list.push(next);
    await saveStudentProfiles(list);
    return next;
  }

  const id = `sp-${crypto.randomBytes(6).toString("hex")}`;
  const row = await queryOne<DbProfile>(
    `INSERT INTO student_profiles (id, user_id, grade, subjects, target, school, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       grade = EXCLUDED.grade,
       subjects = EXCLUDED.subjects,
       target = EXCLUDED.target,
       school = EXCLUDED.school,
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [id, input.userId, input.grade, input.subjects, input.target ?? "", input.school ?? "", updatedAt]
  );

  return row ? mapProfile(row) : null;
}
