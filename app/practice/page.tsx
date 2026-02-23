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
  const [mode, setMode] = useState<"normal" | "challenge" | "timed" | "wrong">("normal");
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ correct: boolean; explanation: string; answer: string } | null>(null);
  const [challengeCount, setChallengeCount] = useState(0);
  const [challengeCorrect, setChallengeCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/knowledge-points")
      .then((res) => res.json())
      .then((data) => setKnowledgePoints(data.data ?? []));
  }, []);

  async function loadQuestion() {
    if (mode === "timed" && timeLeft === 0) {
      setTimeLeft(60);
      setTimerRunning(true);
    }
    const res = await fetch("/api/practice/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, grade, knowledgePointId, mode })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "暂无题目");
      setQuestion(null);
      return;
    }
    setError(null);
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
    if (mode === "challenge") {
      setChallengeCount((prev) => prev + 1);
      setChallengeCorrect((prev) => prev + (data.correct ? 1 : 0));
    }
  }

  const filtered = knowledgePoints.filter((kp) => kp.subject === subject && kp.grade === grade);

  useEffect(() => {
    if (!timerRunning) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timerRunning]);

  function resetChallenge() {
    setChallengeCount(0);
    setChallengeCorrect(0);
  }

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
            <div className="section-title">模式</div>
            <select
              value={mode}
              onChange={(event) => {
                const next = event.target.value as "normal" | "challenge" | "timed" | "wrong";
                setMode(next);
                setResult(null);
                setQuestion(null);
                setAnswer("");
                setTimeLeft(0);
                setTimerRunning(false);
                resetChallenge();
              }}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="normal">普通练习</option>
              <option value="challenge">闯关模式</option>
              <option value="timed">限时模式</option>
              <option value="wrong">错题专练</option>
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
          {mode === "timed" ? "开始限时" : "获取题目"}
        </button>
        {error ? <div style={{ marginTop: 8, color: "#b42318", fontSize: 13 }}>{error}</div> : null}
        {mode === "timed" ? (
          <div style={{ marginTop: 8, fontSize: 13, color: "var(--ink-1)" }}>
            剩余时间：{timeLeft}s
          </div>
        ) : null}
        {mode === "challenge" ? (
          <div style={{ marginTop: 8, fontSize: 13, color: "var(--ink-1)" }}>
            闯关进度：{challengeCount}/5，正确 {challengeCorrect}
          </div>
        ) : null}
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
            <button className="button primary" onClick={submitAnswer} disabled={!answer || (mode === "timed" && timeLeft === 0)}>
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

      {mode === "challenge" && challengeCount >= 5 ? (
        <Card title="闯关结果">
          <p>本次闯关正确 {challengeCorrect} / 5</p>
          <button className="button secondary" onClick={resetChallenge}>
            再来一次
          </button>
        </Card>
      ) : null}
    </div>
  );
}
