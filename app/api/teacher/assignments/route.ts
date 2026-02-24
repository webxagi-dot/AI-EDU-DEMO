import { NextResponse } from "next/server";
import { getCurrentUser, getParentsByStudentId } from "@/lib/auth";
import { getClassById, getClassesByTeacher, getClassStudentIds } from "@/lib/classes";
import { createAssignment, getAssignmentProgress, getAssignmentsByClassIds } from "@/lib/assignments";
import { createQuestion, getKnowledgePoints, getQuestions } from "@/lib/content";
import { createNotification } from "@/lib/notifications";
import { generateQuestionDraft } from "@/lib/ai";
import type { Difficulty } from "@/lib/types";

export const dynamic = "force-dynamic";

function normalizeDueDate(input?: string) {
  if (!input) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split("-").map((value) => Number(value));
    return new Date(year, month - 1, day, 23, 59, 0).toISOString();
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  return parsed.toISOString();
}

function sampleQuestions<T>(items: T[], count: number) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function normalizeStem(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。！？,.!?;:；：、]/g, "");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const classes = await getClassesByTeacher(user.id);
  const classIds = classes.map((item) => item.id);
  const classMap = new Map(classes.map((item) => [item.id, item]));
  const assignments = await getAssignmentsByClassIds(classIds);

  const data = await Promise.all(
    assignments.map(async (assignment) => {
      const progress = await getAssignmentProgress(assignment.id);
      const completed = progress.filter((item) => item.status === "completed").length;
      const klass = classMap.get(assignment.classId);
      return {
        ...assignment,
        className: klass?.name ?? "-",
        classSubject: klass?.subject ?? "-",
        classGrade: klass?.grade ?? "-",
        total: progress.length,
        completed
      };
    })
  );

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    classId?: string;
    title?: string;
    description?: string;
    dueDate?: string;
    questionCount?: number;
    knowledgePointId?: string;
    mode?: "bank" | "ai";
    difficulty?: Difficulty;
    questionType?: string;
    submissionType?: "quiz" | "upload";
    maxUploads?: number;
    gradingFocus?: string;
  };

  const submissionType = body.submissionType === "upload" ? "upload" : "quiz";
  const questionCount = Number(body.questionCount ?? 0);
  if (!body.classId || !body.title || (submissionType === "quiz" && questionCount <= 0)) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const klass = await getClassById(body.classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "class not found" }, { status: 404 });
  }

  const dueDate = normalizeDueDate(body.dueDate);
  const mode = body.mode === "ai" ? "ai" : "bank";
  const questionType = body.questionType?.trim();
  const difficulty = body.difficulty;

  let questionIds: string[] = [];

  if (submissionType === "quiz" && mode === "ai") {
    const provider = process.env.LLM_PROVIDER ?? "mock";
    if (provider === "mock") {
      return NextResponse.json({ error: "请先配置 AI 模型" }, { status: 400 });
    }

    const knowledgePoints = await getKnowledgePoints();
    const kp = knowledgePoints.find((item) => item.id === body.knowledgePointId);
    if (!kp) {
      return NextResponse.json({ error: "请选择知识点" }, { status: 400 });
    }

    const existing = (await getQuestions()).filter(
      (q) => q.subject === klass.subject && q.grade === klass.grade && q.knowledgePointId === kp.id
    );
    const existingStems = new Set(existing.map((q) => normalizeStem(q.stem)));
    const createdStems = new Set<string>();

    for (let i = 0; i < questionCount; i += 1) {
      let draft = null;
      let attempts = 0;
      while (!draft && attempts < 3) {
        attempts += 1;
        const next = await generateQuestionDraft({
          subject: klass.subject,
          grade: klass.grade,
          knowledgePointTitle: kp.title,
          chapter: kp.chapter,
          difficulty,
          questionType
        });
        if (!next) continue;
        const key = normalizeStem(next.stem);
        if (existingStems.has(key) || createdStems.has(key)) {
          continue;
        }
        draft = next;
        createdStems.add(key);
      }

      if (!draft) {
        return NextResponse.json({ error: `AI 生成失败（第 ${i + 1} 题）` }, { status: 500 });
      }

      const saved = await createQuestion({
        subject: klass.subject,
        grade: klass.grade,
        knowledgePointId: kp.id,
        stem: draft.stem,
        options: draft.options,
        answer: draft.answer,
        explanation: draft.explanation,
        difficulty: difficulty ?? "medium",
        questionType: questionType || "choice",
        tags: [],
        abilities: []
      });

      if (!saved) {
        return NextResponse.json({ error: "题目保存失败" }, { status: 500 });
      }
      questionIds.push(saved.id);
    }
  } else if (submissionType === "quiz") {
    const questions = await getQuestions();
    let pool = questions.filter((item) => item.subject === klass.subject && item.grade === klass.grade);
    if (body.knowledgePointId) {
      pool = pool.filter((item) => item.knowledgePointId === body.knowledgePointId);
    }
    if (difficulty) {
      pool = pool.filter((item) => item.difficulty === difficulty);
    }
    if (questionType) {
      pool = pool.filter((item) => (item.questionType ?? "choice") === questionType);
    }

    if (pool.length < questionCount) {
      return NextResponse.json({ error: "题库数量不足" }, { status: 400 });
    }

    const selected = sampleQuestions(pool, questionCount);
    questionIds = selected.map((item) => item.id);
  }

  const assignment = await createAssignment({
    classId: klass.id,
    title: body.title,
    description: body.description,
    dueDate,
    questionIds,
    submissionType,
    maxUploads: body.maxUploads,
    gradingFocus: body.gradingFocus
  });

  const studentIds = await getClassStudentIds(klass.id);
  for (const studentId of studentIds) {
    await createNotification({
      userId: studentId,
      title: "新的作业",
      content: `班级「${klass.name}」发布作业：${assignment.title}`,
      type: "assignment"
    });
    const parents = await getParentsByStudentId(studentId);
    for (const parent of parents) {
      await createNotification({
        userId: parent.id,
        title: "孩子新作业",
        content: `孩子所在班级「${klass.name}」发布作业：${assignment.title}`,
        type: "assignment"
      });
    }
  }

  return NextResponse.json({ data: assignment });
}
