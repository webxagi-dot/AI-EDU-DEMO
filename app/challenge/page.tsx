"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";

type ChallengeTask = {
  id: string;
  title: string;
  description: string;
  goal: number;
  points: number;
  type: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
};

export default function ChallengePage() {
  const [tasks, setTasks] = useState<ChallengeTask[]>([]);
  const [points, setPoints] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/challenges");
    const data = await res.json();
    setTasks(data?.data?.tasks ?? []);
    setPoints(data?.data?.points ?? 0);
  }

  useEffect(() => {
    load();
  }, []);

  async function claim(taskId: string) {
    setLoadingId(taskId);
    const res = await fetch("/api/challenges/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId })
    });
    const data = await res.json();
    setTasks(data?.data?.tasks ?? []);
    setPoints(data?.data?.points ?? 0);
    setLoadingId(null);
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="闯关式任务系统">
        <p>完成挑战获取奖励积分，用于激励学习。</p>
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-title">当前积分</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{points}</div>
        </div>
        <div className="cta-row" style={{ marginTop: 12 }}>
          <Link className="button secondary" href="/practice?mode=challenge">
            进入闯关练习
          </Link>
        </div>
      </Card>

      <Card title="挑战任务">
        <div className="grid" style={{ gap: 12 }}>
          {tasks.map((task) => (
            <div className="card" key={task.id}>
              <div className="section-title">{task.title}</div>
              <p>{task.description}</p>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                进度：{task.type === "accuracy" ? `${task.progress}%` : `${task.progress}/${task.goal}`} · 奖励 {task.points} 积分
              </div>
              <div className="cta-row" style={{ marginTop: 8 }}>
                <button
                  className="button primary"
                  onClick={() => claim(task.id)}
                  disabled={!task.completed || task.claimed || loadingId === task.id}
                >
                  {task.claimed ? "已领取" : task.completed ? "领取奖励" : "未完成"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
