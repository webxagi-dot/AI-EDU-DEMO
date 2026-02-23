"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";

type Question = {
  id: string;
  stem: string;
  options: string[];
  knowledgePointId: string;
};

type KnowledgePoint = {
  id: string;
  subject: string;
  grade: string;
  title: string;
};

export default function PracticePage() {
  const [subject, setSubject] = useState("math");
  const [grade, setGrade] = useState("4");
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [knowledgePointId, setKnowledgePointId] = useState<string | undefined>(undefined);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ correct: boolean; explanation: string; answer: string } | null>(null);

  useEffect(() => {
    fetch("/api/knowledge-points")
      .then((res) => res.json())
      .then((data) => setKnowledgePoints(data.data ?? []));
  }, []);

  async function loadQuestion() {
    const res = await fetch("/api/practice/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, grade, knowledgePointId })
    });
    const data = await res.json();
    setQuestion(data.question ?? null);
    setAnswer("");
    setResult(null);
  }

  async function submitAnswer() {
    if (!question) return;
    const res = await fetch("/api/practice/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, answer })
    });
    const data = await res.json();
    setResult({ correct: data.correct, explanation: data.explanation, answer: data.answer });
  }

  const filtered = knowledgePoints.filter((kp) => kp.subject === subject && kp.grade === grade);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="练习设置">
        <div className="grid grid-3" style={{ marginTop: 12 }}>
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
          <label>
            <div className="section-title">知识点</div>
            <select
              value={knowledgePointId}
              onChange={(event) => setKnowledgePointId(event.target.value || undefined)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="">全部</option>
              {filtered.map((kp) => (
                <option value={kp.id} key={kp.id}>
                  {kp.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="button primary" style={{ marginTop: 12 }} onClick={loadQuestion}>
          获取题目
        </button>
      </Card>

      {question ? (
        <Card title="题目">
          <p>{question.stem}</p>
          <div className="grid" style={{ gap: 8, marginTop: 12 }}>
            {question.options.map((option) => (
              <label className="card" key={option} style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name={question.id}
                  checked={answer === option}
                  onChange={() => setAnswer(option)}
                  style={{ marginRight: 8 }}
                />
                {option}
              </label>
            ))}
          </div>
          <div className="cta-row">
            <button className="button secondary" onClick={loadQuestion}>
              换一题
            </button>
            <button className="button primary" onClick={submitAnswer} disabled={!answer}>
              提交答案
            </button>
          </div>
        </Card>
      ) : null}

      {result ? (
        <Card title="解析">
          <div className="badge">{result.correct ? "回答正确" : "回答错误"}</div>
          <p style={{ marginTop: 8 }}>正确答案：{result.answer}</p>
          <p>{result.explanation}</p>
        </Card>
      ) : null}
    </div>
  );
}
