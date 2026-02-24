"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";

type AssignmentDetail = {
  assignment: {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    createdAt: string;
  };
  class: {
    id: string;
    name: string;
    subject: string;
    grade: string;
  };
  students: Array<{
    id: string;
    name: string;
    email: string;
    grade?: string;
    status: string;
    score: number | null;
    total: number | null;
    completedAt: string | null;
  }>;
};

const subjectLabel: Record<string, string> = {
  math: "数学",
  chinese: "语文",
  english: "英语"
};

export default function TeacherAssignmentDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<AssignmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch(`/api/teacher/assignments/${params.id}`);
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "加载失败");
      return;
    }
    setData(payload);
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <Card title="作业详情">
        <p>{error}</p>
        <Link className="button secondary" href="/teacher" style={{ marginTop: 12 }}>
          返回教师端
        </Link>
      </Card>
    );
  }

  if (!data) {
    return <Card title="作业详情">加载中...</Card>;
  }

  const completedCount = data.students.filter((item) => item.status === "completed").length;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>作业详情</h2>
          <div className="section-sub">
            {data.class.name} · {subjectLabel[data.class.subject] ?? data.class.subject} · {data.class.grade} 年级
          </div>
        </div>
        <span className="chip">已完成 {completedCount}/{data.students.length}</span>
      </div>

      <Card title="作业概览" tag="概览">
        <div className="grid grid-2">
          <div className="card feature-card">
            <EduIcon name="board" />
            <div className="section-title">{data.assignment.title}</div>
            <p>{data.assignment.description || "暂无作业说明。"}</p>
          </div>
          <div className="card feature-card">
            <EduIcon name="chart" />
            <div className="section-title">截止日期</div>
            <p>{new Date(data.assignment.dueDate).toLocaleDateString("zh-CN")}</p>
            <div className="pill-list">
              <span className="pill">已完成 {completedCount}</span>
              <span className="pill">待完成 {data.students.length - completedCount}</span>
            </div>
          </div>
        </div>
        <Link className="button ghost" href="/teacher" style={{ marginTop: 12 }}>
          返回教师端
        </Link>
      </Card>

      <Card title="学生完成情况" tag="班级">
        {data.students.length === 0 ? (
          <p>暂无学生。</p>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {data.students.map((student) => (
              <div className="card" key={student.id}>
                <div className="card-header">
                  <div className="section-title">{student.name}</div>
                  <span className="card-tag">{student.status === "completed" ? "已完成" : "待完成"}</span>
                </div>
                <div className="section-sub">{student.email}</div>
                {student.status === "completed" ? (
                  <div className="pill-list" style={{ marginTop: 10 }}>
                    <span className="pill">
                      得分 {student.score ?? 0}/{student.total ?? 0}
                    </span>
                    <span className="pill">
                      完成时间 {student.completedAt ? new Date(student.completedAt).toLocaleDateString("zh-CN") : "-"}
                    </span>
                  </div>
                ) : (
                  <div className="pill-list" style={{ marginTop: 10 }}>
                    <span className="pill">未提交</span>
                  </div>
                )}
                <Link
                  className="button secondary"
                  href={`/teacher/assignments/${data.assignment.id}/reviews/${student.id}`}
                  style={{ marginTop: 8 }}
                >
                  批改/复盘
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
