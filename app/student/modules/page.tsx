"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";

export default function StudentModulesPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/student/modules")
      .then((res) => res.json())
      .then((payload) => setData(payload.data ?? []));
  }, []);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>课程模块</h2>
          <div className="section-sub">按单元查看学习内容与作业进度。</div>
        </div>
        <span className="chip">学习路径</span>
      </div>

      {data.length ? (
        data.map((klass) => (
          <Card key={klass.classId} title={klass.className} tag="班级">
            <div className="feature-card">
              <EduIcon name="book" />
              <p>
                {SUBJECT_LABELS[klass.subject] ?? klass.subject} · {klass.grade} 年级
              </p>
            </div>
            {klass.modules.length ? (
              <div className="grid" style={{ gap: 10, marginTop: 12 }}>
                {klass.modules.map((module: any) => (
                  <div className="card" key={module.id}>
                    <div className="section-title">{module.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                      {module.description || "暂无说明"}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                        进度 {module.assignmentCount ? Math.round((module.completedCount / module.assignmentCount) * 100) : 0}%
                      </div>
                      <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${module.assignmentCount ? Math.round((module.completedCount / module.assignmentCount) * 100) : 0}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #1f6feb, #7ec4ff)"
                          }}
                        />
                      </div>
                    </div>
                    <div className="pill-list" style={{ marginTop: 8 }}>
                      <span className="pill">
                        完成 {module.completedCount}/{module.assignmentCount}
                      </span>
                    </div>
                    <Link
                      className="button secondary"
                      href={`/student/modules/${module.id}`}
                      style={{ marginTop: 8 }}
                    >
                      查看模块
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p>暂无模块。</p>
            )}
          </Card>
        ))
      ) : (
        <Card title="课程模块">暂无班级模块。</Card>
      )}
    </div>
  );
}
