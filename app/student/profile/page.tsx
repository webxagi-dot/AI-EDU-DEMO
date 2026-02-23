"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";

const subjectOptions = [
  { key: "math", label: "数学" },
  { key: "chinese", label: "语文" },
  { key: "english", label: "英语" }
];

export default function StudentProfilePage() {
  const [grade, setGrade] = useState("4");
  const [subjects, setSubjects] = useState<string[]>(["math", "chinese", "english"]);
  const [target, setTarget] = useState("");
  const [school, setSchool] = useState("");
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
    <div className="grid" style={{ gap: 18, maxWidth: 640 }}>
      <Card title="学生资料设置">
        <form onSubmit={handleSave} style={{ display: "grid", gap: 12 }}>
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
          <div>
            <div className="section-title">学习学科</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {subjectOptions.map((subject) => (
                <label key={subject.key} className="card" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={subjects.includes(subject.key)}
                    onChange={() => toggleSubject(subject.key)}
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
    </div>
  );
}
