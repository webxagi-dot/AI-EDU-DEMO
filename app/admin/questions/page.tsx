"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";

type KnowledgePoint = {
  id: string;
  subject: string;
  grade: string;
  title: string;
  chapter: string;
};

type Question = {
  id: string;
  subject: string;
  grade: string;
  knowledgePointId: string;
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
};

export default function QuestionsAdminPage() {
  const [list, setList] = useState<Question[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    subject: "math",
    grade: "4",
    knowledgePointId: "",
    stem: "",
    options: "",
    answer: "",
    explanation: ""
  });

  async function load() {
    setLoading(true);
    const [qRes, kpRes] = await Promise.all([
      fetch("/api/admin/questions"),
      fetch("/api/admin/knowledge-points")
    ]);
    const qData = await qRes.json();
    const kpData = await kpRes.json();
    setList(qData.data ?? []);
    setKnowledgePoints(kpData.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (knowledgePoints.length && !form.knowledgePointId) {
      setForm((prev) => ({ ...prev, knowledgePointId: knowledgePoints[0].id }));
    }
  }, [knowledgePoints, form.knowledgePointId]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const options = form.options
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: form.subject,
        grade: form.grade,
        knowledgePointId: form.knowledgePointId,
        stem: form.stem,
        options,
        answer: form.answer,
        explanation: form.explanation
      })
    });

    setForm({
      subject: form.subject,
      grade: form.grade,
      knowledgePointId: form.knowledgePointId,
      stem: "",
      options: "",
      answer: "",
      explanation: ""
    });
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="新增题目">
        <form onSubmit={handleCreate} style={{ display: "grid", gap: 12 }}>
          <label>
            <div className="section-title">学科</div>
            <select
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="math">数学</option>
              <option value="chinese">语文</option>
              <option value="english">英语</option>
            </select>
          </label>
          <label>
            <div className="section-title">年级</div>
            <input
              value={form.grade}
              onChange={(event) => setForm({ ...form, grade: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">知识点</div>
            <select
              value={form.knowledgePointId}
              onChange={(event) => setForm({ ...form, knowledgePointId: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {knowledgePoints.map((kp) => (
                <option value={kp.id} key={kp.id}>
                  {kp.title} ({kp.grade}年级)
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="section-title">题干</div>
            <textarea
              value={form.stem}
              onChange={(event) => setForm({ ...form, stem: event.target.value })}
              rows={3}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">选项（每行一个）</div>
            <textarea
              value={form.options}
              onChange={(event) => setForm({ ...form, options: event.target.value })}
              rows={4}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">答案</div>
            <input
              value={form.answer}
              onChange={(event) => setForm({ ...form, answer: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">解析</div>
            <textarea
              value={form.explanation}
              onChange={(event) => setForm({ ...form, explanation: event.target.value })}
              rows={3}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <button className="button primary" type="submit">
            保存
          </button>
        </form>
      </Card>

      <Card title="题目列表">
        {loading ? <p>加载中...</p> : null}
        <div className="grid" style={{ gap: 8 }}>
          {list.map((item) => (
            <div className="card" key={item.id}>
              <div className="section-title">{item.stem}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                {item.subject} · {item.grade} 年级 · 选项 {item.options.length} 个
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <div className="badge">答案：{item.answer}</div>
                <button className="button secondary" onClick={() => handleDelete(item.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
