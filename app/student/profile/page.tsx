"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from "@/lib/constants";

export default function StudentProfilePage() {
  const [grade, setGrade] = useState("4");
  const [subjects, setSubjects] = useState<string[]>(["math", "chinese", "english"]);
  const [target, setTarget] = useState("");
  const [school, setSchool] = useState("");
  const [observerCode, setObserverCode] = useState("");
  const [observerCopied, setObserverCopied] = useState(false);
  const [observerMessage, setObserverMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/student/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          setGrade(data.data.grade ?? "4");
          setSubjects(data.data.subjects ?? ["math", "chinese", "english"]);
          setTarget(data.data.target ?? "");
          setSchool(data.data.school ?? "");
        }
      });
    fetch("/api/student/observer-code")
      .then((res) => res.json())
      .then((data) => setObserverCode(data?.data?.code ?? ""));
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch("/api/student/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade, subjects, target, school })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "保存失败");
      return;
    }
    setMessage("已保存");
  }

  function toggleSubject(key: string) {
    setSubjects((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  }

  return (
    <div className="grid" style={{ gap: 18, maxWidth: 720 }}>
      <div className="section-head">
        <div>
          <h2>学生资料</h2>
          <div className="section-sub">完善年级、学科与学习目标。</div>
        </div>
        <span className="chip">学习档案</span>
      </div>
      <Card title="学生资料设置" tag="基础">
        <div className="feature-card">
          <EduIcon name="book" />
          <p>填写学科偏好与学习目标，优化推荐。</p>
        </div>
        <form onSubmit={handleSave} style={{ display: "grid", gap: 12 }}>
          <label>
            <div className="section-title">年级</div>
            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {GRADE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <div>
            <div className="section-title">学习学科</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {SUBJECT_OPTIONS.map((subject) => (
                <label key={subject.value} className="card" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={subjects.includes(subject.value)}
                    onChange={() => toggleSubject(subject.value)}
                    style={{ marginRight: 8 }}
                  />
                  {subject.label}
                </label>
              ))}
            </div>
          </div>
          <label>
            <div className="section-title">学习目标</div>
            <input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="例如：分数与阅读理解"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">学校（可选）</div>
            <input
              value={school}
              onChange={(event) => setSchool(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
          {message ? <div style={{ color: "#027a48", fontSize: 13 }}>{message}</div> : null}
          <button className="button primary" type="submit">
            保存
          </button>
        </form>
      </Card>
      <Card title="家长绑定码" tag="家校">
        <div className="feature-card">
          <EduIcon name="board" />
          <p>提供给家长注册使用，绑定后可查看学习进展。</p>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="section-title" style={{ fontSize: 18 }}>
            {observerCode || "生成中..."}
          </div>
          <button
            className="button secondary"
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(observerCode);
                setObserverCopied(true);
                setTimeout(() => setObserverCopied(false), 2000);
              } catch {
                setObserverCopied(false);
              }
            }}
          >
            {observerCopied ? "已复制" : "复制绑定码"}
          </button>
          <button
            className="button ghost"
            type="button"
            onClick={async () => {
              const res = await fetch("/api/student/observer-code", { method: "POST" });
              const data = await res.json();
              if (res.ok) {
                setObserverCode(data?.data?.code ?? "");
                setObserverMessage("已生成新绑定码");
              } else {
                setObserverMessage(data?.error ?? "生成失败");
              }
            }}
          >
            重新生成
          </button>
        </div>
        {observerMessage ? <div style={{ marginTop: 8, fontSize: 12 }}>{observerMessage}</div> : null}
      </Card>
    </div>
  );
}
