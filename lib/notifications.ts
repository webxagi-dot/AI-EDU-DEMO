import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";

export type Notification = {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  readAt?: string;
};

const NOTIFY_FILE = "notifications.json";

type DbNotification = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  read_at: string | null;
};

function mapNotification(row: DbNotification): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    type: row.type,
    createdAt: row.created_at,
    readAt: row.read_at ?? undefined
  };
}

export async function getNotificationsByUser(userId: string): Promise<Notification[]> {
  if (!isDbEnabled()) {
    const list = readJson<Notification[]>(NOTIFY_FILE, []);
    return list.filter((item) => item.userId === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  const rows = await query<DbNotification>(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return rows.map(mapNotification);
}

export async function createNotification(input: {
  userId: string;
  title: string;
  content: string;
  type: string;
}): Promise<Notification> {
  const createdAt = new Date().toISOString();
  if (!isDbEnabled()) {
    const list = readJson<Notification[]>(NOTIFY_FILE, []);
    const next: Notification = {
      id: `notice-${crypto.randomBytes(6).toString("hex")}`,
      userId: input.userId,
      title: input.title,
      content: input.content,
      type: input.type,
      createdAt
    };
    list.push(next);
    writeJson(NOTIFY_FILE, list);
    return next;
  }
  const id = `notice-${crypto.randomBytes(6).toString("hex")}`;
  const row = await queryOne<DbNotification>(
    `INSERT INTO notifications (id, user_id, title, content, type, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, input.userId, input.title, input.content, input.type, createdAt]
  );
  return row ? mapNotification(row) : { id, ...input, createdAt };
}

export async function markNotificationRead(id: string): Promise<Notification | null> {
  const readAt = new Date().toISOString();
  if (!isDbEnabled()) {
    const list = readJson<Notification[]>(NOTIFY_FILE, []);
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const next = { ...list[index], readAt };
    list[index] = next;
    writeJson(NOTIFY_FILE, list);
    return next;
  }
  const row = await queryOne<DbNotification>(
    "UPDATE notifications SET read_at = $2 WHERE id = $1 RETURNING *",
    [id, readAt]
  );
  return row ? mapNotification(row) : null;
}
