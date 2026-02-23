"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";

type PlanItem = {
  knowledgePointId: string;
  targetCount: number;
  dueDate: string;
  subject?: string;
};

const subjectLabel: Record<string, string> = {
  math: "数学",
  chinese: "语文",
  english: "英语"
};

export default function StudentPage() {
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [motivation, setMotivation] = useState<{ streak: number; badges: any[]; weekly: any } | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/plan")
      .then((res) => res.json())
      .then((data) => {
        const items = data.data?.items ?? [];
        setPlan(items);
      });
    fetch("/api/student/motivation")
      .then((res) => res.json())
      .then((data) => setMotivation(data));
    fetch("/api/student/join-requests")
      .then((res) => res.json())
      .then((data) => setJoinRequests(data.data ?? []));
  }, []);

  async function handleJoinClass(event: React.FormEvent) {
    event.preventDefault();
    setJoinMessage(null);
    const res = await fetch("/api/student/join-class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode })
    });
    const data = await res.json();
    setJoinMessage(data?.message ?? (res.ok ? "已提交" : "加入失败"));
    setJoinCode("");
    fetch("/api/student/join-requests")
      .then((resp) => resp.json())
      .then((payload) => setJoinRequests(payload.data ?? []));
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="今日任务">
        {plan.length === 0 ? (
          <p>尚未生成学习计划，请先完成诊断测评。</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {plan.slice(0, 3).map((item) => (
              <li key={item.knowledgePointId}>
                {item.subject ? `【${subjectLabel[item.subject] ?? item.subject}】` : ""}练习 {item.targetCount} 题，截止{" "}
                {new Date(item.dueDate).toLocaleDateString("zh-CN")}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="学习激励">
        <div className="grid grid-2">
          <div className="card">
            <div className="section-title">连续学习</div>
            <p>{motivation?.streak ?? 0} 天</p>
          </div>
          <div className="card">
            <div className="section-title">本周正确率</div>
            <p>{motivation?.weekly?.accuracy ?? 0}%</p>
          </div>
        </div>
        <div className="grid" style={{ gap: 8, marginTop: 12 }}>
          <div className="badge">徽章</div>
          {motivation?.badges?.length ? (
            motivation.badges.map((badge: any) => (
              <div key={badge.id}>
                {badge.title} - {badge.description}
              </div>
            ))
          ) : (
            <p>完成一次练习即可获得首枚徽章。</p>
          )}
        </div>
      </Card>

      <div className="grid grid-3">
        <Card title="诊断测评">
          <p>定位薄弱点，生成学习计划。</p>
          <Link className="button secondary" href="/diagnostic" style={{ marginTop: 12 }}>
            开始诊断
          </Link>
        </Card>
        <Card title="加入班级">
          <form onSubmit={handleJoinClass} style={{ display: "grid", gap: 10 }}>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="输入老师提供的邀请码"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
            <button className="button primary" type="submit">
              提交申请
            </button>
          </form>
          {joinMessage ? <div style={{ marginTop: 8, fontSize: 12 }}>{joinMessage}</div> : null}
          {joinRequests.filter((item) => item.status === "pending").length ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-1)" }}>已有待审核申请。</div>
          ) : null}
        </Card>
        <Card title="作业中心">
          <p>查看老师布置的作业进度。</p>
          <Link className="button secondary" href="/student/assignments" style={{ marginTop: 12 }}>
            进入作业
          </Link>
        </Card>
        <Card title="AI 辅导">
          <p>逐步提示和引导式讲解。</p>
          <Link className="button secondary" href="/tutor" style={{ marginTop: 12 }}>
            打开辅导
          </Link>
        </Card>
        <Card title="错题本">
          <p>查看错因与复习节奏。</p>
          <Link className="button secondary" href="/wrong-book" style={{ marginTop: 12 }}>
            进入错题本
          </Link>
        </Card>
        <Card title="通知中心">
          <p>查看最新作业与班级通知。</p>
          <Link className="button secondary" href="/notifications" style={{ marginTop: 12 }}>
            查看通知
          </Link>
        </Card>
      </div>

      <Card title="学习报告">
        <p>查看本周学习进度与薄弱点。</p>
        <Link className="button secondary" href="/report" style={{ marginTop: 12 }}>
          查看报告
        </Link>
      </Card>

      <Card title="成长档案">
        <p>沉淀学习路径与掌握度变化。</p>
        <Link className="button secondary" href="/student/growth" style={{ marginTop: 12 }}>
          查看档案
        </Link>
      </Card>

      <Card title="学生资料">
        <p>设置年级、学科与学习目标。</p>
        <Link className="button secondary" href="/student/profile" style={{ marginTop: 12 }}>
          进入设置
        </Link>
      </Card>
    </div>
  );
}
