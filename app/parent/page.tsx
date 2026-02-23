"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import Stat from "@/components/Stat";

export default function ParentPage() {
  const [report, setReport] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [reminderCopied, setReminderCopied] = useState(false);

  useEffect(() => {
    fetch("/api/report/weekly")
      .then((res) => res.json())
      .then((data) => setReport(data));
    fetch("/api/corrections")
      .then((res) => res.json())
      .then((data) => {
        setTasks(data.data ?? []);
        setSummary(data.summary ?? null);
      });
  }, []);

  if (!report) {
    return <Card title="家长周报">加载中...</Card>;
  }

  if (report.error) {
    return <Card title="家长周报">请先登录家长账号。</Card>;
  }

  const pendingTasks = tasks.filter((task) => task.status === "pending");
  const dueSoonTasks = pendingTasks.filter((task) => {
    const diff = new Date(task.dueDate).getTime() - Date.now();
    return diff >= 0 && diff <= 2 * 24 * 60 * 60 * 1000;
  });
  const overdueTasks = pendingTasks.filter((task) => new Date(task.dueDate).getTime() < Date.now());
  const reminderText = [
    `本周订正任务：待完成 ${summary?.pending ?? pendingTasks.length} 题。`,
    overdueTasks.length ? `已逾期 ${overdueTasks.length} 题，请尽快完成。` : "",
    dueSoonTasks.length ? `近 2 天到期 ${dueSoonTasks.length} 题。` : "",
    ...dueSoonTasks.slice(0, 3).map((task) => `- ${task.question?.stem ?? "题目"}（截止 ${new Date(task.dueDate).toLocaleDateString("zh-CN")}）`)
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="家长周报">
        <div className="grid grid-2">
          <Stat label="完成题量" value={`${report.stats.total} 题`} helper="近 7 天" />
          <Stat label="正确率" value={`${report.stats.accuracy}%`} helper="近 7 天" />
        </div>
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <div className="card">
            <div className="section-title">上周完成题量</div>
            <p>{report.previousStats?.total ?? 0} 题</p>
          </div>
          <div className="card">
            <div className="section-title">上周正确率</div>
            <p>{report.previousStats?.accuracy ?? 0}%</p>
          </div>
        </div>
      </Card>
      <Card title="薄弱点与建议">
        <div className="grid" style={{ gap: 8 }}>
          {report.weakPoints?.length ? (
            report.weakPoints.map((item: any) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                <p>正确率 {item.ratio}%</p>
                <p>建议：本周补做 5 题，巩固该知识点。</p>
              </div>
            ))
          ) : (
            <p>暂无薄弱点数据。</p>
          )}
        </div>
        {report.suggestions?.length ? (
          <div style={{ marginTop: 12 }}>
            <div className="badge">本周建议</div>
            <div className="grid" style={{ gap: 6, marginTop: 8 }}>
              {report.suggestions.map((item: string, idx: number) => (
                <div key={`${item}-${idx}`}>{item}</div>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
      <Card title="订正任务提醒">
        <div className="grid grid-2">
          <div className="card">
            <div className="section-title">待订正</div>
            <p>{summary?.pending ?? pendingTasks.length} 题</p>
          </div>
          <div className="card">
            <div className="section-title">逾期</div>
            <p>{summary?.overdue ?? overdueTasks.length} 题</p>
          </div>
          <div className="card">
            <div className="section-title">2 天内到期</div>
            <p>{summary?.dueSoon ?? dueSoonTasks.length} 题</p>
          </div>
          <div className="card">
            <div className="section-title">已完成</div>
            <p>{summary?.completed ?? 0} 题</p>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="section-title">提醒文案</div>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--ink-1)" }}>{reminderText}</pre>
        </div>
        <div className="cta-row">
          <button
            className="button secondary"
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(reminderText);
                setReminderCopied(true);
                setTimeout(() => setReminderCopied(false), 2000);
              } catch {
                setReminderCopied(false);
              }
            }}
          >
            {reminderCopied ? "已复制" : "复制提醒文案"}
          </button>
        </div>
      </Card>
    </div>
  );
}
