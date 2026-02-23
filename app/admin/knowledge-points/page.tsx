"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";

type KnowledgePoint = {
  id: string;
  subject: string;
  grade: string;
  title: string;
  chapter: string;
  unit?: string;
};

export default function KnowledgePointsAdminPage() {
  const [list, setList] = useState<KnowledgePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    subject: "math",
    grade: "4",
    unit: "",
    title: "",
    chapter: ""
  });
  const [aiForm, setAiForm] = useState({ subject: "math", grade: "4", chapter: "", count: 5 });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiErrors, setAiErrors] = useState<string[]>([]);
  const [treeForm, setTreeForm] = useState({
    subject: "math",
    grade: "4",
    edition: "人教版",
    volume: "上册",
    unitCount: 6
  });
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeMessage, setTreeMessage] = useState<string | null>(null);
  const [treeErrors, setTreeErrors] = useState<string[]>([]);
  const [batchForm, setBatchForm] = useState({
    subjects: ["math", "chinese", "english"],
    grades: ["1", "2", "3", "4", "5", "6"],
    edition: "人教版",
    volume: "上册",
    unitCount: 6,
    chaptersPerUnit: 2,
    pointsPerChapter: 4
  });
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchPreview, setBatchPreview] = useState<any[]>([]);
  const [batchConfirming, setBatchConfirming] = useState(false);

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

  async function handleTreeGenerate(event: React.FormEvent) {
    event.preventDefault();
    setTreeLoading(true);
    setTreeMessage(null);
    setTreeErrors([]);

    const res = await fetch("/api/admin/knowledge-points/generate-tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: treeForm.subject,
        grade: treeForm.grade,
        edition: treeForm.edition,
        volume: treeForm.volume,
        unitCount: treeForm.unitCount
      })
    });

    const data = await res.json();
    if (!res.ok) {
      setTreeErrors([data?.error ?? "生成失败"]);
      setTreeLoading(false);
      return;
    }

    const skipped = data.skipped ?? [];
    if (skipped.length) {
      setTreeErrors(skipped.slice(0, 5).map((item: any) => `第 ${item.index + 1} 条：${item.reason}`));
    }
    setTreeMessage(`已生成 ${data.created?.length ?? 0} 条知识点。`);
    setTreeLoading(false);
    load();
  }

  async function handleBatchPreview(event: React.FormEvent) {
    event.preventDefault();
    setBatchLoading(true);
    setBatchError(null);
    setBatchPreview([]);

    const res = await fetch("/api/admin/knowledge-points/preview-tree-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjects: batchForm.subjects,
        grades: batchForm.grades,
        edition: batchForm.edition,
        volume: batchForm.volume,
        unitCount: batchForm.unitCount,
        chaptersPerUnit: batchForm.chaptersPerUnit,
        pointsPerChapter: batchForm.pointsPerChapter
      })
    });

    const data = await res.json();
    if (!res.ok) {
      setBatchError(data?.error ?? "生成预览失败");
      setBatchLoading(false);
      return;
    }

    if (data.failed?.length) {
      setBatchError(data.failed.map((item: any) => `${item.subject}${item.grade}年级：${item.reason}`).join("；"));
    }
    setBatchPreview(data.items ?? []);
    setBatchLoading(false);
  }

  async function handleBatchConfirm() {
    if (!batchPreview.length) {
      setBatchError("请先生成预览");
      return;
    }
    setBatchConfirming(true);
    const res = await fetch("/api/admin/knowledge-points/import-tree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: batchPreview })
    });
    const data = await res.json();
    if (!res.ok) {
      setBatchError(data?.error ?? "入库失败");
      setBatchConfirming(false);
      return;
    }
    setBatchError(`已入库 ${data.created?.length ?? 0} 条，跳过 ${data.skipped?.length ?? 0} 条。`);
    setBatchConfirming(false);
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/knowledge-points/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="批量生成全学科/全年级（预览后确认）">
        <p style={{ color: "var(--ink-1)", fontSize: 13 }}>
          先生成预览，再确认入库。支持控制单元/章节/知识点数量模板。
        </p>
        <form onSubmit={handleBatchPreview} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <div className="grid grid-3">
            <label>
              <div className="section-title">学科</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["math", "chinese", "english"].map((subject) => (
                  <label key={subject} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={batchForm.subjects.includes(subject)}
                      onChange={(event) => {
                        setBatchForm((prev) => ({
                          ...prev,
                          subjects: event.target.checked
                            ? [...prev.subjects, subject]
                            : prev.subjects.filter((item) => item !== subject)
                        }));
                      }}
                    />
                    {subject === "math" ? "数学" : subject === "chinese" ? "语文" : "英语"}
                  </label>
                ))}
              </div>
            </label>
            <label>
              <div className="section-title">年级</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["1", "2", "3", "4", "5", "6"].map((grade) => (
                  <label key={grade} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={batchForm.grades.includes(grade)}
                      onChange={(event) => {
                        setBatchForm((prev) => ({
                          ...prev,
                          grades: event.target.checked
                            ? [...prev.grades, grade]
                            : prev.grades.filter((item) => item !== grade)
                        }));
                      }}
                    />
                    {grade} 年级
                  </label>
                ))}
              </div>
            </label>
            <label>
              <div className="section-title">册次</div>
              <select
                value={batchForm.volume}
                onChange={(event) => setBatchForm({ ...batchForm, volume: event.target.value })}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                <option value="上册">上册</option>
                <option value="下册">下册</option>
                <option value="全册">全册</option>
              </select>
            </label>
          </div>
          <div className="grid grid-3">
            <label>
              <div className="section-title">单元数量</div>
              <input
                type="number"
                min={1}
                max={12}
                value={batchForm.unitCount}
                onChange={(event) => setBatchForm({ ...batchForm, unitCount: Number(event.target.value) })}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            <label>
              <div className="section-title">每单元章节数</div>
              <input
                type="number"
                min={1}
                max={4}
                value={batchForm.chaptersPerUnit}
                onChange={(event) => setBatchForm({ ...batchForm, chaptersPerUnit: Number(event.target.value) })}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            <label>
              <div className="section-title">每章知识点数</div>
              <input
                type="number"
                min={2}
                max={8}
                value={batchForm.pointsPerChapter}
                onChange={(event) => setBatchForm({ ...batchForm, pointsPerChapter: Number(event.target.value) })}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
          </div>
          <button className="button primary" type="submit" disabled={batchLoading}>
            {batchLoading ? "生成中..." : "生成预览"}
          </button>
        </form>
        {batchError ? <div style={{ marginTop: 8, color: "#b42318" }}>{batchError}</div> : null}
        {batchPreview.length ? (
          <div style={{ marginTop: 16 }}>
            <div className="section-title">预览结果</div>
            <div className="grid" style={{ gap: 10 }}>
              {batchPreview.map((item) => (
                <div className="card" key={`${item.subject}-${item.grade}`}>
                  <div className="section-title">
                    {item.subject} · {item.grade} 年级
                  </div>
                  {item.units?.slice(0, 3).map((unit: any) => (
                    <div key={unit.title} style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 600 }}>{unit.title}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                        章节数：{unit.chapters?.length ?? 0}
                      </div>
                    </div>
                  ))}
                  {item.units?.length > 3 ? (
                    <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                      … 共 {item.units.length} 个单元
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="cta-row">
              <button className="button secondary" type="button" onClick={() => setBatchPreview([])}>
                清空预览
              </button>
              <button className="button primary" type="button" onClick={handleBatchConfirm} disabled={batchConfirming}>
                {batchConfirming ? "入库中..." : "确认入库"}
              </button>
            </div>
          </div>
        ) : null}
      </Card>
      <Card title="AI 生成知识点树（整本书）">
        <p style={{ color: "var(--ink-1)", fontSize: 13 }}>
          按“单元 → 章节 → 知识点”生成整本书结构（建议先执行该功能）。
        </p>
        <form onSubmit={handleTreeGenerate} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label>
            <div className="section-title">学科</div>
            <select
              value={treeForm.subject}
              onChange={(event) => setTreeForm({ ...treeForm, subject: event.target.value })}
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
              value={treeForm.grade}
              onChange={(event) => setTreeForm({ ...treeForm, grade: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">教材版本</div>
            <input
              value={treeForm.edition}
              onChange={(event) => setTreeForm({ ...treeForm, edition: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">册次</div>
            <select
              value={treeForm.volume}
              onChange={(event) => setTreeForm({ ...treeForm, volume: event.target.value })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="上册">上册</option>
              <option value="下册">下册</option>
              <option value="全册">全册</option>
            </select>
          </label>
          <label>
            <div className="section-title">单元数量（1-12）</div>
            <input
              type="number"
              min={1}
              max={12}
              value={treeForm.unitCount}
              onChange={(event) => setTreeForm({ ...treeForm, unitCount: Number(event.target.value) })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <button className="button primary" type="submit" disabled={treeLoading}>
            {treeLoading ? "生成中..." : "生成知识点树"}
          </button>
        </form>
        {treeMessage ? <div style={{ marginTop: 8 }}>{treeMessage}</div> : null}
        {treeErrors.length ? (
          <div style={{ marginTop: 8, color: "#b42318", fontSize: 13 }}>
            {treeErrors.map((err) => (
              <div key={err}>{err}</div>
            ))}
          </div>
        ) : null}
      </Card>
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
            <div className="section-title">单元</div>
            <input
              value={form.unit}
              onChange={(event) => setForm({ ...form, unit: event.target.value })}
              placeholder="如：第一单元"
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
                  {item.subject} · {item.grade} 年级 · {item.unit ?? "未分单元"} · {item.chapter}
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
