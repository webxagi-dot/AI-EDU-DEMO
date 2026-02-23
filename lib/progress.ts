import { readJson, writeJson } from "./storage";
import { getKnowledgePoints, getQuestions } from "./content";
import type { Question } from "./types";

export type QuestionAttempt = {
  id: string;
  userId: string;
  questionId: string;
  subject: string;
  knowledgePointId: string;
  correct: boolean;
  answer: string;
  reason?: string;
  createdAt: string;
};

export type StudyPlanItem = {
  knowledgePointId: string;
  targetCount: number;
  dueDate: string;
};

export type StudyPlan = {
  userId: string;
  subject: string;
  createdAt: string;
  items: StudyPlanItem[];
};

const ATTEMPTS_FILE = "question-attempts.json";
const PLANS_FILE = "study-plans.json";

export function getAttempts(): QuestionAttempt[] {
  return readJson<QuestionAttempt[]>(ATTEMPTS_FILE, []);
}

export function saveAttempts(list: QuestionAttempt[]) {
  writeJson(ATTEMPTS_FILE, list);
}

export function addAttempt(attempt: QuestionAttempt) {
  const list = getAttempts();
  list.push(attempt);
  saveAttempts(list);
}

export function getAttemptsByUser(userId: string) {
  return getAttempts().filter((item) => item.userId === userId);
}

export function getLastAttemptByQuestion(userId: string) {
  const attempts = getAttemptsByUser(userId);
  const map = new Map<string, QuestionAttempt>();
  attempts.forEach((attempt) => {
    const prev = map.get(attempt.questionId);
    if (!prev || new Date(attempt.createdAt).getTime() > new Date(prev.createdAt).getTime()) {
      map.set(attempt.questionId, attempt);
    }
  });
  return map;
}

export function getWrongQuestionIds(userId: string) {
  const lastAttempts = getLastAttemptByQuestion(userId);
  return Array.from(lastAttempts.values())
    .filter((attempt) => !attempt.correct)
    .map((attempt) => attempt.questionId);
}

export function getMasteryByKnowledgePoint(userId: string, subject?: string) {
  const attempts = getAttemptsByUser(userId).filter((attempt) =>
    subject ? attempt.subject === subject : true
  );
  const totals = new Map<string, { correct: number; total: number }>();
  attempts.forEach((attempt) => {
    const current = totals.get(attempt.knowledgePointId) ?? { correct: 0, total: 0 };
    current.total += 1;
    current.correct += attempt.correct ? 1 : 0;
    totals.set(attempt.knowledgePointId, current);
  });
  return totals;
}

export function generateStudyPlan(userId: string, subject: string): StudyPlan {
  const knowledgePoints = getKnowledgePoints().filter((kp) => kp.subject === subject);
  const mastery = getMasteryByKnowledgePoint(userId, subject);
  const ranked = knowledgePoints
    .map((kp) => {
      const stat = mastery.get(kp.id) ?? { correct: 0, total: 0 };
      const ratio = stat.total === 0 ? 0 : stat.correct / stat.total;
      return { kp, ratio };
    })
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 5);

  const items: StudyPlanItem[] = ranked.map((item, index) => ({
    knowledgePointId: item.kp.id,
    targetCount: 5,
    dueDate: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString()
  }));

  const plan: StudyPlan = {
    userId,
    subject,
    createdAt: new Date().toISOString(),
    items
  };

  const plans = readJson<StudyPlan[]>(PLANS_FILE, []);
  const nextPlans = plans.filter((p) => !(p.userId === userId && p.subject === subject));
  nextPlans.push(plan);
  writeJson(PLANS_FILE, nextPlans);
  return plan;
}

export function getStudyPlan(userId: string, subject: string) {
  const plans = readJson<StudyPlan[]>(PLANS_FILE, []);
  return plans.find((plan) => plan.userId === userId && plan.subject === subject) ?? null;
}

export function generateStudyPlans(userId: string, subjects: string[]) {
  return subjects.map((subject) => generateStudyPlan(userId, subject));
}

export function getStudyPlans(userId: string, subjects: string[]) {
  const plans = readJson<StudyPlan[]>(PLANS_FILE, []);
  return plans.filter((plan) => plan.userId === userId && subjects.includes(plan.subject));
}

