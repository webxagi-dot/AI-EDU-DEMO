"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import { ASSIGNMENT_TYPE_LABELS, SUBJECT_LABELS } from "@/lib/constants";

type GradebookPayload = {
  classes: Array<{ id: string; name: string; subject: string; grade: string }>;
  class: { id: string; name: string; subject: string; grade: string } | null;
  assignments: Array<{ id: string; title: string; dueDate: string; submissionType?: "quiz" | "upload" | "essay" }>;
  assignmentStats: Array<{ assignmentId: string; completed: number; total: number; overdue: number }>;
  distribution?: Array<{ label: string; count: number }>;
  trend?: Array<{ assignmentId: string; title: string; dueDate: string; avgScore: number; completionRate: number }>;
  students: Array<{
    id: string;
    name: string;
    email: string;
    stats: { completed: number; pending: number; overdue: number; late: number; avgScore: number };
    progress: Record<string, { status: string; score: number | null; total: number | null; completedAt: string | null }>;
  }>;
  summary: { students: number; assignments: number; completionRate: number; avgScore: number } | null;
};

export default function TeacherGradebookPage() {
  const [data, setData] = useState<GradebookPayload | null>(null);
  const [classId, setClassId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(nextClassId?: string) {
    setLoading(true);
    setError(null);
    const query = nextClassId ? `?classId=${nextClassId}` : "";
    const res = await fetch(`/api/teacher/gradebook${query}`);
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "加载失败");
      setLoading(false);
      return;
    }
    setData(payload);
    const fallbackClassId = payload?.class?.id ?? payload?.classes?.[0]?.id ?? "";
    setClassId(nextClassId ?? fallbackClassId);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const assignments = data?.assignments ?? [];
  const assignmentStats = data?.assignmentStats;
  const assignmentStatMap = useMemo(
    () => new Map((assignmentStats ?? []).map((item) => [item.assignmentId, item])),
    [assignmentStats]
  );
  const visibleAssignments = assignments.slice(0, 6);
  const now = Date.now();

  function exportCSV() {
    if (!data) return;
    const header = [
      "学生",
      "邮箱",
      "完成",
      "待交",
      "逾期",
      "迟交",
      "平均分",
      ...assignments.map((item) => `${item.title}(${new Date(item.dueDate).toLocaleDateString("zh-CN")})`)
    ];
    const rows = data.students.map((student) => {
      const base = [
        student.name,
        student.email,
        String(student.stats.completed),
        String(student.stats.pending),
        String(student.stats.overdue),
        String(student.stats.late),
        String(student.stats.avgScore)
      ];
      const assignmentCells = assignments.map((assignment) => {
        const progress = student.progress[assignment.id];
        const status = progress?.status ?? "pending";
        const dueTime = new Date(assignment.dueDate).getTime();
        const isOverdue = status !== "completed" && dueTime < now;
        if (status === "completed") {
          if (assignment.submissionType === "quiz" && progress?.total) {
            return `${progress.score ?? 0}/${progress.total ?? 0}`;
          }
          return "已交";
        }
        return isOverdue ? "逾期" : "待交";
      });
      return [...base, ...assignmentCells];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/\"/g, "\"\"")}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gradebook-${data.class?.name ?? "class"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>成绩册</h2>
          <div className="section-sub">按班级查看作业完成情况、缺交与迟交。</div>
        </div>
        <span className="chip">Gradebook</span>
      </div>

      <Card title="班级筛选" tag="班级">
        <div className="grid grid-2" style={{ alignItems: "end" }}>
          <label>
            <div className="section-title">选择班级</div>
            <select
              value={classId}
              onChange={(event) => {
                const next = event.target.value;
                setClassId(next);
                load(next);
              }}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {(data?.classes ?? []).map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name} · {SUBJECT_LABELS[klass.subject] ?? klass.subject} · {klass.grade} 年级
                </option>
              ))}
            </select>
          </label>
          <div className="card" style={{ alignSelf: "stretch" }}>
            <div className="section-title">快速入口</div>
            <div className="cta-row" style={{ marginTop: 10 }}>
              <Link className="button secondary" href="/teacher">
                返回教师端
              </Link>
              <Link className="button ghost" href="/teacher">
                作业列表
              </Link>
            </div>
          </div>
        </div>
        {error ? <div style={{ marginTop: 10, color: "#b42318", fontSize: 13 }}>{error}</div> : null}
      </Card>

      <Card title="班级概览" tag="数据">
        <div className="grid grid-2">
          <div className="card">
            <div className="section-title">学生数</div>
            <p>{data?.summary?.students ?? 0}</p>
          </div>
          <div className="card">
            <div className="section-title">作业数</div>
            <p>{data?.summary?.assignments ?? 0}</p>
          </div>
          <div className="card">
            <div className="section-title">完成率</div>
            <p>{data?.summary?.completionRate ?? 0}%</p>
          </div>
          <div className="card">
            <div className="section-title">平均分</div>
            <p>{data?.summary?.avgScore ?? 0}</p>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-1)" }}>
          当前仅展示最近 {visibleAssignments.length} 份作业。更多作业可在“作业列表”查看。
        </div>
        <div className="cta-row" style={{ marginTop: 12 }}>
          <button className="button secondary" type="button" onClick={exportCSV}>
            导出成绩册 CSV
          </button>
        </div>
      </Card>

      <Card title="成绩分布" tag="分布">
        {data?.distribution?.length ? (
          <div className="grid grid-2">
            {data.distribution.map((item) => (
              <div className="card" key={item.label}>
                <div className="section-title">{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{item.count} 人</div>
              </div>
            ))}
          </div>
        ) : (
          <p>暂无分布数据。</p>
        )}
      </Card>

      <Card title="成绩趋势" tag="趋势">
        {data?.trend?.length ? (
          <div className="grid" style={{ gap: 10 }}>
            {data.trend.map((item) => (
              <div className="card" key={item.assignmentId}>
                <div className="section-title">{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  截止 {new Date(item.dueDate).toLocaleDateString("zh-CN")}
                </div>
                <div className="pill-list" style={{ marginTop: 8 }}>
                  <span className="pill">平均分 {item.avgScore}</span>
                  <span className="pill">完成率 {item.completionRate}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>暂无趋势数据。</p>
        )}
      </Card>

      <Card title="成绩册" tag="作业">
        {loading ? (
          <p>加载中...</p>
        ) : data?.students?.length ? (
          <div style={{ overflowX: "auto" }}>
            <table className="gradebook-table">
              <thead>
                <tr>
                  <th>学生</th>
                  <th>完成</th>
                  <th>待交</th>
                  <th>逾期</th>
                  <th>迟交</th>
                  <th>平均分</th>
                  {visibleAssignments.map((assignment) => {
                    const stat = assignmentStatMap.get(assignment.id);
                    return (
                      <th key={assignment.id}>
                        <div>{assignment.title}</div>
                        <div className="gradebook-sub">
                          {new Date(assignment.dueDate).toLocaleDateString("zh-CN")} ·{" "}
                          {ASSIGNMENT_TYPE_LABELS[assignment.submissionType ?? "quiz"]}
                        </div>
                        {stat ? (
                          <div className="gradebook-sub">
                            已交 {stat.completed}/{stat.total}
                          </div>
                        ) : null}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="section-title">{student.name}</div>
                      <div className="gradebook-sub">{student.email}</div>
                    </td>
                    <td>{student.stats.completed}</td>
                    <td>{student.stats.pending}</td>
                    <td>{student.stats.overdue}</td>
                    <td>{student.stats.late}</td>
                    <td>{student.stats.avgScore}</td>
                    {visibleAssignments.map((assignment) => {
                      const progress = student.progress[assignment.id];
                      const status = progress?.status ?? "pending";
                      const dueTime = new Date(assignment.dueDate).getTime();
                      const isOverdue = status !== "completed" && dueTime < now;
                      const isQuiz = assignment.submissionType === "quiz";
                      let label = "待交";
                      let className = "gradebook-pill pending";
                      if (status === "completed") {
                        if (isQuiz && progress?.total) {
                          label = `${progress.score ?? 0}/${progress.total ?? 0}`;
                        } else {
                          label = "已交";
                        }
                        className = "gradebook-pill done";
                      } else if (isOverdue) {
                        label = "逾期";
                        className = "gradebook-pill overdue";
                      }
                      return (
                        <td key={`${student.id}-${assignment.id}`}>
                          <span className={className}>{label}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>暂无学生或作业数据。</p>
        )}
      </Card>
    </div>
  );
}
