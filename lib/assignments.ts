import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";
import { getClassStudentIds } from "./classes";

export type Assignment = {
  id: string;
  classId: string;
  title: string;
  description?: string;
  dueDate: string;
  createdAt: string;
};

export type AssignmentItem = {
  id: string;
  assignmentId: string;
  questionId: string;
};

export type AssignmentProgress = {
  id: string;
  assignmentId: string;
  studentId: string;
  status: string;
  completedAt?: string;
  score?: number;
  total?: number;
};

export type AssignmentSubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  submittedAt: string;
};

const ASSIGNMENT_FILE = "assignments.json";
const ASSIGNMENT_ITEM_FILE = "assignment-items.json";
const ASSIGNMENT_PROGRESS_FILE = "assignment-progress.json";
const ASSIGNMENT_SUBMISSION_FILE = "assignment-submissions.json";

type DbAssignment = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  due_date: string;
  created_at: string;
};

type DbAssignmentItem = {
  id: string;
  assignment_id: string;
  question_id: string;
};

type DbAssignmentProgress = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: string;
  completed_at: string | null;
  score: number | null;
  total: number | null;
};

type DbAssignmentSubmission = {
  id: string;
  assignment_id: string;
  student_id: string;
  answers: any;
  score: number;
  total: number;
  submitted_at: string;
};

function mapAssignment(row: DbAssignment): Assignment {
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    description: row.description ?? undefined,
    dueDate: row.due_date,
    createdAt: row.created_at
  };
}

function mapAssignmentItem(row: DbAssignmentItem): AssignmentItem {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    questionId: row.question_id
  };
}

function mapAssignmentProgress(row: DbAssignmentProgress): AssignmentProgress {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    status: row.status,
    completedAt: row.completed_at ?? undefined,
    score: row.score ?? undefined,
    total: row.total ?? undefined
  };
}

function mapAssignmentSubmission(row: DbAssignmentSubmission): AssignmentSubmission {
  let answers: Record<string, string> = {};
  if (row.answers && typeof row.answers === "object") {
    answers = row.answers as Record<string, string>;
  } else if (typeof row.answers === "string") {
    try {
      answers = JSON.parse(row.answers) as Record<string, string>;
    } catch {
      answers = {};
    }
  }
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    answers,
    score: row.score,
    total: row.total,
    submittedAt: row.submitted_at
  };
}

export async function getAssignments(): Promise<Assignment[]> {
  if (!isDbEnabled()) {
    return readJson<Assignment[]>(ASSIGNMENT_FILE, []);
  }
  const rows = await query<DbAssignment>("SELECT * FROM assignments");
  return rows.map(mapAssignment);
}

export async function getAssignmentById(id: string): Promise<Assignment | null> {
  if (!isDbEnabled()) {
    const list = await getAssignments();
    return list.find((item) => item.id === id) ?? null;
  }
  const row = await queryOne<DbAssignment>("SELECT * FROM assignments WHERE id = $1", [id]);
  return row ? mapAssignment(row) : null;
}

export async function getAssignmentsByClass(classId: string): Promise<Assignment[]> {
  if (!isDbEnabled()) {
    return (await getAssignments()).filter((item) => item.classId === classId);
  }
  const rows = await query<DbAssignment>("SELECT * FROM assignments WHERE class_id = $1 ORDER BY created_at DESC", [
    classId
  ]);
  return rows.map(mapAssignment);
}

export async function getAssignmentsByClassIds(classIds: string[]): Promise<Assignment[]> {
  if (!classIds.length) return [];
  if (!isDbEnabled()) {
    const list = await getAssignments();
    return list.filter((item) => classIds.includes(item.classId));
  }
  const rows = await query<DbAssignment>(
    "SELECT * FROM assignments WHERE class_id = ANY($1) ORDER BY created_at DESC",
    [classIds]
  );
  return rows.map(mapAssignment);
}

export async function getAssignmentItems(assignmentId: string): Promise<AssignmentItem[]> {
  if (!isDbEnabled()) {
    const items = readJson<AssignmentItem[]>(ASSIGNMENT_ITEM_FILE, []);
    return items.filter((item) => item.assignmentId === assignmentId);
  }
  const rows = await query<DbAssignmentItem>("SELECT * FROM assignment_items WHERE assignment_id = $1", [
    assignmentId
  ]);
  return rows.map(mapAssignmentItem);
}

export async function getAssignmentProgress(assignmentId: string): Promise<AssignmentProgress[]> {
  if (!isDbEnabled()) {
    const progress = readJson<AssignmentProgress[]>(ASSIGNMENT_PROGRESS_FILE, []);
    return progress.filter((item) => item.assignmentId === assignmentId);
  }
  const rows = await query<DbAssignmentProgress>("SELECT * FROM assignment_progress WHERE assignment_id = $1", [
    assignmentId
  ]);
  return rows.map(mapAssignmentProgress);
}