export function getPracticeQuestions(subject: string, grade: string, knowledgePointId?: string) {
  const questions = getQuestions().filter((q) => q.subject === subject && q.grade === grade);
  if (knowledgePointId) {
    return questions.filter((q) => q.knowledgePointId === knowledgePointId);
  }
  return questions;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getDiagnosticQuestions(subject: string, grade: string, count = 10) {
  const questions = getPracticeQuestions(subject, grade);
  const groupMap = new Map<string, Question[]>();
  questions.forEach((q) => {
    const group = groupMap.get(q.knowledgePointId) ?? [];
    group.push(q);
    groupMap.set(q.knowledgePointId, group);
  });

  const keys = Array.from(groupMap.keys());
  keys.forEach((key) => {
    const group = groupMap.get(key);
    if (group) groupMap.set(key, shuffle(group));
  });

  const selected: Question[] = [];
  let progress = true;
  while (selected.length < count && progress) {
    progress = false;
    for (const key of keys) {
      const group = groupMap.get(key) ?? [];
      if (group.length === 0) continue;
      const next = group.pop();
      if (next) {
        selected.push(next);
        progress = true;
      }
      if (selected.length >= count) break;
    }
  }

  return selected.length ? selected : questions.slice(0, count);
}

export function getWeakKnowledgePoints(userId: string, subject: string) {
  const mastery = getMasteryByKnowledgePoint(userId, subject);
  const knowledgePoints = getKnowledgePoints().filter((kp) => kp.subject === subject);
  return knowledgePoints
    .map((kp) => {
      const stat = mastery.get(kp.id) ?? { correct: 0, total: 0 };
      const ratio = stat.total === 0 ? 0 : stat.correct / stat.total;
      return { kp, ratio, total: stat.total };
    })
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 3);
}

export function getWeeklyStats(userId: string) {
  const attempts = getAttemptsByUser(userId);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = attempts.filter((a) => new Date(a.createdAt).getTime() >= weekAgo);
  const total = recent.length;
  const correct = recent.filter((a) => a.correct).length;
  return {
    total,
    correct,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 100)
  };
}

export function getStatsBetween(userId: string, start: Date, end: Date) {
  const attempts = getAttemptsByUser(userId);
  const recent = attempts.filter((a) => {
    const ts = new Date(a.createdAt).getTime();
    return ts >= start.getTime() && ts < end.getTime();
  });
  const total = recent.length;
  const correct = recent.filter((a) => a.correct).length;
  return {
    total,
    correct,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 100)
  };
}

function toLocalDateKey(input: Date) {
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDailyActivity(userId: string) {
  const attempts = getAttemptsByUser(userId);
  const map = new Map<string, number>();
  attempts.forEach((attempt) => {
    const key = toLocalDateKey(new Date(attempt.createdAt));
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return map;
}

export function getStreak(userId: string) {
  const activity = getDailyActivity(userId);
  let streak = 0;
  const cursor = new Date();
  while (activity.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getAccuracyLastDays(userId: string, days: number) {
  const attempts = getAttemptsByUser(userId);
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = attempts.filter((a) => new Date(a.createdAt).getTime() >= since);
  const total = recent.length;
  const correct = recent.filter((a) => a.correct).length;
  return {
    total,
    correct,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 100)
  };
}

export function getDailyAccuracy(userId: string, days: number) {
  const attempts = getAttemptsByUser(userId);
  const buckets = new Map<string, { correct: number; total: number }>();
  attempts.forEach((attempt) => {
    const key = toLocalDateKey(new Date(attempt.createdAt));
    const current = buckets.get(key) ?? { correct: 0, total: 0 };
    current.total += 1;
    current.correct += attempt.correct ? 1 : 0;
    buckets.set(key, current);
  });

  const result: { date: string; total: number; correct: number; accuracy: number }[] = [];
  const cursor = new Date();
  for (let i = 0; i < days; i += 1) {
    const dateKey = toLocalDateKey(new Date(cursor));
    const stat = buckets.get(dateKey) ?? { correct: 0, total: 0 };
    result.unshift({
      date: dateKey,
      total: stat.total,
      correct: stat.correct,
      accuracy: stat.total === 0 ? 0 : Math.round((stat.correct / stat.total) * 100)
    });
    cursor.setDate(cursor.getDate() - 1);
  }
  return result;
}

export function getBadges(userId: string) {
  const attempts = getAttemptsByUser(userId);
  const streak = getStreak(userId);
  const weekly = getAccuracyLastDays(userId, 7);
  const badges: { id: string; title: string; description: string }[] = [];

  if (attempts.length >= 1) {
    badges.push({ id: "first", title: "首次学习", description: "完成首次练习" });
  }
  if (streak >= 3) {
    badges.push({ id: "streak-3", title: "连学 3 天", description: "连续学习 3 天" });
  }
  if (weekly.total >= 5 && weekly.accuracy >= 80) {
    badges.push({ id: "accuracy-80", title: "高准确率", description: "近 7 天正确率 ≥ 80%" });
  }
  if (attempts.length >= 50) {
    badges.push({ id: "practice-50", title: "学习达人", description: "完成 50 道题" });
  }
  return badges;
}
