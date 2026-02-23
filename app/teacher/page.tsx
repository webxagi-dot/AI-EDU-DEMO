"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";

type ClassItem = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  studentCount: number;
  assignmentCount: number;
  joinCode?: string;
  joinMode?: "approval" | "auto";
};

type AssignmentItem = {
  id: string;
  classId: string;
  className: string;
  classSubject: string;
  classGrade: string;
  title: string;
  dueDate: string;
  total: number;
  completed: number;
};

type KnowledgePoint = {
  id: string;
  subject: string;
  grade: string;
  title: string;
  chapter: string;
  unit?: string;
};

const subjectLabel: Record<string, string> = {
  math: "数学",
  chinese: "语文",
  english: "英语"
};

export default function TeacherPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);

  const [classForm, setClassForm] = useState({ name: "", subject: "math", grade: "4" });
  const [studentForm, setStudentForm] = useState({ classId: "", email: "" });
  const [assignmentForm, setAssignmentForm] = useState({
    classId: "",
    title: "",
    description: "",
    dueDate: "",
    questionCount: 10,
    knowledgePointId: "",
    mode: "bank",
    difficulty: "medium",
    questionType: "choice"
  });

  const filteredPoints = useMemo(() => {
    const klass = classes.find((item) => item.id === assignmentForm.classId);
    if (!klass) return [];
    return knowledgePoints.filter((kp) => kp.subject === klass.subject && kp.grade === klass.grade);
  }, [assignmentForm.classId, classes, knowledgePoints]);

  async function loadAll() {
    setUnauthorized(false);
    setLoading(true);
    setError(null);
    setMessage(null);
    const classRes = await fetch("/api/teacher/classes");
    if (classRes.status === 401) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    const classData = await classRes.json();
    setClasses(classData.data ?? []);

    const assignmentRes = await fetch("/api/teacher/assignments");
    const assignmentData = await assignmentRes.json();
    setAssignments(assignmentData.data ?? []);
    const insightRes = await fetch("/api/teacher/insights");
    const insightData = await insightRes.json();
    if (insightRes.ok) {
      setInsights(insightData);
    }
    const joinRes = await fetch("/api/teacher/join-requests");
    const joinData = await joinRes.json();
    if (joinRes.ok) {
      setJoinRequests(joinData.data ?? []);
    }
    setLoading(false);
  }

  async function loadKnowledgePoints() {
    const res = await fetch("/api/knowledge-points");
    const data = await res.json();
    setKnowledgePoints(data.data ?? []);
  }

  useEffect(() => {
    loadAll();
    loadKnowledgePoints();
  }, []);

  useEffect(() => {
    if (!studentForm.classId && classes.length) {
      setStudentForm((prev) => ({ ...prev, classId: classes[0].id }));
    }
    if (!assignmentForm.classId && classes.length) {
      const defaultDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setAssignmentForm((prev) => ({ ...prev, classId: classes[0].id, dueDate: prev.dueDate || defaultDue }));
    }
  }, [classes, studentForm.classId, assignmentForm.classId, assignmentForm.dueDate]);

  async function handleCreateClass(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/teacher/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(classForm)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "创建失败");
      setLoading(false);
      return;
    }
    setMessage("班级创建成功。");
    setClassForm({ ...classForm, name: "" });
    await loadAll();
    setLoading(false);
  }

  async function handleAddStudent(event: React.FormEvent) {
    event.preventDefault();
    if (!studentForm.classId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/teacher/classes/${studentForm.classId}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: studentForm.email })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "添加失败");
      setLoading(false);
      return;
    }
    setMessage(data.added ? "已加入班级。" : "学生已在班级中。");
    setStudentForm((prev) => ({ ...prev, email: "" }));
    await loadAll();
    setLoading(false);
  }

  async function handleCreateAssignment(event: React.FormEvent) {
    event.preventDefault();
    if (!assignmentForm.classId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/teacher/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: assignmentForm.classId,
        title: assignmentForm.title,
        description: assignmentForm.description,
        dueDate: assignmentForm.dueDate,
        questionCount: assignmentForm.questionCount,
        knowledgePointId: assignmentForm.knowledgePointId || undefined,
        mode: assignmentForm.mode,
        difficulty: assignmentForm.difficulty,
        questionType: assignmentForm.questionType
      })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "发布失败");
      setLoading(false);
      return;
    }
    setMessage("作业发布成功。");
    setAssignmentForm((prev) => ({ ...prev, title: "", description: "" }));
    await loadAll();
    setLoading(false);
  }

  async function handleUpdateJoinMode(classId: string, joinMode: "approval" | "auto") {
    await fetch(`/api/teacher/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinMode })
    });
    loadAll();
  }

  async function handleRegenerateCode(classId: string) {
    await fetch(`/api/teacher/classes/${classId}/join-code`, { method: "POST" });
    loadAll();
  }

  async function handleApprove(requestId: string) {
    await fetch(`/api/teacher/join-requests/${requestId}/approve`, { method: "POST" });
    loadAll();
  }

  async function handleReject(requestId: string) {
    await fetch(`/api/teacher/join-requests/${requestId}/reject`, { method: "POST" });
    loadAll();
  }

  if (unauthorized) {
    return <Card title="教师端">请先使用教师账号登录。</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="教师概览">
        <div className="grid grid-3">
          <div className="card">
            <div className="section-title">班级数</div>
            <p>{classes.length}</p>
          </div>
          <div className="card">
            <div className="section-title">作业数</div>
            <p>{assignments.length}</p>
          </div>
          <div className="card">
            <div className="section-title">待完成作业</div>
            <p>{assignments.filter((item) => item.completed < item.total).length}</p>
          </div>
        </div>
        {message ? <div style={{ marginTop: 12, color: "#1a7f37", fontSize: 13 }}>{message}</div> : null}
        {error ? <div style={{ marginTop: 12, color: "#b42318", fontSize: 13 }}>{error}</div> : null}
      </Card>

      <Card title="作业统计看板">
        <div className="grid grid-3">
          <div className="card">
            <div className="section-title">完成率</div>
            <p>{insights?.summary?.completionRate ?? 0}%</p>
          </div>
          <div className="card">
            <div className="section-title">正确率</div>
            <p>{insights?.summary?.accuracy ?? 0}%</p>
          </div>
          <div className="card">
            <div className="section-title">参与学生</div>
            <p>{insights?.summary?.students ?? 0} 人</p>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="section-title">薄弱知识点</div>
          {insights?.weakPoints?.length ? (
            <div className="grid" style={{ gap: 8 }}>
              {insights.weakPoints.map((item: any) => (
                <div className="card" key={item.id}>
                  <div className="section-title">{item.title}</div>
                  <p>
                    正确率 {item.ratio}% · 练习 {item.total} 次
                  </p>
                  <p>
                    {subjectLabel[item.subject] ?? item.subject} · {item.grade} 年级
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>暂无薄弱点数据。</p>
          )}
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="创建班级">
          <form onSubmit={handleCreateClass} style={{ display: "grid", gap: 12 }}>
            <label>
              <div className="section-title">班级名称</div>
              <input
                value={classForm.name}
                onChange={(event) => setClassForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="四年级一班"
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            <label>
              <div className="section-title">学科</div>
              <select
                value={classForm.subject}
                onChange={(event) => setClassForm((prev) => ({ ...prev, subject: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                <option value="math">数学</option>
                <option value="chinese">语文</option>
                <option value="english">英语</option>
              </select>
            </label>
            <label>
              <div className="section-title">年级</div>
              <select
                value={classForm.grade}
                onChange={(event) => setClassForm((prev) => ({ ...prev, grade: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                {["1", "2", "3", "4", "5", "6"].map((grade) => (
                  <option key={grade} value={grade}>
                    {grade} 年级
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "提交中..." : "创建班级"}
            </button>
          </form>
        </Card>

        <Card title="添加学生">
          <form onSubmit={handleAddStudent} style={{ display: "grid", gap: 12 }}>
            <label>
              <div className="section-title">选择班级</div>
              <select
                value={studentForm.classId}
                onChange={(event) => setStudentForm((prev) => ({ ...prev, classId: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <div className="section-title">学生邮箱</div>
              <input
                value={studentForm.email}
                onChange={(event) => setStudentForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="student@demo.com"
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "提交中..." : "加入班级"}
            </button>
          </form>
        </Card>
      </div>

      <Card title="作业发布">
        <form onSubmit={handleCreateAssignment} style={{ display: "grid", gap: 12 }}>
          <label>
            <div className="section-title">选择班级</div>
            <select
              value={assignmentForm.classId}
              onChange={(event) => setAssignmentForm((prev) => ({ ...prev, classId: event.target.value }))}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {subjectLabel[item.subject] ?? item.subject} · {item.grade} 年级
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="section-title">作业标题</div>
            <input
              value={assignmentForm.title}
              onChange={(event) => setAssignmentForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="本周单元练习"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">作业说明</div>
            <textarea
              value={assignmentForm.description}
              onChange={(event) => setAssignmentForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="建议完成后再做错题总结。"
              rows={3}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <div className="grid grid-2">
            <label>
              <div className="section-title">截止日期</div>
              <input
                type="date"
                value={assignmentForm.dueDate}
                onChange={(event) => setAssignmentForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            <label>
              <div className="section-title">题目数量</div>
              <input
                type="number"
                min={1}
                max={50}
                value={assignmentForm.questionCount}
                onChange={(event) =>
                  setAssignmentForm((prev) => ({ ...prev, questionCount: Number(event.target.value) }))
                }
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
          </div>
          <div className="grid grid-2">
            <label>
              <div className="section-title">出题方式</div>
              <select
                value={assignmentForm.mode}
                onChange={(event) => setAssignmentForm((prev) => ({ ...prev, mode: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                <option value="bank">题库抽题</option>
                <option value="ai">AI 生成</option>
              </select>
            </label>
            <label>
              <div className="section-title">难度</div>
              <select
                value={assignmentForm.difficulty}
                onChange={(event) => setAssignmentForm((prev) => ({ ...prev, difficulty: event.target.value }))}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              >
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">较难</option>
              </select>
            </label>
          </div>
          <label>
            <div className="section-title">题型</div>
            <select
              value={assignmentForm.questionType}
              onChange={(event) => setAssignmentForm((prev) => ({ ...prev, questionType: event.target.value }))}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="choice">选择题</option>
              <option value="application">应用题</option>
              <option value="calculation">计算题</option>
            </select>
          </label>
          <label>
            <div className="section-title">限定知识点（可选）</div>
            <select
              value={assignmentForm.knowledgePointId}
              onChange={(event) => setAssignmentForm((prev) => ({ ...prev, knowledgePointId: event.target.value }))}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="">不限</option>
              {filteredPoints.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.unit ? `${item.unit} / ` : ""}
                  {item.chapter} · {item.title}
                </option>
              ))}
            </select>
          </label>
          {assignmentForm.mode === "ai" ? (
            <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
              AI 生成会写入题库。建议选择知识点并确认已配置 LLM。
            </div>
          ) : null}
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? "提交中..." : "发布作业"}
          </button>
        </form>
      </Card>

      <Card title="班级列表">
        {classes.length === 0 ? (
          <p>暂无班级，请先创建班级。</p>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {classes.map((item) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.name}</div>
                <p>
                  {subjectLabel[item.subject] ?? item.subject} · {item.grade} 年级
                </p>
                <p>学生：{item.studentCount} 人</p>
                <p>作业：{item.assignmentCount} 份</p>
                <p>邀请码：{item.joinCode ?? "-"}</p>
                <div className="grid grid-2" style={{ marginTop: 8 }}>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => handleRegenerateCode(item.id)}
                  >
                    重新生成邀请码
                  </button>
                  <select
                    value={item.joinMode ?? "approval"}
                    onChange={(event) => handleUpdateJoinMode(item.id, event.target.value as "approval" | "auto")}
                    style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                  >
                    <option value="approval">需要审核</option>
                    <option value="auto">自动加入</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="加入班级申请">
        {joinRequests.filter((item) => item.status === "pending").length === 0 ? (
          <p>暂无待审核申请。</p>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {joinRequests
              .filter((item) => item.status === "pending")
              .map((item) => (
                <div className="card" key={item.id}>
                  <div className="section-title">{item.studentName}</div>
                  <p>{item.studentEmail}</p>
                  <p>
                    班级：{item.className} · {subjectLabel[item.subject] ?? item.subject} · {item.grade} 年级
                  </p>
                  <div className="cta-row">
                    <button className="button primary" type="button" onClick={() => handleApprove(item.id)}>
                      通过
                    </button>
                    <button className="button secondary" type="button" onClick={() => handleReject(item.id)}>
                      拒绝
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      <Card title="作业列表">
        {assignments.length === 0 ? (
          <p>暂无作业。</p>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {assignments.map((item) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                <p>
                  {item.className} · {subjectLabel[item.classSubject] ?? item.classSubject} · {item.classGrade} 年级
                </p>
                <p>截止日期：{new Date(item.dueDate).toLocaleDateString("zh-CN")}</p>
                <p>
                  完成情况：{item.completed}/{item.total}
                </p>
                <Link className="button secondary" href={`/teacher/assignments/${item.id}`} style={{ marginTop: 8 }}>
                  查看详情
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
