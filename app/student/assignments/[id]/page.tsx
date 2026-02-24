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
  questions: Array<{
    id: string;
    stem: string;
    options: string[];
  }>;
  progress?: {
    status: string;
    score?: number;
    total?: number;
  } | null;
};

type SubmitResult = {
  score: number;
  total: number;
  details: Array<{
    questionId: string;
    correct: boolean;
    answer: string;
    correctAnswer: string;
    explanation: string;
  }>;
};

const subjectLabel: Record<string, string> = {
  math: "数学",
  chinese: "语文",
  english: "英语"
};

export default function StudentAssignmentDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<AssignmentDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch(`/api/student/assignments/${params.id}`);
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "加载失败");
      return;
    }
    setData(payload);
    if (payload?.progress?.status === "completed") {
      const reviewRes = await fetch(`/api/student/assignments/${params.id}/review`);
      const reviewPayload = await reviewRes.json();
      if (reviewRes.ok) {
        setReview(reviewPayload);
      }
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/assignments/${params.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error ?? "提交失败");
      }
      setResult(payload);
      const reviewRes = await fetch(`/api/student/assignments/${params.id}/review`);
      const reviewPayload = await reviewRes.json();
      if (reviewRes.ok) {
        setReview(reviewPayload);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <Card title="作业详情">
        <p>{error}</p>
        <Link className="button secondary" href="/student/assignments" style={{ marginTop: 12 }}>
          返回作业中心
        </Link>
      </Card>
    );
  }

  if (!data) {
    return <Card title="作业详情">加载中...</Card>;
  }

  const alreadyCompleted = data.progress?.status === "completed" && !result;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>作业详情</h2>
          <div className="section-sub">
            {data.class.name} · {subjectLabel[data.class.subject] ?? data.class.subject} · {data.class.grade} 年级
          </div>
        </div>
        <span className="chip">{alreadyCompleted ? "已完成" : "进行中"}</span>
      </div>

      <Card title="作业信息" tag="概览">
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
            {data.progress?.status === "completed" ? (
              <div className="pill-list">
                <span className="pill">
                  得分 {data.progress?.score ?? 0}/{data.progress?.total ?? 0}
                </span>
              </div>
            ) : (
              <div className="pill-list">
                <span className="pill">等待提交</span>
              </div>
            )}
          </div>
        </div>
        <Link className="button ghost" href="/student/assignments" style={{ marginTop: 12 }}>
          返回作业中心
        </Link>
      </Card>

      <Card title="作业作答" tag="作答">
        {alreadyCompleted ? (
          <p>已提交作业，如需再次练习可联系老师重新布置。</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            {data.questions.map((question, index) => (
              <div className="card" key={question.id}>
                <div className="section-title">
                  {index + 1}. {question.stem}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {question.options.map((option) => (
                    <label key={option} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={(event) =>
                          setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))
                        }
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "提交中..." : "提交作业"}
            </button>
          </form>
        )}
      </Card>

      {result ? (
        <Card title="提交结果" tag="成绩">
          <div className="pill-list">
            <span className="pill">
              得分 {result.score}/{result.total}
            </span>
          </div>
          <div className="grid" style={{ gap: 12, marginTop: 12 }}>
            {result.details.map((detail) => {
              const question = data.questions.find((item) => item.id === detail.questionId);
              return (
                <div className="card" key={detail.questionId}>
                  <div className="section-title">{question?.stem ?? "题目"}</div>
                  <div className="pill-list" style={{ marginTop: 8 }}>
                    <span className="pill">你的答案：{detail.answer || "未作答"}</span>
                    <span className="pill">正确答案：{detail.correctAnswer}</span>
                    <span className="pill">{detail.correct ? "回答正确" : "回答错误"}</span>
                  </div>
                  <p style={{ marginTop: 8 }}>解析：{detail.explanation}</p>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {review?.review ? (
        <Card title="老师点评" tag="点评">
          <p>{review.review.overallComment || "暂无总体点评"}</p>
          <div className="grid" style={{ gap: 12, marginTop: 12 }}>
            {(review.reviewItems ?? []).map((item: any) => {
              const question = review.questions?.find((q: any) => q.id === item.questionId);
              return (
                <div className="card" key={item.questionId}>
                  <div className="section-title">{question?.stem ?? "题目"}</div>
                  <div className="pill-list" style={{ marginTop: 8 }}>
                    <span className="pill">错因标签：{item.wrongTag || "未标注"}</span>
                  </div>
                  <p style={{ marginTop: 8 }}>点评：{item.comment || "暂无"}</p>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {review?.questions ? (
        <Card title="错题复盘" tag="复盘">
          <div className="grid" style={{ gap: 12 }}>
            {review.questions
              .filter((item: any) => !item.correct)
              .map((item: any) => (
                <div className="card" key={item.id}>
                  <div className="section-title">{item.stem}</div>
                  <div className="pill-list" style={{ marginTop: 8 }}>
                    <span className="pill">你的答案：{item.answer || "未作答"}</span>
                    <span className="pill">正确答案：{item.correctAnswer}</span>
                  </div>
                  <p style={{ marginTop: 8 }}>解析：{item.explanation}</p>
                </div>
              ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
