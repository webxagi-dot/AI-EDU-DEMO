"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { ASSIGNMENT_TYPE_LABELS, SUBJECT_LABELS } from "@/lib/constants";

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
  submissionType?: "quiz" | "upload" | "essay";
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
      <div className="section-head">
        <div>
          <h2>作业中心</h2>
          <div className="section-sub">查看作业进度与得分反馈。</div>
        </div>
        <span className="chip">共 {assignments.length} 份作业</span>
      </div>

      <Card title="作业列表" tag="作业">
        {assignments.length === 0 ? (
          <p>暂无作业。</p>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {assignments.map((item) => (
              <div className="card" key={item.id}>
                <div className="card-header">
                  <div className="section-title">{item.title}</div>
                  <span className="card-tag">{item.status === "completed" ? "已完成" : "待完成"}</span>
                </div>
                <div className="feature-card">
                  <EduIcon name="pencil" />
                  <p>
                    {item.className} · {SUBJECT_LABELS[item.classSubject] ?? item.classSubject} · {item.classGrade} 年级
                  </p>
                </div>
                <div className="pill-list" style={{ marginTop: 8 }}>
                  <span className="pill">截止 {new Date(item.dueDate).toLocaleDateString("zh-CN")}</span>
                  <span className="pill">{ASSIGNMENT_TYPE_LABELS[item.submissionType ?? "quiz"]}</span>
                  {item.status === "completed" ? (
                    item.submissionType && item.submissionType !== "quiz" ? (
                      <span className="pill">已提交待批改</span>
                    ) : (
                      <span className="pill">
                        得分 {item.score ?? 0}/{item.total ?? 0}
                      </span>
                    )
                  ) : (
                    <span className="pill">等待提交</span>
                  )}
                </div>
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
