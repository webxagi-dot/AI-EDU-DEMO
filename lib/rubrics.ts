import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query } from "./db";

export type AssignmentRubric = {
  id: string;
  assignmentId: string;
  title: string;
  description?: string;
  maxScore: number;
  weight: number;
  createdAt: string;
};

export type AssignmentReviewRubric = {
  id: string;
  reviewId: string;
  rubricId: string;
  score: number;
  comment?: string;
};

const RUBRIC_FILE = "assignment-rubrics.json";
const REVIEW_RUBRIC_FILE = "assignment-review-rubrics.json";

type DbRubric = {
  id: string;
  assignment_id: string;
  title: string;
  description: string | null;
  max_score: number;
  weight: number;
  created_at: string;
};

type DbReviewRubric = {
  id: string;
  review_id: string;
  rubric_id: string;
  score: number;
  comment: string | null;
};

function mapRubric(row: DbRubric): AssignmentRubric {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    title: row.title,
    description: row.description ?? undefined,
    maxScore: row.max_score,
    weight: row.weight,
    createdAt: row.created_at
  };
}

function mapReviewRubric(row: DbReviewRubric): AssignmentReviewRubric {
  return {
    id: row.id,
    reviewId: row.review_id,
    rubricId: row.rubric_id,
    score: row.score,
    comment: row.comment ?? undefined
  };
}

export async function getAssignmentRubrics(assignmentId: string): Promise<AssignmentRubric[]> {
  if (!isDbEnabled()) {
    const list = readJson<AssignmentRubric[]>(RUBRIC_FILE, []);
    return list.filter((item) => item.assignmentId === assignmentId);
  }
  const rows = await query<DbRubric>(
    "SELECT * FROM assignment_rubrics WHERE assignment_id = $1 ORDER BY created_at ASC",
    [assignmentId]
  );
  return rows.map(mapRubric);
}

export async function createAssignmentRubrics(params: {
  assignmentId: string;
  items: Array<{ title: string; description?: string; maxScore?: number; weight?: number }>;
}): Promise<AssignmentRubric[]> {
  const createdAt = new Date().toISOString();
  const items: AssignmentRubric[] = params.items.map((item) => ({
    id: `rubric-${crypto.randomBytes(6).toString("hex")}`,
    assignmentId: params.assignmentId,
    title: item.title,
    description: item.description,
    maxScore: item.maxScore ?? 5,
    weight: item.weight ?? 1,
    createdAt
  }));

  if (!isDbEnabled()) {
    const list = readJson<AssignmentRubric[]>(RUBRIC_FILE, []);
    list.push(...items);
    writeJson(RUBRIC_FILE, list);
    return items;
  }

  for (const item of items) {
    await query(
      `INSERT INTO assignment_rubrics (id, assignment_id, title, description, max_score, weight, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        item.id,
        item.assignmentId,
        item.title,
        item.description ?? null,
        item.maxScore,
        item.weight,
        item.createdAt
      ]
    );
  }
  return items;
}

export async function ensureDefaultRubrics(params: {
  assignmentId: string;
  submissionType?: "quiz" | "upload" | "essay";
}) {
  const existing = await getAssignmentRubrics(params.assignmentId);
  if (existing.length) return existing;
  if (params.submissionType === "quiz") return [];

  const items =
    params.submissionType === "essay"
      ? [
          { title: "结构与逻辑", description: "层次清晰、结构完整", maxScore: 10 },
          { title: "内容与观点", description: "内容充实、观点明确", maxScore: 10 },
          { title: "语言与表达", description: "语句通顺、表达准确", maxScore: 10 }
        ]
      : [
          { title: "完成度", description: "内容完整、步骤齐全", maxScore: 10 },
          { title: "准确性", description: "计算与表达准确", maxScore: 10 },
          { title: "规范性", description: "格式与书写规范", maxScore: 10 }
        ];

  return createAssignmentRubrics({ assignmentId: params.assignmentId, items });
}

export async function getReviewRubrics(reviewId: string): Promise<AssignmentReviewRubric[]> {
  if (!isDbEnabled()) {
    const list = readJson<AssignmentReviewRubric[]>(REVIEW_RUBRIC_FILE, []);
    return list.filter((item) => item.reviewId === reviewId);
  }
  const rows = await query<DbReviewRubric>(
    "SELECT * FROM assignment_review_rubrics WHERE review_id = $1",
    [reviewId]
  );
  return rows.map(mapReviewRubric);
}

export async function saveReviewRubrics(params: {
  reviewId: string;
  items: Array<{ rubricId: string; score: number; comment?: string }>;
}) {
  const items: AssignmentReviewRubric[] = params.items.map((item) => ({
    id: `review-rubric-${crypto.randomBytes(6).toString("hex")}`,
    reviewId: params.reviewId,
    rubricId: item.rubricId,
    score: item.score,
    comment: item.comment
  }));

  if (!isDbEnabled()) {
    const list = readJson<AssignmentReviewRubric[]>(REVIEW_RUBRIC_FILE, []);
    const filtered = list.filter((item) => item.reviewId !== params.reviewId);
    writeJson(REVIEW_RUBRIC_FILE, [...filtered, ...items]);
    return items;
  }

  await query("DELETE FROM assignment_review_rubrics WHERE review_id = $1", [params.reviewId]);
  for (const item of items) {
    await query(
      `INSERT INTO assignment_review_rubrics (id, review_id, rubric_id, score, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [item.id, item.reviewId, item.rubricId, item.score, item.comment ?? null]
    );
  }
  return items;
}
