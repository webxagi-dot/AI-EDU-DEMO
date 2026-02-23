import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query } from "./db";

export type AdminLog = {
  id: string;
  adminId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  detail?: string | null;
  createdAt: string;
};

const LOG_FILE = "admin-logs.json";

type DbLog = {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
};

function mapLog(row: DbLog): AdminLog {
  return {
    id: row.id,
    adminId: row.admin_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    detail: row.detail,
    createdAt: row.created_at
  };
}

export async function addAdminLog(log: Omit<AdminLog, "id" | "createdAt">) {
  const entry: AdminLog = {
    id: `log-${crypto.randomBytes(6).toString("hex")}`,
    createdAt: new Date().toISOString(),
    ...log
  };

  if (!isDbEnabled()) {
    const list = readJson<AdminLog[]>(LOG_FILE, []);
    list.unshift(entry);
    writeJson(LOG_FILE, list.slice(0, 200));
    return entry;
  }

  await query(
    `INSERT INTO admin_logs (id, admin_id, action, entity_type, entity_id, detail, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.id,
      entry.adminId,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.detail ?? null,
      entry.createdAt
    ]
  );
  return entry;
}

export async function getAdminLogs(limit = 100) {
  if (!isDbEnabled()) {
    const list = readJson<AdminLog[]>(LOG_FILE, []);
    return list.slice(0, limit);
  }
  const rows = await query<DbLog>(
    "SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return rows.map(mapLog);
}
