"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import { SUBJECT_LABELS } from "@/lib/constants";

type ClassItem = {
  id: string;
  name: string;
  subject: string;
  grade: string;
};

type HeatItem = {
  id: string;
  title: string;
  chapter: string;
  unit: string;
  subject: string;
  grade: string;
  ratio: number;
  total: number;
};

type StudentItem = {
  id: string;
  name: string;
  email: string;
  grade?: string;
};

type FavoriteItem = {
  id: string;
  tags: string[];
  question?: {
    stem: string;
    knowledgePointTitle: string;
    grade: string;
  } | null;
};

export default function TeacherAnalysisPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [heatmap, setHeatmap] = useState<HeatItem[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentId, setStudentId] = useState("");
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    fetch("/api/teacher/classes")
      .then((res) => res.json())
      .then((data) => setClasses(data.data ?? []));
  }, []);

  useEffect(() => {
    if (!classId && classes.length) {
      setClassId(classes[0].id);
    }
  }, [classes, classId]);

  async function loadHeatmap(targetId: string) {
    setLoading(true);
    const res = await fetch(`/api/teacher/insights/heatmap?classId=${targetId}`);
    const data = await res.json();
    setHeatmap(data?.data?.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (classId) {
      loadHeatmap(classId);
    }
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    fetch(`/api/teacher/classes/${classId}/students`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.data ?? [];
        setStudents(list);
        if (list.length) {
          setStudentId(list[0].id);
        } else {
          setStudentId("");
        }
      });
  }, [classId]);

  useEffect(() => {
    if (!studentId) {
      setFavorites([]);
      return;
    }
    fetch(`/api/teacher/favorites?studentId=${studentId}`)
      .then((res) => res.json())
      .then((data) => setFavorites(data.data ?? []));
  }, [studentId]);

  async function generateReport() {
    if (!classId) return;
    setLoading(true);
    const res = await fetch("/api/teacher/insights/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId })
    });
    const data = await res.json();
    setReport(data?.data ?? null);
    setLoading(false);
  }

  const sortedHeatmap = useMemo(() => heatmap.slice(0, 40), [heatmap]);

  function ratioColor(ratio: number) {
    const hue = Math.round((ratio / 100) * 120);
    return `hsl(${hue}, 70%, 35%)`;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>班级学情分析</h2>
          <div className="section-sub">掌握热力图 + 学情报告。</div>
        </div>
        <span className="chip">数据面板</span>
      </div>

      <Card title="班级学情分析" tag="筛选">
        <div className="grid grid-2">
          <label>
            <div className="section-title">选择班级</div>
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {SUBJECT_LABELS[item.subject] ?? item.subject} · {item.grade} 年级
                </option>
              ))}
            </select>
          </label>
          <div className="card" style={{ alignSelf: "end" }}>
            <div className="section-title">说明</div>
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              颜色越偏红表示掌握度越低，可优先安排讲评与补救。
            </div>
          </div>
        </div>
      </Card>

      <Card title="知识点掌握热力图" tag="热力图">
        {loading ? <p>加载中...</p> : null}
        {sortedHeatmap.length === 0 ? (
          <p>暂无练习数据。</p>
        ) : (
          <div className="grid grid-3" style={{ gap: 12 }}>
            {sortedHeatmap.map((item) => (
              <div
                className="card"
                key={item.id}
                style={{
                  borderColor: ratioColor(item.ratio),
                  boxShadow: "none"
                }}
              >
                <div className="section-title">{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  {item.unit ? `${item.unit} / ` : ""}
                  {item.chapter}
                </div>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  正确率：<span style={{ color: ratioColor(item.ratio) }}>{item.ratio}%</span> · 练习 {item.total} 次
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="学情报告 + 重点提醒" tag="报告">
        <div className="cta-row">
          <button className="button primary" onClick={generateReport} disabled={loading}>
            {loading ? "生成中..." : "生成学情报告"}
          </button>
        </div>
        {report ? (
          <div className="grid" style={{ gap: 10, marginTop: 12 }}>
            <div className="card">
              <div className="section-title">报告摘要</div>
              <p>{report.report?.report ?? "暂无报告内容。"}</p>
            </div>
            {report.report?.highlights?.length ? (
              <div className="card">
                <div className="section-title">亮点</div>
                <ul style={{ margin: "6px 0 0 16px" }}>
                  {report.report.highlights.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {report.report?.reminders?.length ? (
              <div className="card">
                <div className="section-title">重点提醒</div>
                <ul style={{ margin: "6px 0 0 16px" }}>
                  {report.report.reminders.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card title="学生收藏题目" tag="收藏">
        <div className="grid grid-2">
          <label>
            <div className="section-title">选择学生</div>
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {students.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.grade ?? "-"} 年级
                </option>
              ))}
            </select>
          </label>
          <div className="card" style={{ alignSelf: "end" }}>
            <div className="section-title">收藏数量</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{favorites.length}</div>
          </div>
        </div>
        <div className="grid" style={{ gap: 10, marginTop: 12 }}>
          {favorites.length === 0 ? <p>暂无收藏记录。</p> : null}
          {favorites.slice(0, 6).map((item) => (
            <div className="card" key={item.id}>
              <div className="section-title">{item.question?.stem ?? "题目"}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                {item.question?.knowledgePointTitle ?? "知识点"} · {item.question?.grade ?? "-"} 年级
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-1)", marginTop: 6 }}>
                标签：{item.tags?.length ? item.tags.join("、") : "未设置"}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
