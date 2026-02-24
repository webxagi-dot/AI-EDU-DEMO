import crypto from "crypto";
import { readJson, writeJson } from "./storage";
import { isDbEnabled, query, queryOne } from "./db";
import { getAttemptsByUser, getStreak, getWeeklyStats } from "./progress";
import { getAssignmentSubmissionsByStudent } from "./assignments";

export type ChallengeTask = {
  id: string;
  title: string;
  description: string;
  goal: number;
  points: number;
  type: "count" | "streak" | "accuracy";
};

export type ChallengeStatus = ChallengeTask & {
  progress: number;
  completed: boolean;
  claimed: boolean;
};

const CLAIM_FILE = "challenge-claims.json";

const TASKS: ChallengeTask[] = [
  {
    id: "practice-10",
    title: "闯关训练",
    description: "完成 10 道练习题",
    goal: 10,
    points: 10,
    type: "count"
  },
  {
    id: "streak-3",
    title: "连续学习",
    description: "连续学习 3 天",
    goal: 3,
    points: 15,
    type: "streak"
  },
  {
    id: "accuracy-80",
    title: "高正确率",
    description: "近 7 天正确率 ≥ 80%，且练习至少 10 题",
    goal: 80,
    points: 20,
    type: "accuracy"
  },
  {
    id: "assignment-1",
    title: "作业任务",
    description: "完成 1 次作业提交",
    goal: 1,
    points: 12,
    type: "count"
  }
];

type DbClaim = {
  id: string;
  user_id: string;
  task_id: string;
  points: number;
  claimed_at: string;
};

type Claim = {
  id: string;
  userId: string;
  taskId: string;
  points: number;
  claimedAt: string;
};

function mapClaim(row: DbClaim): Claim {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    points: row.points,
    claimedAt: row.claimed_at
  };
}

async function getClaims(userId: string) {
  if (!isDbEnabled()) {
    const list = readJson<Claim[]>(CLAIM_FILE, []);
    return list.filter((item) => item.userId === userId);
  }
  const rows = await query<DbClaim>("SELECT * FROM challenge_claims WHERE user_id = $1", [userId]);
  return rows.map(mapClaim);
}

export async function getChallengeStatus(userId: string) {
  const attempts = await getAttemptsByUser(userId);
  const streak = await getStreak(userId);
  const weekly = await getWeeklyStats(userId);
  const assignments = await getAssignmentSubmissionsByStudent(userId);
  const claims = await getClaims(userId);
  const claimedSet = new Set(claims.map((item) => item.taskId));

  return TASKS.map((task) => {
    let progress = 0;
    if (task.id === "practice-10") {
      progress = attempts.length;
    } else if (task.id === "streak-3") {
      progress = streak;
    } else if (task.id === "accuracy-80") {
      progress = weekly.accuracy;
    } else if (task.id === "assignment-1") {
      progress = assignments.length;
    }
    const completed =
      task.id === "accuracy-80"
        ? weekly.accuracy >= 80 && weekly.total >= 10
        : progress >= task.goal;
    return {
      ...task,
      progress,
      completed,
      claimed: claimedSet.has(task.id)
    } as ChallengeStatus;
  });
}

export async function getChallengePoints(userId: string) {
  const claims = await getClaims(userId);
  return claims.reduce((sum, item) => sum + item.points, 0);
}

export async function claimChallenge(userId: string, taskId: string) {
  const tasks = await getChallengeStatus(userId);
  const task = tasks.find((item) => item.id === taskId);
  if (!task || !task.completed) {
    return { ok: false, message: "任务未完成" };
  }
  if (task.claimed) {
    return { ok: false, message: "已领取" };
  }

  const claim: Claim = {
    id: `claim-${crypto.randomBytes(6).toString("hex")}`,
    userId,
    taskId,
    points: task.points,
    claimedAt: new Date().toISOString()
  };

  if (!isDbEnabled()) {
    const list = readJson<Claim[]>(CLAIM_FILE, []);
    list.push(claim);
    writeJson(CLAIM_FILE, list);
    return { ok: true, claim };
  }

  const row = await queryOne<DbClaim>(
    `INSERT INTO challenge_claims (id, user_id, task_id, points, claimed_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, task_id) DO NOTHING
     RETURNING *`,
    [claim.id, claim.userId, claim.taskId, claim.points, claim.claimedAt]
  );

  if (!row) {
    return { ok: false, message: "已领取" };
  }

  return { ok: true, claim: mapClaim(row) };
}
