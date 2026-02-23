"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";

type PlanItem = {
  knowledgePointId: string;
  targetCount: number;
  dueDate: string;
};

export default function StudentPage() {
  const [plan, setPlan] = useState<PlanItem[]>([]);

  useEffect(() => {
    fetch("/api/plan?subject=math")
      .then((res) => res.json())
      .then((data) => setPlan(data.data?.items ?? []));
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
                知识点练习 {item.targetCount} 题，截止 {new Date(item.dueDate).toLocaleDateString("zh-CN")}
              </li>
            ))}
          </ul>
        )}
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
    </div>
  );
}
