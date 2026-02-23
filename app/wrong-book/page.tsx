"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";

type Question = {
  id: string;
  stem: string;
  explanation: string;
  options: string[];
  answer: string;
  subject: string;
  grade: string;
  knowledgePointId: string;
};

type CorrectionTask = {
  id: string;
  questionId: string;
  status: "pending" | "completed";
  dueDate: string;
  createdAt: string;
  completedAt?: string | null;
  question?: Question | null;
};

type Summary = {
  pending: number;
  overdue: number;
  dueSoon: number;
  completed: number;
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function WrongBookPage() {
  const [list, setList] = useState<Question[]>([]);
  const [tasks, setTasks] = useState<CorrectionTask[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const defaultDueDate = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + 3);
    return toDateInputValue(base);
  }, []);

  const [dueDate, setDueDate] = useState(defaultDueDate);

  async function load() {
    const [wrongRes, taskRes] = await Promise.all([fetch("/api/wrong-book"), fetch("/api/corrections")]);
    const wrongData = await wrongRes.json();
    const taskData = await taskRes.json();
    setList(wrongData.data ?? []);
    setTasks(taskData.data ?? []);
    setSummary(taskData.summary ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCreateTasks() {
    setMessage(null);
    setErrors([]);
    const ids = list.filter((item) => selected[item.id]).map((item) => item.id);
    if (!ids.length) {
      setErrors(["请先选择要订正的错题。"]);
      return;
    }

    const res = await fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: ids, dueDate })
    });
    const data = await res.json();
    if (!res.ok) {
      setErrors([data?.error ?? "创建任务失败"]);
      return;
    }

    const failed = data.skipped ?? [];
    if (failed.length) {
      setErrors(failed.map((item: any) => `${item.questionId}：${item.reason}`));
    }
    setMessage(`已创建 ${data.created?.length ?? 0} 个订正任务。`);
    setSelected({});
    load();
  }

  async function handleComplete(id: string) {
    await fetch(`/api/corrections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" })
    });
    load();
  }

  function formatDate(value?: string) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("zh-CN");
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="订正任务">
        <div className="grid grid-2">
          <div className="card">
            <div className="section-title">待订正</div>
            <p>{summary?.pending ?? 0} 题</p>
          </div>
          <div className="card">
            <div className="section-title">逾期</div>
            <p>{summary?.overdue ?? 0} 题</p>
          </div>
          <div className="card">
            <div className="section-title">2 天内到期</div>
            <p>{summary?.dueSoon ?? 0} 题</p>
          </div>
          <div className="card">
            <div className="section-title">已完成</div>
            <p>{summary?.completed ?? 0} 题</p>
          </div>
        </div>
        <div className="grid" style={{ gap: 12, marginTop: 12 }}>
          {tasks.length === 0 ? <p>暂无订正任务。</p> : null}
          {tasks.map((task) => {
            const overdue = task.status === "pending" && new Date(task.dueDate).getTime() < Date.now();
            return (
              <div className="card" key={task.id} style={{ borderColor: overdue ? "#d92d20" : "var(--stroke)" }}>
                <div className="section-title">{task.question?.stem ?? "题目已删除"}</div>
                <p style={{ color: "var(--ink-1)" }}>截止：{formatDate(task.dueDate)}</p>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div className="badge">状态：{task.status === "completed" ? "已完成" : overdue ? "逾期" : "待订正"}</div>
                  {task.status === "completed" ? (
                    <div className="badge">完成时间：{formatDate(task.completedAt ?? undefined)}</div>
                  ) : (
                    <button className="button secondary" onClick={() => handleComplete(task.id)}>
                      标记完成
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="从错题生成订正任务">
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            <div className="section-title">截止日期</div>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <div className="grid" style={{ gap: 12 }}>
            {list.length === 0 ? <p>暂无错题，继续保持！</p> : null}
            {list.map((item) => (
              <div className="card" key={item.id}>
                <label style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(selected[item.id])}
                    onChange={() => toggleSelect(item.id)}
                    style={{ marginTop: 6 }}
                  />
                  <div>
                    <div className="section-title">{item.stem}</div>
                    <p>{item.explanation}</p>
                  </div>
                </label>
              </div>
            ))}
          </div>
          <button className="button primary" type="button" onClick={handleCreateTasks}>
            创建订正任务
          </button>
          {message ? <div>{message}</div> : null}
          {errors.length ? (
            <div style={{ color: "#b42318", fontSize: 13 }}>
              {errors.slice(0, 5).map((err) => (
                <div key={err}>{err}</div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <Card title="错题本">
        <div className="grid" style={{ gap: 12 }}>
          {list.length === 0 ? <p>暂无错题，继续保持！</p> : null}
          {list.map((item) => (
            <div className="card" key={item.id}>
              <div className="section-title">{item.stem}</div>
              <p>{item.explanation}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
