"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";

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
      <Card title="作业信息">
        <div className="section-title">{data.assignment.title}</div>
        <p>
          {data.class.name} · {subjectLabel[data.class.subject] ?? data.class.subject} · {data.class.grade} 年级
        </p>
        <p>截止日期：{new Date(data.assignment.dueDate).toLocaleDateString("zh-CN")}</p>
        {data.assignment.description ? <p>说明：{data.assignment.description}</p> : null}
        <Link className="button secondary" href="/student/assignments" style={{ marginTop: 12 }}>
          返回作业中心
        </Link>
      </Card>

      <Card title="作业作答">
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
        <Card title="提交结果">
          <p>
            得分：{result.score}/{result.total}
          </p>
          <div className="grid" style={{ gap: 12, marginTop: 12 }}>
            {result.details.map((detail) => {
              const question = data.questions.find((item) => item.id === detail.questionId);
              return (
                <div className="card" key={detail.questionId}>
                  <div className="section-title">{question?.stem ?? "题目"}</div>
                  <p>你的答案：{detail.answer || "未作答"}</p>
                  <p>正确答案：{detail.correctAnswer}</p>
                  <p>结果：{detail.correct ? "正确" : "错误"}</p>
                  <p>解析：{detail.explanation}</p>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {review?.review ? (
        <Card title="老师点评">
          <p>{review.review.overallComment || "暂无总体点评"}</p>
          <div className="grid" style={{ gap: 12, marginTop: 12 }}>
            {(review.reviewItems ?? []).map((item: any) => {
              const question = review.questions?.find((q: any) => q.id === item.questionId);
              return (
                <div className="card" key={item.questionId}>
                  <div className="section-title">{question?.stem ?? "题目"}</div>
                  <p>错因标签：{item.wrongTag || "未标注"}</p>
                  <p>点评：{item.comment || "暂无"}</p>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {review?.questions ? (
        <Card title="错题复盘">
          <div className="grid" style={{ gap: 12 }}>
            {review.questions
              .filter((item: any) => !item.correct)
              .map((item: any) => (
                <div className="card" key={item.id}>
                  <div className="section-title">{item.stem}</div>
                  <p>你的答案：{item.answer || "未作答"}</p>
                  <p>正确答案：{item.correctAnswer}</p>
                  <p>解析：{item.explanation}</p>
                </div>
              ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
