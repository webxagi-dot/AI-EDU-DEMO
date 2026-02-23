"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";

type AssignmentItem = {
  id: string;
  title: string;
  dueDate: string;
  className: string;
  classSubject: string;
  classGrade: string;
  status: string;
  score: number | null;
  total: number | null;
  completedAt: string | null;
};

const subjectLabel: Record<string, string> = {
  math: "数学",
  chinese: "语文",
  english: "英语"
};

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/student/assignments");
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "加载失败");
      return;
    }
    setAssignments(data.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return <Card title="作业中心">{error}</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="作业中心">
        {assignments.length === 0 ? (
          <p>暂无作业。</p>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {assignments.map((item) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                <p>
                  {item.className} · {subjectLabel[item.classSubject] ?? item.classSubject} · {item.classGrade} 年级
                </p>
                <p>截止日期：{new Date(item.dueDate).toLocaleDateString("zh-CN")}</p>
                <p>状态：{item.status === "completed" ? "已完成" : "待完成"}</p>
                {item.status === "completed" ? (
                  <p>
                    得分：{item.score ?? 0}/{item.total ?? 0}
                  </p>
                ) : null}
                <Link className="button secondary" href={`/student/assignments/${item.id}`} style={{ marginTop: 8 }}>
                  {item.status === "completed" ? "查看详情" : "开始作业"}
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
