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
  }, []);

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
      </div>

      <Card title="学习报告">
        <p>查看本周学习进度与薄弱点。</p>
        <Link className="button secondary" href="/report" style={{ marginTop: 12 }}>
          查看报告
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