export async function getAssignmentProgressByStudent(studentId: string): Promise<AssignmentProgress[]> {
  if (!isDbEnabled()) {
    const progress = readJson<AssignmentProgress[]>(ASSIGNMENT_PROGRESS_FILE, []);
    return progress.filter((item) => item.studentId === studentId);
  }
  const rows = await query<DbAssignmentProgress>("SELECT * FROM assignment_progress WHERE student_id = $1", [
    studentId
  ]);
  return rows.map(mapAssignmentProgress);
}

export async function getAssignmentSubmission(
  assignmentId: string,
  studentId: string
): Promise<AssignmentSubmission | null> {
  if (!isDbEnabled()) {
    const list = readJson<AssignmentSubmission[]>(ASSIGNMENT_SUBMISSION_FILE, []);
    return list.find((item) => item.assignmentId === assignmentId && item.studentId === studentId) ?? null;
  }
  const row = await queryOne<DbAssignmentSubmission>(
    "SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2",
    [assignmentId, studentId]
  );
  return row ? mapAssignmentSubmission(row) : null;
}

export async function upsertAssignmentSubmission(input: {
  assignmentId: string;
  studentId: string;
  answers: Record<string, string>;
  score: number;
  total: number;
}): Promise<AssignmentSubmission> {
  const submittedAt = new Date().toISOString();
  if (!isDbEnabled()) {
    const list = readJson<AssignmentSubmission[]>(ASSIGNMENT_SUBMISSION_FILE, []);
    const index = list.findIndex(
      (item) => item.assignmentId === input.assignmentId && item.studentId === input.studentId
    );
    const next: AssignmentSubmission = {
      id: index >= 0 ? list[index].id : `assign-sub-${crypto.randomBytes(6).toString("hex")}`,
      assignmentId: input.assignmentId,
      studentId: input.studentId,
      answers: input.answers,
      score: input.score,
      total: input.total,
      submittedAt
    };
    if (index >= 0) {
      list[index] = next;
    } else {
      list.push(next);
    }
    writeJson(ASSIGNMENT_SUBMISSION_FILE, list);
    return next;
  }

  const id = `assign-sub-${crypto.randomBytes(6).toString("hex")}`;
  const row = await queryOne<DbAssignmentSubmission>(
    `INSERT INTO assignment_submissions (id, assignment_id, student_id, answers, score, total, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (assignment_id, student_id) DO UPDATE SET
       answers = EXCLUDED.answers,
       score = EXCLUDED.score,
       total = EXCLUDED.total,
       submitted_at = EXCLUDED.submitted_at
     RETURNING *`,
    [id, input.assignmentId, input.studentId, input.answers, input.score, input.total, submittedAt]
  );
  return row
    ? mapAssignmentSubmission(row)
    : {
        id,
        assignmentId: input.assignmentId,
        studentId: input.studentId,
        answers: input.answers,
        score: input.score,
        total: input.total,
        submittedAt
      };
}

export async function getAssignmentSubmissionsByStudent(studentId: string): Promise<AssignmentSubmission[]> {
  if (!isDbEnabled()) {
    const list = readJson<AssignmentSubmission[]>(ASSIGNMENT_SUBMISSION_FILE, []);
    return list.filter((item) => item.studentId === studentId);
  }
  const rows = await query<DbAssignmentSubmission>("SELECT * FROM assignment_submissions WHERE student_id = $1", [
    studentId
  ]);
  return rows.map(mapAssignmentSubmission);
}

export async function getAssignmentProgressForStudent(
  assignmentId: string,
  studentId: string
): Promise<AssignmentProgress | null> {
  if (!isDbEnabled()) {
    const progress = readJson<AssignmentProgress[]>(ASSIGNMENT_PROGRESS_FILE, []);
    return progress.find((item) => item.assignmentId === assignmentId && item.studentId === studentId) ?? null;
  }
  const row = await queryOne<DbAssignmentProgress>(
    "SELECT * FROM assignment_progress WHERE assignment_id = $1 AND student_id = $2",
    [assignmentId, studentId]
  );
  return row ? mapAssignmentProgress(row) : null;
}

