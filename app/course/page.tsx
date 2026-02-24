"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";

type CourseClass = {
  id: string;
  name: string;
  subject: string;
  grade: string;
};

type Syllabus = {
  summary: string;
  objectives: string;
  gradingPolicy: string;
  scheduleText: string;
  updatedAt?: string;
};

type CourseSummary = {
  moduleCount: number;
  resourceCount: number;
  upcomingAssignments: Array<{
    id: string;
    title: string;
    dueDate: string;
    submissionType: string;
  }>;
};

export default function CoursePage() {
  const [role, setRole] = useState<string | null>(null);
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [classId, setClassId] = useState("");
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [summary, setSummary] = useState<CourseSummary | null>(null);
  const [form, setForm] = useState<Syllabus>({
    summary: "",
    objectives: "",
    gradingPolicy: "",
    scheduleText: ""
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setRole(data?.user?.role ?? null));
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.data ?? []);
        if (data.data?.length) {
          setClassId(data.data[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!classId) return;
    setMessage(null);
    setError(null);
    fetch(`/api/course/syllabus?classId=${classId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data?.data) {
          const blank = { summary: "", objectives: "", gradingPolicy: "", scheduleText: "" };
          setSyllabus(blank);
          setForm(blank);
          return;
        }
        setSyllabus(data.data);
        setForm({
          summary: data.data.summary ?? "",
          objectives: data.data.objectives ?? "",
          gradingPolicy: data.data.gradingPolicy ?? "",
          scheduleText: data.data.scheduleText ?? ""
        });
      });
    fetch(`/api/course/summary?classId=${classId}`)
      .then((res) => res.json())
      .then((data) => setSummary(data?.summary ?? null));
  }, [classId]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/course/syllabus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, ...form })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "保存失败");
    } else {
      setMessage("课程大纲已更新");
      setSyllabus(data.data);
    }
    setSaving(false);
  }

  const currentClass = classes.find((item) => item.id === classId);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>课程主页 / 大纲</h2>
          <div className="section-sub">课程简介、目标、评分规则与周计划同步。</div>
        </div>
        <span className="chip">课程</span>
      </div>

      <Card title="课程选择" tag="课程">
        {classes.length ? (
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
        ) : (
          <p>暂无班级，请先在教师端创建班级或加入班级。</p>
        )}
      </Card>

      <div className="grid grid-2">
        {role === "teacher" ? (
          <Card title="编辑课程大纲" tag="教师">
            <form onSubmit={handleSave} style={{ display: "grid", gap: 12 }}>
              <label>
                <div className="section-title">课程简介</div>
                <textarea
                  value={form.summary}
                  onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
                  rows={3}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
              </label>
              <label>
                <div className="section-title">课程目标</div>
                <textarea
                  value={form.objectives}
                  onChange={(event) => setForm((prev) => ({ ...prev, objectives: event.target.value }))}
                  rows={3}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
              </label>
              <label>
                <div className="section-title">评分规则</div>
                <textarea
                  value={form.gradingPolicy}
                  onChange={(event) => setForm((prev) => ({ ...prev, gradingPolicy: event.target.value }))}
                  rows={3}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
              </label>
              <label>
                <div className="section-title">周/单元安排</div>
                <textarea
                  value={form.scheduleText}
                  onChange={(event) => setForm((prev) => ({ ...prev, scheduleText: event.target.value }))}
                  rows={4}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
              </label>
              {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
              {message ? <div style={{ color: "#027a48", fontSize: 13 }}>{message}</div> : null}
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? "保存中..." : "保存大纲"}
              </button>
            </form>
          </Card>
        ) : (
          <Card title="课程大纲" tag="学生/家长">
            <p style={{ color: "var(--ink-1)" }}>老师更新后将同步显示在这里。</p>
          </Card>
        )}

        <Card title="课程主页预览" tag="主页">
          <div className="feature-card">
            <EduIcon name="board" />
            <div>
              <div className="section-title">
                {currentClass ? `${currentClass.name} · ${currentClass.grade} 年级` : "课程"}
              </div>
              <div className="section-sub">
                {currentClass ? SUBJECT_LABELS[currentClass.subject] ?? currentClass.subject : "学科"}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="section-title">课程简介</div>
            <p style={{ whiteSpace: "pre-wrap" }}>{syllabus?.summary || "暂无简介"}</p>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="section-title">课程目标</div>
            <p style={{ whiteSpace: "pre-wrap" }}>{syllabus?.objectives || "暂无目标"}</p>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="section-title">评分规则</div>
            <p style={{ whiteSpace: "pre-wrap" }}>{syllabus?.gradingPolicy || "暂无规则"}</p>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="section-title">周/单元安排</div>
            <p style={{ whiteSpace: "pre-wrap" }}>{syllabus?.scheduleText || "暂无安排"}</p>
          </div>
        </Card>
      </div>

      <Card title="课程待办与资源" tag="进度">
        <div className="grid grid-2">
          <div className="card">
            <div className="section-title">课程模块</div>
            <div className="section-sub">共 {summary?.moduleCount ?? 0} 个模块</div>
          </div>
          <div className="card">
            <div className="section-title">课程资料</div>
            <div className="section-sub">共 {summary?.resourceCount ?? 0} 份资料</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="section-title">近期作业</div>
          {summary?.upcomingAssignments?.length ? (
            <div className="grid" style={{ gap: 8, marginTop: 8 }}>
              {summary.upcomingAssignments.map((item) => (
                <div key={item.id} className="card">
                  <div className="section-title">{item.title}</div>
                  <div className="section-sub">
                    截止日期：{new Date(item.dueDate).toLocaleDateString("zh-CN")} ·{" "}
                    {item.submissionType === "essay" ? "作文" : item.submissionType === "upload" ? "上传" : "在线作业"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 6 }}>暂无待办作业。</p>
          )}
        </div>
      </Card>
    </div>
  );
}
