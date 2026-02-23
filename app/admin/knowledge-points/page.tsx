"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";

type KnowledgePoint = {
  id: string;
  subject: string;
  grade: string;
  title: string;
  chapter: string;
};

export default function KnowledgePointsAdminPage() {
  const [list, setList] = useState<KnowledgePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ subject: "math", grade: "4", title: "", chapter: "" });
  const [aiForm, setAiForm] = useState({ subject: "math", grade: "4", chapter: "", count: 5 });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiErrors, setAiErrors] = useState<string[]>([]);

  const chapterOptions = useMemo(() => {
    const filtered = list.filter((kp) => kp.subject === aiForm.subject && kp.grade === aiForm.grade);
    const chapters = filtered.map((kp) => kp.chapter).filter(Boolean);
    return Array.from(new Set(chapters));
  }, [list, aiForm.subject, aiForm.grade]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/knowledge-points");
    const data = await res.json();
    setList(data.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!aiForm.chapter && chapterOptions.length) {
      setAiForm((prev) => ({ ...prev, chapter: chapterOptions[0] }));
    }
  }, [aiForm.chapter, chapterOptions]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    await fetch("/api/admin/knowledge-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ ...form, title: "", chapter: "" });
    load();
  }

  async function handleAiGenerate(event: React.FormEvent) {
    event.preventDefault();
    setAiLoading(true);
    setAiMessage(null);
    setAiErrors([]);

    const res = await fetch("/api/admin/knowledge-points/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: aiForm.subject,
        grade: aiForm.grade,
        chapter: aiForm.chapter || undefined,
        count: aiForm.count
      })
    });

    const data = await res.json();
    if (!res.ok) {
      setAiErrors([data?.error ?? "生成失败"]);
      setAiLoading(false);
      return;
    }

    const skipped = data.skipped ?? [];
    if (skipped.length) {
      setAiErrors(skipped.map((item: any) => `第 ${item.index + 1} 条：${item.reason}`));
    }
    setAiMessage(`已生成 ${data.created?.length ?? 0} 条知识点。`);
    setAiLoading(false);
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/knowledge-points/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="AI 生成知识点">
        <p style={{ color: "var(--ink-1)", fontSize: 13 }}>
          需要配置 LLM（如智谱），系统会按学科/年级生成知识点。
        </p>
        <form onSubmit={handleAiGenerate} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label>
            <div className="section-title">学科</div>
            <select
              value={aiForm.subject}
              onChange={(event) => setAiForm({ ...aiForm, subject: event.target.value })}
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
              value={aiForm.grade}
              onChange={(event) => setAiForm({ ...aiForm, grade: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">章节（可选）</div>
            <select
              value={aiForm.chapter}
              onChange={(event) => setAiForm({ ...aiForm, chapter: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="">不指定</option>
              {chapterOptions.map((chapter) => (
                <option value={chapter} key={chapter}>
                  {chapter}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="section-title">生成数量（1-10）</div>
            <input
              type="number"
              min={1}
              max={10}
              value={aiForm.count}
              onChange={(event) => setAiForm({ ...aiForm, count: Number(event.target.value) })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <button className="button primary" type="submit" disabled={aiLoading}>
            {aiLoading ? "生成中..." : "开始生成"}
          </button>
        </form>
        {aiMessage ? <div style={{ marginTop: 8 }}>{aiMessage}</div> : null}
        {aiErrors.length ? (
          <div style={{ marginTop: 8, color: "#b42318", fontSize: 13 }}>
            {aiErrors.slice(0, 5).map((err) => (
              <div key={err}>{err}</div>
            ))}
          </div>
        ) : null}
      </Card>
      <Card title="新增知识点">
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
            <div className="section-title">知识点名称</div>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">章节</div>
            <input
              value={form.chapter}
              onChange={(event) => setForm({ ...form, chapter: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <button className="button primary" type="submit">
            保存
          </button>
        </form>
      </Card>

      <Card title="知识点列表">
        {loading ? <p>加载中...</p> : null}
        <div className="grid" style={{ gap: 8 }}>
          {list.map((item) => (
            <div className="card" key={item.id} style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div className="section-title">{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  {item.subject} · {item.grade} 年级 · {item.chapter}
                </div>
              </div>
              <button className="button secondary" onClick={() => handleDelete(item.id)}>
                删除
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