export async function createAssignmentProgress(assignmentId: string, studentId: string): Promise<AssignmentProgress> {
  const existing = await getAssignmentProgressForStudent(assignmentId, studentId);
  if (existing) return existing;

  if (!isDbEnabled()) {
    const list = readJson<AssignmentProgress[]>(ASSIGNMENT_PROGRESS_FILE, []);
    const next: AssignmentProgress = {
      id: `assign-progress-${crypto.randomBytes(6).toString("hex")}`,
      assignmentId,
      studentId,
      status: "pending"
    };
    list.push(next);
    writeJson(ASSIGNMENT_PROGRESS_FILE, list);
    return next;
  }

  const id = `assign-progress-${crypto.randomBytes(6).toString("hex")}`;
  const row = await queryOne<DbAssignmentProgress>(
    `INSERT INTO assignment_progress (id, assignment_id, student_id, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, assignmentId, studentId, "pending"]
  );
  return row ? mapAssignmentProgress(row) : { id, assignmentId, studentId, status: "pending" };
}

export async function createAssignment(input: {
  classId: string;
  title: string;
  description?: string;
  dueDate: string;
  questionIds: string[];
}): Promise<Assignment> {
  const createdAt = new Date().toISOString();
  const uniqueQuestions = Array.from(new Set(input.questionIds));

  if (!isDbEnabled()) {
    const assignments = await getAssignments();
    const assignment: Assignment = {
      id: `assign-${crypto.randomBytes(6).toString("hex")}`,
      classId: input.classId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      createdAt
    };
    assignments.push(assignment);
    writeJson(ASSIGNMENT_FILE, assignments);

    const items = readJson<AssignmentItem[]>(ASSIGNMENT_ITEM_FILE, []);
    uniqueQuestions.forEach((questionId) => {
      items.push({
        id: `assign-item-${crypto.randomBytes(6).toString("hex")}`,
        assignmentId: assignment.id,
        questionId
      });
    });
    writeJson(ASSIGNMENT_ITEM_FILE, items);

    const students = await getClassStudentIds(input.classId);
    for (const studentId of students) {
      await createAssignmentProgress(assignment.id, studentId);
    }

    return assignment;
  }

  const id = `assign-${crypto.randomBytes(6).toString("hex")}`;
  const row = await queryOne<DbAssignment>(
    `INSERT INTO assignments (id, class_id, title, description, due_date, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, input.classId, input.title, input.description ?? null, input.dueDate, createdAt]
  );

  for (const questionId of uniqueQuestions) {
    await query(
      `INSERT INTO assignment_items (id, assignment_id, question_id)
       VALUES ($1, $2, $3)`,
      [`assign-item-${crypto.randomBytes(6).toString("hex")}`, id, questionId]
    );
  }

  const students = await getClassStudentIds(input.classId);
  for (const studentId of students) {
    await createAssignmentProgress(id, studentId);
  }

  return row ? mapAssignment(row) : { id, ...input, createdAt };
}

export async function completeAssignmentProgress(input: {
  assignmentId: string;
  studentId: string;
  score: number;
  total: number;
}): Promise<AssignmentProgress> {
  const completedAt = new Date().toISOString();

  if (!isDbEnabled()) {
    const list = readJson<AssignmentProgress[]>(ASSIGNMENT_PROGRESS_FILE, []);
    const index = list.findIndex(
      (item) => item.assignmentId === input.assignmentId && item.studentId === input.studentId
    );
    const updated: AssignmentProgress = {
      id: index >= 0 ? list[index].id : `assign-progress-${crypto.randomBytes(6).toString("hex")}`,
      assignmentId: input.assignmentId,
      studentId: input.studentId,
      status: "completed",
      completedAt,
      score: input.score,
      total: input.total
    };
    if (index >= 0) {
      list[index] = updated;
    } else {
      list.push(updated);
    }
    writeJson(ASSIGNMENT_PROGRESS_FILE, list);
    return updated;
  }

  const existing = await getAssignmentProgressForStudent(input.assignmentId, input.studentId);
  if (!existing) {
    const id = `assign-progress-${crypto.randomBytes(6).toString("hex")}`;
    const row = await queryOne<DbAssignmentProgress>(
      `INSERT INTO assignment_progress (id, assignment_id, student_id, status, completed_at, score, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, input.assignmentId, input.studentId, "completed", completedAt, input.score, input.total]
    );
    return row
      ? mapAssignmentProgress(row)
      : {
          id,
          assignmentId: input.assignmentId,
          studentId: input.studentId,
          status: "completed",
          completedAt,
          score: input.score,
          total: input.total
        };
  }

  const row = await queryOne<DbAssignmentProgress>(
    `UPDATE assignment_progress
     SET status = 'completed',
         completed_at = $3,
         score = $4,
         total = $5
     WHERE assignment_id = $1 AND student_id = $2
     RETURNING *`,
    [input.assignmentId, input.studentId, completedAt, input.score, input.total]
  );

  return row ? mapAssignmentProgress(row) : { ...existing, status: "completed", completedAt, score: input.score, total: input.total };
}
