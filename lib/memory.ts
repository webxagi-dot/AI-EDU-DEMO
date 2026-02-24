import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";
import { getQuestions } from "./content";
import type { Question } from "./types";

export type MemoryReview = {
  id: string;
  userId: string;
  questionId: string;
  stage: number;
  nextReviewAt: string;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

const REVIEW_FILE = "memory-reviews.json";
const STAGES = [1, 3, 7, 14, 30];

type DbMemoryReview = {
  id: string;
  user_id: string;
  question_id: string;
  stage: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapReview(row: DbMemoryReview): MemoryReview {
  return {
    id: row.id,
    userId: row.user_id,
    questionId: row.question_id,
    stage: row.stage,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function nextStage(current: number, correct: boolean) {
  if (!correct) return 0;
  return Math.min(current + 1, STAGES.length - 1);
}

function calcNextReviewAt(stage: number) {
  const days = STAGES[Math.max(0, Math.min(stage, STAGES.length - 1))];
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function updateMemorySchedule(params: {
  userId: string;
  questionId: string;
  correct: boolean;
}) {
  const now = new Date().toISOString();
  if (!isDbEnabled()) {
    const list = readJson<MemoryReview[]>(REVIEW_FILE, []);
    const index = list.findIndex(
      (item) => item.userId === params.userId && item.questionId === params.questionId
    );
    const current = index >= 0 ? list[index] : null;
    const stage = nextStage(current?.stage ?? 0, params.correct);
    const nextReviewAt = calcNextReviewAt(stage);
    const record: MemoryReview = {
      id: current?.id ?? `mem-${crypto.randomBytes(6).toString("hex")}`,
      userId: params.userId,
      questionId: params.questionId,
      stage,
      nextReviewAt,
      lastReviewedAt: now,
      createdAt: current?.createdAt ?? now,
      updatedAt: now
    };
    if (index >= 0) {
      list[index] = record;
    } else {
      list.push(record);
    }
    writeJson(REVIEW_FILE, list);
    return record;
  }

  const existing = await queryOne<DbMemoryReview>(
    "SELECT * FROM memory_reviews WHERE user_id = $1 AND question_id = $2",
    [params.userId, params.questionId]
  );
  const stage = nextStage(existing?.stage ?? 0, params.correct);
  const nextReviewAt = calcNextReviewAt(stage);
  const record = await queryOne<DbMemoryReview>(
    `INSERT INTO memory_reviews
     (id, user_id, question_id, stage, next_review_at, last_reviewed_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, question_id) DO UPDATE SET
       stage = EXCLUDED.stage,
       next_review_at = EXCLUDED.next_review_at,
       last_reviewed_at = EXCLUDED.last_reviewed_at,
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [
      existing?.id ?? `mem-${crypto.randomBytes(6).toString("hex")}`,
      params.userId,
      params.questionId,
      stage,
      nextReviewAt,
      now,
      existing?.created_at ?? now,
      now
    ]
  );
  return record ? mapReview(record) : null;
}

export async function getDueReviewQuestionIds(userId: string) {
  if (!isDbEnabled()) {
    const list = readJson<MemoryReview[]>(REVIEW_FILE, []);
    const now = Date.now();
    return list
      .filter((item) => item.userId === userId && new Date(item.nextReviewAt).getTime() <= now)
      .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime())
      .map((item) => item.questionId);
  }

  const rows = await query<DbMemoryReview>(
    "SELECT * FROM memory_reviews WHERE user_id = $1 AND next_review_at <= now() ORDER BY next_review_at ASC",
    [userId]
  );
  return rows.map((row) => row.question_id);
}

export async function getDueReviewQuestions(params: {
  userId: string;
  subject: string;
  grade: string;
  limit?: number;
}): Promise<Question[]> {
  const dueIds = await getDueReviewQuestionIds(params.userId);
  if (!dueIds.length) return [];
  const all = await getQuestions();
  const set = new Set(dueIds);
  const filtered = all.filter(
    (q) => set.has(q.id) && q.subject === params.subject && q.grade === params.grade
  );
  return filtered.slice(0, params.limit ?? 10);
}
