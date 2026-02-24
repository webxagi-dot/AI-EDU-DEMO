"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { ASSIGNMENT_TYPE_LABELS, SUBJECT_LABELS } from "@/lib/constants";

type AssignmentDetail = {
  assignment: {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    createdAt: string;
    submissionType?: "quiz" | "upload" | "essay";
    gradingFocus?: string;
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

export default function TeacherAssignmentDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<AssignmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<"missing" | "low_score" | "all">("missing");
  const [threshold, setThreshold] = useState(60);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/teacher/assignments/${params.id}`);
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "加载失败");
      return;
    }
    setData(payload);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

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
            {data.class.name} · {SUBJECT_LABELS[data.class.subject] ?? data.class.subject} · {data.class.grade} 年级
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
            {data.assignment.gradingFocus ? (
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>
                批改重点：{data.assignment.gradingFocus}
              </div>
            ) : null}
          </div>
          <div className="card feature-card">
            <EduIcon name="chart" />
            <div className="section-title">截止日期</div>
            <p>{new Date(data.assignment.dueDate).toLocaleDateString("zh-CN")}</p>
            <div className="pill-list">
              <span className="pill">已完成 {completedCount}</span>
              <span className="pill">待完成 {data.students.length - completedCount}</span>
              <span className="pill">
                {ASSIGNMENT_TYPE_LABELS[data.assignment.submissionType ?? "quiz"]}
              </span>
            </div>
          </div>
        </div>
        <Link className="button ghost" href="/teacher" style={{ marginTop: 12 }}>
          返回教师端
        </Link>
      </Card>

      <Card title="提醒学生" tag="消息">
        <div className="feature-card">
          <EduIcon name="rocket" />
          <p>快速发送提醒给未完成或成绩偏低的学生与家长。</p>
        </div>
        <div className="grid" style={{ gap: 12 }}>
          <label>
            <div className="section-title">提醒对象</div>
            <select
              value={notifyTarget}
              onChange={(event) => setNotifyTarget(event.target.value as "missing" | "low_score" | "all")}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="missing">未提交作业</option>
              <option value="low_score">得分低于阈值</option>
              <option value="all">全部学生</option>
            </select>
          </label>
          {notifyTarget === "low_score" ? (
            <label>
              <div className="section-title">分数阈值（百分比）</div>
              <input
                type="number"
                min={0}
                max={100}
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
          ) : null}
          <label>
            <div className="section-title">提醒文案（可选）</div>
            <textarea
              value={notifyMessage}
              onChange={(event) => setNotifyMessage(event.target.value)}
              rows={3}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              placeholder="例如：作业即将到期，请尽快完成。"
            />
          </label>
        </div>
        {notifyResult ? <div style={{ marginTop: 8, fontSize: 12 }}>{notifyResult}</div> : null}
        <div className="cta-row" style={{ marginTop: 12 }}>
          <button
            className="button primary"
            type="button"
            disabled={notifyLoading}
            onClick={async () => {
              setNotifyLoading(true);
              setNotifyResult(null);
              const res = await fetch(`/api/teacher/assignments/${data.assignment.id}/notify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target: notifyTarget, threshold, message: notifyMessage })
              });
              const payload = await res.json();
              if (!res.ok) {
                setNotifyResult(payload?.error ?? "提醒失败");
              } else {
                setNotifyResult(`已通知学生 ${payload.data?.students ?? 0} 人，家长 ${payload.data?.parents ?? 0} 人。`);
              }
              setNotifyLoading(false);
            }}
          >
            {notifyLoading ? "发送中..." : "发送提醒"}
          </button>
        </div>
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
                    {data.assignment.submissionType === "quiz" ? (
                      <span className="pill">
                        得分 {student.score ?? 0}/{student.total ?? 0}
                      </span>
                    ) : (
                      <span className="pill">已提交待评分</span>
                    )}
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
