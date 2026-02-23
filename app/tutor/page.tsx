"use client";

import { useState } from "react";
import Card from "@/components/Card";

export default function TutorPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    if (!question) return;
    setLoading(true);
    const res = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, subject: "math", grade: "4" })
    });
    const data = await res.json();
    setAnswer(data);
    setLoading(false);
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="AI 辅导">
        <label>
          <div className="section-title">输入你的问题</div>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
            placeholder="例如：分数 3/4 表示什么意思？"
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
          />
        </label>
        <button className="button primary" style={{ marginTop: 12 }} onClick={handleAsk}>
          {loading ? "思考中..." : "提问"}
        </button>
      </Card>

      {answer ? (
        <Card title="AI 讲解">
          <p>{answer.answer}</p>
          {answer.provider ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-1)" }}>
              模型来源：{answer.provider}
            </div>
          ) : null}
          <div className="grid" style={{ gap: 6, marginTop: 12 }}>
            <div className="badge">步骤</div>
            {answer.steps?.map((step: string) => (
              <div key={step}>{step}</div>
            ))}
          </div>
          <div className="grid" style={{ gap: 6, marginTop: 12 }}>
            <div className="badge">提示</div>
            {answer.hints?.map((hint: string) => (
              <div key={hint}>{hint}</div>
            ))}
          </div>
          {answer.source?.length ? (
            <div className="grid" style={{ gap: 6, marginTop: 12 }}>
              <div className="badge">参考来源</div>
              {answer.source.map((item: string) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
