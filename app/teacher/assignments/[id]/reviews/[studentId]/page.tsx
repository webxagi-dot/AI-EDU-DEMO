"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";

type ReviewPayload = {
  assignment: { id: string; title: string; dueDate: string };
  class: { id: string; name: string; subject: string; grade: string };
  student: { id: string; name: string; email: string };
  submission?: { answers: Record<string, string>; score: number; total: number } | null;
  questions: Array<{
    id: string;
    stem: string;
    options: string[];
    answer: string;
    correctAnswer: string;
    explanation: string;
    correct: boolean;
  }>;
  review: { overallComment?: string } | null;
  reviewItems: Array<{ questionId: string; wrongTag?: string; comment?: string }>;
};

const tags = ["审题错误", "计算错误", "概念混淆", "步骤遗漏", "粗心", "其他"];

export default function TeacherAssignmentReviewPage({
  params
}: {
  params: { id: string; studentId: string };
}) {
  const [data, setData] = useState<ReviewPayload | null>(null);
  const [overallComment, setOverallComment] = useState("");
  const [itemState, setItemState] = useState<Record<string, { wrongTag: string; comment: string }>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch(`/api/teacher/assignments/${params.id}/reviews/${params.studentId}`);
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "加载失败");
      return;
    }
    setData(payload);
    setOverallComment(payload.review?.overallComment ?? "");
    const nextState: Record<string, { wrongTag: string; comment: string }> = {};
    payload.reviewItems?.forEach((item: any) => {
      nextState[item.questionId] = { wrongTag: item.wrongTag ?? "", comment: item.comment ?? "" };
    });
    setItemState(nextState);
  }

  useEffect(() => {
    load();
  }, []);

  const wrongQuestions = useMemo(
    () => (data?.questions ?? []).filter((item) => !item.correct),
    [data]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const items = wrongQuestions.map((question) => ({
      questionId: question.id,
      wrongTag: itemState[question.id]?.wrongTag || "",
      comment: itemState[question.id]?.comment || ""
    }));
    const res = await fetch(`/api/teacher/assignments/${params.id}/reviews/${params.studentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overallComment, items })
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "保存失败");
      setSaving(false);
      return;
    }
    setMessage("批改已保存并通知学生。");
    setSaving(false);
  }

  if (error) {
    return (
      <Card title="作业批改">
        <p>{error}</p>
        <Link className="button secondary" href={`/teacher/assignments/${params.id}`} style={{ marginTop: 12 }}>
          返回作业详情
        </Link>
      </Card>
    );
  }

  if (!data) {
    return <Card title="作业批改">加载中...</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>作业批改</h2>
          <div className="section-sub">
            {data.class.name} · {data.class.subject} · {data.class.grade} 年级
          </div>
        </div>
        <span className="chip">学生：{data.student.name}</span>
      </div>

      <Card title="作业概览" tag="概览">
        <div className="grid grid-2">
          <div className="card feature-card">
            <EduIcon name="board" />
            <div className="section-title">{data.assignment.title}</div>
            <p>截止日期：{new Date(data.assignment.dueDate).toLocaleDateString("zh-CN")}</p>
          </div>
          <div className="card feature-card">
            <EduIcon name="chart" />
            <div className="section-title">作业成绩</div>
            <p>
              得分：{data.submission?.score ?? 0}/{data.submission?.total ?? 0}
            </p>
            <div className="pill-list">
              <span className="pill">错题 {wrongQuestions.length} 题</span>
            </div>
          </div>
        </div>
        <Link className="button ghost" href={`/teacher/assignments/${params.id}`} style={{ marginTop: 12 }}>
          返回作业详情
        </Link>
      </Card>

      <Card title="错题复盘" tag="批改">
        {wrongQuestions.length === 0 ? (
          <p>该学生全部答对，无需批改。</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            {wrongQuestions.map((question, index) => (
              <div className="card" key={question.id}>
                <div className="section-title">
                  {index + 1}. {question.stem}
                </div>
                <div className="pill-list" style={{ marginTop: 8 }}>
                  <span className="pill">学生答案：{question.answer || "未作答"}</span>
                  <span className="pill">正确答案：{question.correctAnswer}</span>
                </div>
                <p style={{ marginTop: 8 }}>解析：{question.explanation}</p>
                <label>
                  <div className="section-title">错因标签</div>
                  <select
                    value={itemState[question.id]?.wrongTag ?? ""}
                    onChange={(event) =>
                      setItemState((prev) => ({
                        ...prev,
                        [question.id]: { wrongTag: event.target.value, comment: prev[question.id]?.comment ?? "" }
                      }))
                    }
                    style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                  >
                    <option value="">请选择</option>
                    {tags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <div className="section-title">点评</div>
                  <textarea
                    value={itemState[question.id]?.comment ?? ""}
                    onChange={(event) =>
                      setItemState((prev) => ({
                        ...prev,
                        [question.id]: { wrongTag: prev[question.id]?.wrongTag ?? "", comment: event.target.value }
                      }))
                    }
                    rows={3}
                    style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                  />
                </label>
              </div>
            ))}
            <label>
              <div className="section-title">总体点评</div>
              <textarea
                value={overallComment}
                onChange={(event) => setOverallComment(event.target.value)}
                rows={3}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            {message ? <div style={{ color: "#1a7f37", fontSize: 13 }}>{message}</div> : null}
            {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
            <button className="button primary" type="submit" disabled={saving}>
              {saving ? "保存中..." : "保存批改"}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
