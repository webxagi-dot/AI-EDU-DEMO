import crypto from "crypto";
import { readJson, writeJson } from "./storage";

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

export function getStudentProfiles(): StudentProfile[] {
  return readJson<StudentProfile[]>(PROFILE_FILE, []);
}

export function saveStudentProfiles(list: StudentProfile[]) {
  writeJson(PROFILE_FILE, list);
}

export function getStudentProfile(userId: string) {
  const list = getStudentProfiles();
  return list.find((item) => item.userId === userId) ?? null;
}

export function upsertStudentProfile(input: Omit<StudentProfile, "id" | "updatedAt">) {
  const list = getStudentProfiles();
  const existingIndex = list.findIndex((item) => item.userId === input.userId);
  const updatedAt = new Date().toISOString();

  if (existingIndex >= 0) {
    const next = { ...list[existingIndex], ...input, updatedAt };
    list[existingIndex] = next;
    saveStudentProfiles(list);
    return next;
  }

  const next: StudentProfile = {
    id: `sp-${crypto.randomBytes(6).toString("hex")}`,
    updatedAt,
    ...input
  };
  list.push(next);
  saveStudentProfiles(list);
  return next;
}
