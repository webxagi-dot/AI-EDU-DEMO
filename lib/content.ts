import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import type { KnowledgePoint, Question } from "./types";

const KP_FILE = "knowledge-points.json";
const Q_FILE = "questions.json";

export function getKnowledgePoints(): KnowledgePoint[] {
  return readJson<KnowledgePoint[]>(KP_FILE, []);
}

export function saveKnowledgePoints(list: KnowledgePoint[]) {
  writeJson(KP_FILE, list);
}

export function getQuestions(): Question[] {
  return readJson<Question[]>(Q_FILE, []);
}

export function saveQuestions(list: Question[]) {
  writeJson(Q_FILE, list);
}

export function createKnowledgePoint(input: Omit<KnowledgePoint, "id">) {
  const list = getKnowledgePoints();
  const next: KnowledgePoint = { id: `kp-${crypto.randomBytes(6).toString("hex")}`, ...input };
  list.push(next);
  saveKnowledgePoints(list);
  return next;
}

export function updateKnowledgePoint(id: string, input: Partial<KnowledgePoint>) {
  const list = getKnowledgePoints();
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const next = { ...list[index], ...input, id };
  list[index] = next;
  saveKnowledgePoints(list);
  return next;
}

export function deleteKnowledgePoint(id: string) {
  const list = getKnowledgePoints();
  const next = list.filter((item) => item.id !== id);
  saveKnowledgePoints(next);
  return list.length !== next.length;
}

export function createQuestion(input: Omit<Question, "id">) {
  const list = getQuestions();
  const next: Question = { id: `q-${crypto.randomBytes(6).toString("hex")}`, ...input };
  list.push(next);
  saveQuestions(list);
  return next;
}

export function updateQuestion(id: string, input: Partial<Question>) {
  const list = getQuestions();
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const next = { ...list[index], ...input, id };
  list[index] = next;
  saveQuestions(list);
  return next;
}

export function deleteQuestion(id: string) {
  const list = getQuestions();
  const next = list.filter((item) => item.id !== id);
  saveQuestions(next);
  return list.length !== next.length;
}
