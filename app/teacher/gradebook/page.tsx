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
  const [viewMode, setViewMode] = useState<"student" | "assignment">("student");
  const [studentKeyword, setStudentKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");

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
  const visibleAssignments =
    assignmentFilter !== "all"
      ? assignments.filter((item) => item.id === assignmentFilter)
      : assignments.slice(0, 6);
  const now = Date.now();
  const ranked = useMemo(() => {
    if (!data?.students?.length) return new Map<string, number>();
    const sorted = [...data.students].sort((a, b) => b.stats.avgScore - a.stats.avgScore);
    return new Map(sorted.map((student, index) => [student.id, index + 1]));
  }, [data]);

  function tierLabel(avgScore: number) {
    if (avgScore >= 85) return "A";
    if (avgScore >= 70) return "B";
    return "C";
  }

  const filteredStudents = useMemo(() => {
    if (!data?.students?.length) return [];
    const keyword = studentKeyword.trim().toLowerCase();
    let list = data.students;
    if (keyword) {
      list = list.filter(
        (student) =>
          student.name.toLowerCase().includes(keyword) || student.email.toLowerCase().includes(keyword)
      );
    }
    if (statusFilter === "overdue") {
      list = list.filter((student) => student.stats.overdue > 0);
    } else if (statusFilter === "pending") {
      list = list.filter((student) => student.stats.pending > 0);
    } else if (statusFilter === "completed") {
      list = list.filter((student) => student.stats.pending === 0);
    }
    return list;
  }, [data, studentKeyword, statusFilter]);

  const trendMap = useMemo(
    () => new Map((data?.trend ?? []).map((item) => [item.assignmentId, item])),
    [data?.trend]
  );

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
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <label>
            <div className="section-title">视图</div>
            <select
              value={viewMode}
              onChange={(event) => setViewMode(event.target.value as "student" | "assignment")}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="student">按学生</option>
              <option value="assignment">按作业</option>
            </select>
          </label>
          <label>
            <div className="section-title">作业筛选</div>
            <select
              value={assignmentFilter}
              onChange={(event) => setAssignmentFilter(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="all">全部作业</option>
              {assignments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="section-title">学生筛选</div>
            <input
              value={studentKeyword}
              onChange={(event) => setStudentKeyword(event.target.value)}
              placeholder="姓名/邮箱"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">状态筛选</div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="all">全部</option>
              <option value="pending">有待交</option>
              <option value="overdue">有逾期</option>
              <option value="completed">全部完成</option>
            </select>
          </label>
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
          {assignmentFilter !== "all"
            ? "已筛选 1 份作业。"
            : `当前仅展示最近 ${visibleAssignments.length} 份作业。更多作业可在“作业列表”查看。`}
        </div>
        <div className="cta-row" style={{ marginTop: 12 }}>
          <button className="button secondary" type="button" onClick={exportCSV}>
            导出 CSV
          </button>
          <button
            className="button ghost"
            type="button"
            onClick={() => {
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
              const table = `
                <table>
                  <thead><tr>${header.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead>
                  <tbody>
                    ${rows
                      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
                      .join("")}
                  </tbody>
                </table>
              `;
              const blob = new Blob([`\uFEFF${table}`], { type: "application/vnd.ms-excel;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `gradebook-${data.class?.name ?? "class"}.xls`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
          >
            导出 Excel
          </button>
        </div>
      </Card>

      <Card title="成绩分布" tag="分布">
        {data?.distribution?.length ? (
          <div className="grid grid-2">
            {data.distribution.map((item) => {
              const max = Math.max(...(data.distribution ?? []).map((d) => d.count), 1);
              return (
                <div className="card" key={item.label}>
                  <div className="section-title">{item.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        background: "linear-gradient(90deg, #1f6feb, #7ec4ff)",
                        width: `${(item.count / max) * 100}%`
                      }}
                    />
                    <span style={{ fontSize: 12, color: "var(--ink-1)" }}>{item.count} 人</span>
                  </div>
                </div>
              );
            })}
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
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>平均分</div>
                  <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${item.avgScore}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #f97316, #facc15)"
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>完成率</div>
                  <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${item.completionRate}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #16a34a, #65a30d)"
                      }}
                    />
                  </div>
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
        ) : viewMode === "student" && filteredStudents.length ? (
          <div style={{ overflowX: "auto" }}>
            <table className="gradebook-table">
              <thead>
                <tr>
                  <th>学生</th>
                  <th>排名</th>
                  <th>层级</th>
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
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="section-title">{student.name}</div>
                      <div className="gradebook-sub">{student.email}</div>
                    </td>
                    <td>{ranked.get(student.id) ?? "-"}</td>
                    <td>{tierLabel(student.stats.avgScore)}</td>
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
        ) : viewMode === "assignment" && data?.assignments?.length ? (
          <div style={{ overflowX: "auto" }}>
            <table className="gradebook-table">
              <thead>
                <tr>
                  <th>作业</th>
                  <th>截止日期</th>
                  <th>类型</th>
                  <th>完成率</th>
                  <th>平均分</th>
                  <th>逾期</th>
                </tr>
              </thead>
              <tbody>
                {(assignmentFilter === "all" ? data.assignments : data.assignments.filter((item) => item.id === assignmentFilter)).map(
                  (assignment) => {
                    const stat = assignmentStatMap.get(assignment.id);
                    const trend = trendMap.get(assignment.id);
                    return (
                      <tr key={assignment.id}>
                        <td>
                          <div className="section-title">{assignment.title}</div>
                          <div className="gradebook-sub">
                            已交 {stat?.completed ?? 0}/{stat?.total ?? 0}
                          </div>
                        </td>
                        <td>{new Date(assignment.dueDate).toLocaleDateString("zh-CN")}</td>
                        <td>{ASSIGNMENT_TYPE_LABELS[assignment.submissionType ?? "quiz"]}</td>
                        <td>{trend?.completionRate ?? 0}%</td>
                        <td>{trend?.avgScore ?? 0}</td>
                        <td>{stat?.overdue ?? 0}</td>
                      </tr>
                    );
                  }
                )}
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
