import { Pool } from "pg";

type QueryParams = Array<string | number | boolean | null>;

let pool: Pool | null = null;

export function isDbEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!pool) {
    const sslEnabled = process.env.DB_SSL === "true";
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
}

export async function query<T>(text: string, params: QueryParams = []) {
  const db = getPool();
  const result = await db.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T>(text: string, params: QueryParams = []) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
