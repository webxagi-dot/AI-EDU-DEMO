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

export default function KnowledgePointsAdminPage() {
  const [list, setList] = useState<KnowledgePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ subject: "math", grade: "4", title: "", chapter: "" });

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

  async function handleDelete(id: string) {
    await fetch(`/api/admin/knowledge-points/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
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
