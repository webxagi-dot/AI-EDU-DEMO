import crypto from "crypto";
import { readJson, writeJson } from "./storage";

export type AiHistoryItem = {
  id: string;
  userId: string;
  question: string;
  answer: string;
  createdAt: string;
  favorite: boolean;
  tags: string[];
};

const HISTORY_FILE = "ai-history.json";

export function getHistory(): AiHistoryItem[] {
  return readJson<AiHistoryItem[]>(HISTORY_FILE, []);
}

export function saveHistory(list: AiHistoryItem[]) {
  writeJson(HISTORY_FILE, list);
}

export function getHistoryByUser(userId: string) {
  return getHistory()
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addHistoryItem(input: Omit<AiHistoryItem, "id" | "createdAt">) {
  const list = getHistory();
  const next: AiHistoryItem = {
    id: `ai-${crypto.randomBytes(6).toString("hex")}`,
    createdAt: new Date().toISOString(),
    ...input
  };
  list.push(next);
  saveHistory(list);
  return next;
}

export function updateHistoryItem(id: string, patch: Partial<AiHistoryItem>) {
  const list = getHistory();
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const next = { ...list[index], ...patch, id };
  list[index] = next;
  saveHistory(list);
  return next;
}

export function deleteHistoryItem(id: string) {
  const list = getHistory();
  const next = list.filter((item) => item.id !== id);
  saveHistory(next);
  return list.length !== next.length;
}
