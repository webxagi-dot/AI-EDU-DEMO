"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";

type WritingFeedback = {
  scores: { structure: number; grammar: number; vocab: number };
  summary: string;
  strengths: string[];
  improvements: string[];
  corrected?: string;
};

type WritingSubmission = {
  id: string;
  subject: string;
  grade: string;
  title?: string;
  content: string;
  feedback: WritingFeedback;
  createdAt: string;
};

export default function WritingPage() {
  const [subject, setSubject] = useState("chinese");
  const [grade, setGrade] = useState("4");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<WritingSubmission | null>(null);
  const [history, setHistory] = useState<WritingSubmission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/writing/history")
      .then((res) => res.json())
      .then((data) => setHistory(data.data ?? []));
  }, []);

  async function handleSubmit() {
    if (!content.trim()) return;
    setLoading(true);
    const res = await fetch("/api/writing/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, grade, title, content })
    });
    const data = await res.json();
    if (res.ok && data?.data) {
      setResult(data.data);
      setHistory((prev) => [data.data, ...prev]);
      setContent("");
    }
    setLoading(false);
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="作文 / 英语写作批改">
        <div className="grid grid-3">
          <label>
            <div className="section-title">学科</div>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="chinese">语文</option>
              <option value="english">英语</option>
            </select>
          </label>
          <label>
            <div className="section-title">年级</div>
            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="1">一年级</option>
              <option value="2">二年级</option>
              <option value="3">三年级</option>
              <option value="4">四年级</option>
              <option value="5">五年级</option>
              <option value="6">六年级</option>
            </select>
          </label>
          <label>
            <div className="section-title">题目/题干</div>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：难忘的一天"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
        </div>
        <label style={{ marginTop: 12 }}>
          <div className="section-title">写作内容</div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={6}
            placeholder="请粘贴或输入你的作文/英文写作内容"
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
          />
        </label>
        <button className="button primary" style={{ marginTop: 12 }} onClick={handleSubmit}>
          {loading ? "批改中..." : "提交批改"}
        </button>
      </Card>

      {result ? (
        <Card title="批改结果">
          <div className="grid grid-3">
            <div className="card">
              <div className="section-title">结构</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{result.feedback.scores.structure} 分</div>
            </div>
            <div className="card">
              <div className="section-title">语法</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{result.feedback.scores.grammar} 分</div>
            </div>
            <div className="card">
              <div className="section-title">词汇</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{result.feedback.scores.vocab} 分</div>
            </div>
          </div>
          <p style={{ marginTop: 10 }}>{result.feedback.summary}</p>
          <div className="grid" style={{ gap: 6, marginTop: 12 }}>
            <div className="badge">优点</div>
            {result.feedback.strengths.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
          <div className="grid" style={{ gap: 6, marginTop: 12 }}>
            <div className="badge">改进建议</div>
            {result.feedback.improvements.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
          {result.feedback.corrected ? (
            <div className="grid" style={{ gap: 6, marginTop: 12 }}>
              <div className="badge">润色示例</div>
              <p>{result.feedback.corrected}</p>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card title="历史批改">
        <div className="grid" style={{ gap: 10 }}>
          {history.length === 0 ? <p>暂无历史记录。</p> : null}
          {history.slice(0, 6).map((item) => (
            <div className="card" key={item.id}>
              <div className="section-title">
                {item.title ? item.title : "未命名写作"} · {item.subject === "english" ? "英语" : "语文"}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                {new Date(item.createdAt).toLocaleString("zh-CN")}
              </div>
              <p style={{ marginTop: 8 }}>{item.content.slice(0, 120)}...</p>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                结构 {item.feedback.scores.structure} / 语法 {item.feedback.scores.grammar} / 词汇{" "}
                {item.feedback.scores.vocab}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
