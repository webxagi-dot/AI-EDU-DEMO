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
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
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

  function parseCsv(text: string) {
    const rows: string[][] = [];
    let current = "";
    let row: string[] = [];
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === "\"") {
        if (inQuotes && next === "\"") {
          current += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (current.length || row.length) {
          row.push(current.trim());
          rows.push(row);
          row = [];
          current = "";
        }
      } else {
        current += char;
      }
    }
    if (current.length || row.length) {
      row.push(current.trim());
      rows.push(row);
    }
    return rows;
  }

  function downloadTemplate() {
    const header = [
      "subject",
      "grade",
      "knowledgePointId",
      "knowledgePointTitle",
      "stem",
      "options",
      "answer",
      "explanation"
    ];
    const sample = [
      "math",
      "4",
      "math-g4-fractions-meaning",
      "分数的意义",
      "把一个披萨平均分成 8 份，小明吃了 3 份，吃了几分之几？",
      "1/8|3/8|3/5|8/3",
      "3/8",
      "平均分成 8 份，每份是 1/8，吃了 3 份就是 3/8。"
    ];
    const csv = `${header.join(",")}\n${sample.map((item) => `\"${item}\"`).join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "questions-template.csv";
    link.click();
  }

  async function handleImport(file?: File | null) {
    if (!file) return;
    setImportMessage(null);
    setImportErrors([]);
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setImportErrors(["CSV 内容不足"]);
      return;
    }
    const headers = rows[0].map((h) => h.trim());
    const items: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row.length) continue;
      const record: Record<string, string> = {};
      headers.forEach((key, index) => {
        record[key] = row[index] ?? "";
      });
      const options = (record.options || "")
        .split("|")
        .map((opt) => opt.trim())
        .filter(Boolean);
      let knowledgePointId = record.knowledgePointId;
      if (!knowledgePointId && record.knowledgePointTitle) {
        const kp = knowledgePoints.find(
          (item) => item.title === record.knowledgePointTitle && item.subject === record.subject
        );
        knowledgePointId = kp?.id ?? "";
      }
      if (!knowledgePointId) {
        errors.push(`第 ${i + 1} 行：找不到知识点`);
        continue;
      }
      items.push({
        subject: record.subject,
        grade: record.grade,
        knowledgePointId,
        stem: record.stem,
        options,
        answer: record.answer,
        explanation: record.explanation
      });
    }

    if (!items.length) {
      setImportErrors(errors.length ? errors : ["没有可导入的题目"]);
      return;
    }

    const res = await fetch("/api/admin/questions/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });
    const data = await res.json();
    if (!res.ok) {
      setImportErrors([data?.error ?? "导入失败"]);
      return;
    }
    setImportMessage(`已导入 ${data.created} 题，失败 ${data.failed?.length ?? 0} 条。`);
    setImportErrors(errors);
    load();
  }

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
      <Card title="批量导入题库（CSV）">
        <p style={{ color: "var(--ink-1)", fontSize: 13 }}>
          支持 CSV 导入。若是 Excel，请先另存为 CSV。
        </p>
        <div className="cta-row">
          <button className="button secondary" type="button" onClick={downloadTemplate}>
            下载模板
          </button>
          <label className="button primary" style={{ cursor: "pointer" }}>
            选择 CSV 文件
            <input
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={(event) => handleImport(event.target.files?.[0])}
            />
          </label>
        </div>
        {importMessage ? <div style={{ marginTop: 8 }}>{importMessage}</div> : null}
        {importErrors.length ? (
          <div style={{ marginTop: 8, color: "#b42318", fontSize: 13 }}>
            {importErrors.slice(0, 5).map((err) => (
              <div key={err}>{err}</div>
            ))}
          </div>
        ) : null}
      </Card>
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
