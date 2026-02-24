"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";

type ClassItem = {
  id: string;
  name: string;
  subject: string;
  grade: string;
};

type ThreadSummary = {
  id: string;
  subject: string;
  updatedAt: string;
  participants: Array<{ id: string; name: string; role: string }>;
  lastMessage?: { content: string; createdAt: string } | null;
  unreadCount: number;
};

type ThreadDetail = {
  thread: { id: string; subject: string };
  participants: Array<{ id: string; name: string; role: string }>;
  messages: Array<{ id: string; senderId?: string; content: string; createdAt: string }>;
};

export default function InboxPage() {
  const [role, setRole] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThread, setActiveThread] = useState<ThreadSummary | null>(null);
  const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [replyText, setReplyText] = useState("");
  const [includeParents, setIncludeParents] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadThreads() {
    const res = await fetch("/api/inbox/threads");
    const data = await res.json();
    if (res.ok) {
      setThreads(data.data ?? []);
      if (data.data?.length) {
        setActiveThread(data.data[0]);
      } else {
        setActiveThread(null);
        setThreadDetail(null);
      }
    }
  }

  async function loadThreadDetail(threadId: string) {
    const res = await fetch(`/api/inbox/threads/${threadId}`);
    const data = await res.json();
    if (res.ok) {
      setThreadDetail(data.data);
    }
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setRole(data?.user?.role ?? null));
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.data ?? []);
        if (data.data?.length) setClassId(data.data[0].id);
      });
    loadThreads();
  }, []);

  useEffect(() => {
    if (activeThread?.id) {
      loadThreadDetail(activeThread.id);
    }
  }, [activeThread?.id]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/inbox/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, content, classId, includeParents })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "发送失败");
    } else {
      setMessage("消息已发送");
      setSubject("");
      setContent("");
      setIncludeParents(false);
      await loadThreads();
    }
    setLoading(false);
  }

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!activeThread) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/inbox/threads/${activeThread.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "发送失败");
    } else {
      setReplyText("");
      await loadThreads();
      await loadThreadDetail(activeThread.id);
    }
    setLoading(false);
  }

  const currentClass = classes.find((item) => item.id === classId);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>站内信 / 收件箱</h2>
          <div className="section-sub">与老师、学生和家长保持沟通。</div>
        </div>
        <span className="chip">Inbox</span>
      </div>

      <Card title="发送新消息" tag="新建">
        <div className="feature-card">
          <EduIcon name="board" />
          <p>支持按班级发送，统一同步给学生与家长。</p>
        </div>
        <form onSubmit={handleCreate} style={{ display: "grid", gap: 12 }}>
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
          <label>
            <div className="section-title">主题</div>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">内容</div>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          {role === "teacher" ? (
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={includeParents}
                onChange={(event) => setIncludeParents(event.target.checked)}
              />
              同时抄送家长
            </label>
          ) : null}
          {currentClass ? (
            <div className="section-sub">
              发送给：{currentClass.name} · {SUBJECT_LABELS[currentClass.subject] ?? currentClass.subject}
            </div>
          ) : null}
          {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
          {message ? <div style={{ color: "#027a48", fontSize: 13 }}>{message}</div> : null}
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? "发送中..." : "发送消息"}
          </button>
        </form>
      </Card>

      <div className="grid grid-2">
        <Card title="会话列表" tag="Threads">
          {threads.length ? (
            <div className="grid" style={{ gap: 10 }}>
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  className="card"
                  style={{
                    textAlign: "left",
                    border: thread.id === activeThread?.id ? "1px solid rgba(27,108,168,0.5)" : "1px solid var(--stroke)"
                  }}
                  onClick={() => setActiveThread(thread)}
                >
                  <div className="card-header">
                    <div className="section-title">{thread.subject}</div>
                    {thread.unreadCount ? <span className="card-tag">{thread.unreadCount} 未读</span> : null}
                  </div>
                  <div className="section-sub">
                    {thread.participants.map((p) => p.name).join("、") || "对话"}
                  </div>
                  {thread.lastMessage ? (
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-1)" }}>
                      {thread.lastMessage.content}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p>暂无会话。</p>
          )}
        </Card>

        <Card title="会话详情" tag="消息">
          {threadDetail ? (
            <>
              <div className="section-title">{threadDetail.thread.subject}</div>
              <div className="section-sub">
                参与人：{threadDetail.participants.map((p) => p.name).join("、") || "-"}
              </div>
              <div className="grid" style={{ gap: 8, marginTop: 12 }}>
                {threadDetail.messages.map((msg) => (
                  <div key={msg.id} className="card">
                    <div className="section-sub">{new Date(msg.createdAt).toLocaleString("zh-CN")}</div>
                    <p style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{msg.content}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleReply} style={{ display: "grid", gap: 8, marginTop: 12 }}>
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  rows={3}
                  placeholder="输入回复..."
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
                <button className="button primary" type="submit" disabled={loading || !replyText.trim()}>
                  {loading ? "发送中..." : "发送回复"}
                </button>
              </form>
            </>
          ) : (
            <p>请选择一个会话查看详情。</p>
          )}
        </Card>
      </div>
    </div>
  );
}
