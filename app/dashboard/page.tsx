"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { ASSIGNMENT_TYPE_LABELS, SUBJECT_LABELS } from "@/lib/constants";

type AssignmentItem = {
  id: string;
  title: string;
  dueDate: string;
  className: string;
  subject?: string;
  grade?: string;
  classSubject?: string;
  classGrade?: string;
  status?: string;
  completedAt?: string | null;
  submissionType?: "quiz" | "upload" | "essay";
};

type TeacherAssignment = {
  id: string;
  title: string;
  dueDate: string;
  className: string;
  classSubject: string;
  classGrade: string;
  total: number;
  completed: number;
  submissionType?: string;
};

type InboxThread = {
  id: string;
  subject: string;
  unreadCount: number;
  lastMessage?: { content: string };
};

type NotificationItem = {
  id: string;
  title: string;
  readAt?: string | null;
};

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setRole(data?.user?.role ?? null));
  }, []);

  useEffect(() => {
    if (!role) return;
    if (role === "student") {
      fetch("/api/student/assignments")
        .then((res) => res.json())
        .then((data) => setAssignments(data.data ?? []));
    } else if (role === "parent") {
      fetch("/api/parent/assignments")
        .then((res) => res.json())
        .then((data) => setAssignments(data.data ?? []));
    } else if (role === "teacher") {
      fetch("/api/teacher/assignments")
        .then((res) => res.json())
        .then((data) => setTeacherAssignments(data.data ?? []));
    }
    fetch("/api/inbox/threads")
      .then((res) => res.json())
      .then((data) => setThreads(data.data ?? []));
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => setNotifications(data.data ?? []));
  }, [role]);

  const unreadThreads = useMemo(
    () => threads.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0),
    [threads]
  );
  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications]
  );
  const now = Date.now();
  const upcomingAssignments = assignments
    .filter((item) => new Date(item.dueDate).getTime() >= now)
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>学习看板</h2>
          <div className="section-sub">课程待办、未读消息与通知提醒。</div>
        </div>
        <span className="chip">Dashboard</span>
      </div>

      <Card title="快捷概览" tag="总览">
        <div className="grid grid-2">
          <div className="card feature-card">
            <EduIcon name="board" />
            <div>
              <div className="section-title">未读消息</div>
              <p>{unreadThreads} 条</p>
            </div>
          </div>
          <div className="card feature-card">
            <EduIcon name="chart" />
            <div>
              <div className="section-title">未读通知</div>
              <p>{unreadNotifications} 条</p>
            </div>
          </div>
        </div>
        <div className="cta-row" style={{ marginTop: 12 }}>
          <Link className="button secondary" href="/inbox">
            查看收件箱
          </Link>
          <Link className="button ghost" href="/notifications">
            查看通知
          </Link>
        </div>
      </Card>

      {role === "teacher" ? (
        <Card title="教师待办" tag="教师">
          {teacherAssignments.length ? (
            <div className="grid" style={{ gap: 8 }}>
              {teacherAssignments.slice(0, 6).map((item) => (
                <div className="card" key={item.id}>
                  <div className="section-title">{item.title}</div>
                  <div className="section-sub">
                    {item.className} · {SUBJECT_LABELS[item.classSubject] ?? item.classSubject} · {item.classGrade} 年级
                  </div>
                  <div className="pill-list" style={{ marginTop: 8 }}>
                    <span className="pill">
                      已完成 {item.completed}/{item.total}
                    </span>
                    <span className="pill">
                      截止 {new Date(item.dueDate).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>暂无作业记录。</p>
          )}
          <div className="cta-row" style={{ marginTop: 12 }}>
            <Link className="button secondary" href="/teacher/submissions">
              打开提交箱
            </Link>
            <Link className="button ghost" href="/teacher/notifications">
              通知规则
            </Link>
          </div>
        </Card>
      ) : (
        <Card title="近期作业" tag="待办">
          {upcomingAssignments.length ? (
            <div className="grid" style={{ gap: 8 }}>
              {upcomingAssignments.map((item) => (
                <div className="card" key={item.id}>
                  <div className="section-title">{item.title}</div>
                  <div className="section-sub">
                    {item.className} ·{" "}
                    {SUBJECT_LABELS[item.subject ?? item.classSubject ?? ""] ??
                      item.subject ??
                      item.classSubject ??
                      "-"}{" "}
                    · {(item.grade ?? item.classGrade) ?? "-"} 年级
                  </div>
                  <div className="pill-list" style={{ marginTop: 8 }}>
                    <span className="pill">
                      截止 {new Date(item.dueDate).toLocaleDateString("zh-CN")}
                    </span>
                    <span className="pill">
                      {ASSIGNMENT_TYPE_LABELS[item.submissionType ?? "quiz"]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>暂无待办作业。</p>
          )}
          <div className="cta-row" style={{ marginTop: 12 }}>
            <Link className="button secondary" href="/student/assignments">
              进入作业中心
            </Link>
            <Link className="button ghost" href="/calendar">
              查看日程
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
