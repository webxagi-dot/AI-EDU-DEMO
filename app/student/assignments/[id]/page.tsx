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
    submissionType?: "quiz" | "upload";
    maxUploads?: number;
    gradingFocus?: string;
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

type UploadItem = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  contentBase64?: string;
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
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
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
    if (payload?.assignment?.submissionType === "upload") {
      loadUploads();
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function loadUploads() {
    const res = await fetch(`/api/student/assignments/${params.id}/uploads`);
    const payload = await res.json();
    if (res.ok) {
      setUploads(payload.data ?? []);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;
    setUploading(true);
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const res = await fetch(`/api/student/assignments/${params.id}/uploads`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const payload = await res.json();
      setError(payload?.error ?? "上传失败");
    } else {
      await loadUploads();
    }
    setUploading(false);
    event.target.value = "";
  }

  async function handleDeleteUpload(uploadId: string) {
    await fetch(`/api/student/assignments/${params.id}/uploads?uploadId=${uploadId}`, { method: "DELETE" });
    loadUploads();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/assignments/${params.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, submissionText })
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
  const isUpload = data.assignment.submissionType === "upload";

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
            {data.progress?.status === "completed" ? (
              <div className="pill-list">
                <span className="pill">
                  得分 {data.progress?.score ?? 0}/{data.progress?.total ?? 0}
                </span>
                <span className="pill">{isUpload ? "上传作业" : "在线作答"}</span>
              </div>
            ) : (
              <div className="pill-list">
                <span className="pill">等待提交</span>
                <span className="pill">{isUpload ? "上传作业" : "在线作答"}</span>
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
          isUpload ? (
            <div className="grid" style={{ gap: 10 }}>
              <p>已提交作业，等待老师批改。</p>
              {uploads.length ? (
                uploads.map((item) => (
                  <div className="card" key={item.id}>
                    <div className="section-title">{item.fileName}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                      {Math.round(item.size / 1024)} KB · {new Date(item.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                ))
              ) : (
                <p>暂无上传记录。</p>
              )}
            </div>
          ) : (
            <p>已提交作业，如需再次练习可联系老师重新布置。</p>
          )
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            {isUpload ? (
              <div className="grid" style={{ gap: 12 }}>
                <div className="card">
                  <div className="section-title">上传作业</div>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                    支持图片或 PDF，最多 {data.assignment.maxUploads ?? 3} 份，每份不超过 3MB。
                  </div>
                  <input type="file" multiple onChange={handleUpload} disabled={uploading} />
                  {uploads.length ? (
                    <div className="grid" style={{ gap: 8, marginTop: 10 }}>
                      {uploads.map((item) => (
                        <div className="card" key={item.id}>
                          <div className="section-title">{item.fileName}</div>
                          <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                            {Math.round(item.size / 1024)} KB · {new Date(item.createdAt).toLocaleString("zh-CN")}
                          </div>
                          <div className="cta-row" style={{ marginTop: 8 }}>
                            <button
                              className="button secondary"
                              type="button"
                              onClick={() => handleDeleteUpload(item.id)}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ marginTop: 8 }}>尚未上传任何作业。</p>
                  )}
                </div>
                <label>
                  <div className="section-title">作业备注（可选）</div>
                  <textarea
                    value={submissionText}
                    onChange={(event) => setSubmissionText(event.target.value)}
                    rows={3}
                    placeholder="写下本次作业的思路或遇到的问题"
                    style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                  />
                </label>
              </div>
            ) : (
              data.questions.map((question, index) => (
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
              ))
            )}
            {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
            {isUpload && uploads.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>请先上传作业文件。</div>
            ) : null}
            <button
              className="button primary"
              type="submit"
              disabled={loading || (isUpload && uploads.length === 0)}
            >
              {loading ? "提交中..." : "提交作业"}
            </button>
          </form>
        )}
      </Card>

      {result && !isUpload ? (
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

      {result && isUpload ? (
        <Card title="提交结果" tag="已提交">
          <p>作业已提交，等待老师批改。</p>
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

      {review?.aiReview ? (
        <Card title="AI 批改建议" tag="AI">
          <div className="card">
            <div className="section-title">评分</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{review.aiReview.result?.score ?? 0} 分</div>
            <p style={{ marginTop: 8 }}>{review.aiReview.result?.summary ?? "暂无总结。"}</p>
          </div>
          {review.aiReview.result?.strengths?.length ? (
            <div className="grid" style={{ gap: 6, marginTop: 12 }}>
              <div className="badge">优点</div>
              {review.aiReview.result.strengths.map((item: string) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          ) : null}
          {review.aiReview.result?.issues?.length ? (
            <div className="grid" style={{ gap: 6, marginTop: 12 }}>
              <div className="badge">问题</div>
              {review.aiReview.result.issues.map((item: string) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          ) : null}
          {review.aiReview.result?.suggestions?.length ? (
            <div className="grid" style={{ gap: 6, marginTop: 12 }}>
              <div className="badge">建议</div>
              {review.aiReview.result.suggestions.map((item: string) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          ) : null}
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
