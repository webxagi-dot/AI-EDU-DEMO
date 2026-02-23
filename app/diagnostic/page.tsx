"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";

type Question = {
  id: string;
  stem: string;
  options: string[];
  knowledgePointId: string;
};

export default function DiagnosticPage() {
  const [subject, setSubject] = useState("math");
  const [grade, setGrade] = useState("4");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ total: number; correct: number; accuracy: number } | null>(null);

  async function startDiagnostic() {
    const res = await fetch("/api/diagnostic/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, grade })
    });
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setIndex(0);
    setAnswers({});
    setResult(null);
  }

  async function submitDiagnostic() {
    const payload = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
    const res = await fetch("/api/diagnostic/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, grade, answers: payload })
    });
    const data = await res.json();
    setResult({ total: data.total, correct: data.correct, accuracy: data.accuracy });
  }

  const current = questions[index];

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="诊断测评">
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <label>
            <div className="section-title">学科</div>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="math">数学</option>
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
        </div>
        <button className="button primary" style={{ marginTop: 12 }} onClick={startDiagnostic}>
          开始诊断
        </button>
      </Card>

      {current ? (
        <Card title={`第 ${index + 1} 题`}> 
          <p>{current.stem}</p>
          <div className="grid" style={{ gap: 8, marginTop: 12 }}>
            {current.options.map((option) => (
              <label className="card" key={option} style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name={current.id}
                  value={option}
                  checked={answers[current.id] === option}
                  onChange={() => setAnswers((prev) => ({ ...prev, [current.id]: option }))}
                  style={{ marginRight: 8 }}
                />
                {option}
              </label>
            ))}
          </div>
          <div className="cta-row">
            <button
              className="button secondary"
              disabled={index === 0}
              onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
            >
              上一题
            </button>
            {index < questions.length - 1 ? (
              <button className="button primary" onClick={() => setIndex((prev) => prev + 1)}>
                下一题
              </button>
            ) : (
              <button className="button primary" onClick={submitDiagnostic}>
                提交诊断
              </button>
            )}
          </div>
        </Card>
      ) : null}

      {result ? (
        <Card title="诊断结果">
          <p>
            正确 {result.correct} / {result.total}，正确率 {result.accuracy}%。
          </p>
          <Link className="button secondary" href="/plan" style={{ marginTop: 12 }}>
            查看学习计划
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
