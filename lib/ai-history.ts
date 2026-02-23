import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";

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

type DbHistory = {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
  favorite: boolean;
  tags: string[];
};

function mapHistory(row: DbHistory): AiHistoryItem {
  return {
    id: row.id,
    userId: row.user_id,
    question: row.question,
    answer: row.answer,
    createdAt: row.created_at,
    favorite: row.favorite,
    tags: row.tags ?? []
  };
}

export async function getHistory(): Promise<AiHistoryItem[]> {
  if (!isDbEnabled()) {
    return readJson<AiHistoryItem[]>(HISTORY_FILE, []);
  }
  const rows = await query<DbHistory>("SELECT * FROM ai_history");
  return rows.map(mapHistory);
}

export async function saveHistory(list: AiHistoryItem[]) {
  if (!isDbEnabled()) {
    writeJson(HISTORY_FILE, list);
  }
}

export async function getHistoryByUser(userId: string) {
  if (!isDbEnabled()) {
    const list = await getHistory();
    return list
      .filter((item) => item.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const rows = await query<DbHistory>(
    "SELECT * FROM ai_history WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return rows.map(mapHistory);
}

export async function addHistoryItem(input: Omit<AiHistoryItem, "id" | "createdAt">) {
  if (!isDbEnabled()) {
    const list = await getHistory();
    const next: AiHistoryItem = {
      id: `ai-${crypto.randomBytes(6).toString("hex")}`,
      createdAt: new Date().toISOString(),
      ...input
    };
    list.push(next);
    await saveHistory(list);
    return next;
  }

  const id = `ai-${crypto.randomBytes(6).toString("hex")}`;
  const createdAt = new Date().toISOString();
  const row = await queryOne<DbHistory>(
    `INSERT INTO ai_history (id, user_id, question, answer, favorite, tags, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, input.userId, input.question, input.answer, input.favorite, input.tags, createdAt]
  );
  return row ? mapHistory(row) : null;
}

export async function updateHistoryItem(id: string, patch: Partial<AiHistoryItem>) {
  if (!isDbEnabled()) {
    const list = await getHistory();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const next = { ...list[index], ...patch, id } as AiHistoryItem;
    list[index] = next;
    await saveHistory(list);
    return next;
  }

  const row = await queryOne<DbHistory>(
    `UPDATE ai_history
     SET favorite = COALESCE($2, favorite),
         tags = COALESCE($3, tags)
     WHERE id = $1
     RETURNING *`,
    [id, patch.favorite ?? null, patch.tags ?? null]
  );
  return row ? mapHistory(row) : null;
}

export async function deleteHistoryItem(id: string) {
  if (!isDbEnabled()) {
    const list = await getHistory();
    const next = list.filter((item) => item.id !== id);
    await saveHistory(next);
    return list.length !== next.length;
  }
  const rows = await query<{ id: string }>("DELETE FROM ai_history WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}
