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

type Topic = {
  id: string;
  classId: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  authorName?: string;
};

type Reply = {
  id: string;
  content: string;
  createdAt: string;
  authorName?: string;
};

export default function DiscussionsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
  }, []);

  async function loadTopics(selectedClassId?: string) {
    const query = selectedClassId ? `?classId=${selectedClassId}` : "";
    const res = await fetch(`/api/discussions${query}`);
    const data = await res.json();
    if (res.ok) {
      setTopics(data.data ?? []);
      if (data.data?.length) {
        setActiveTopic(data.data[0]);
      } else {
        setActiveTopic(null);
        setReplies([]);
      }
    }
  }

  async function loadTopicDetail(topicId: string) {
    const res = await fetch(`/api/discussions/${topicId}`);
    const data = await res.json();
    if (res.ok) {
      setActiveTopic(data.topic);
      setReplies(data.replies ?? []);
    }
  }

  useEffect(() => {
    if (classId) loadTopics(classId);
  }, [classId]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/discussions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, title, content, pinned })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "发布失败");
    } else {
      setMessage("话题已发布");
      setTitle("");
      setContent("");
      setPinned(false);
      await loadTopics(classId);
    }
    setLoading(false);
  }

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!activeTopic) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/discussions/${activeTopic.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "回复失败");
    } else {
      setReplyText("");
      await loadTopicDetail(activeTopic.id);
    }
    setLoading(false);
  }

  const currentClass = classes.find((item) => item.id === classId);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>课程讨论区</h2>
          <div className="section-sub">课程话题交流、答疑与讨论。</div>
        </div>
        <span className="chip">讨论</span>
      </div>

      <Card title="班级选择" tag="课程">
        {classes.length ? (
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
        ) : (
          <p>暂无班级。</p>
        )}
      </Card>

      {role === "teacher" ? (
        <Card title="发布新话题" tag="教师">
          <div className="feature-card">
            <EduIcon name="pencil" />
            <p>发布讨论话题，引导学生展开交流与互评。</p>
          </div>
          <form onSubmit={handleCreate} style={{ display: "grid", gap: 12 }}>
            <label>
              <div className="section-title">话题标题</div>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            <label>
              <div className="section-title">话题内容</div>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={4}
                style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
              />
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
              置顶话题
            </label>
            {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
            {message ? <div style={{ color: "#027a48", fontSize: 13 }}>{message}</div> : null}
            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "发布中..." : "发布话题"}
            </button>
          </form>
        </Card>
      ) : null}

      <div className="grid grid-2">
        <Card title="话题列表" tag="最新">
          {topics.length ? (
            <div className="grid" style={{ gap: 10 }}>
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  className="card"
                  style={{
                    textAlign: "left",
                    border: topic.id === activeTopic?.id ? "1px solid rgba(27,108,168,0.5)" : "1px solid var(--stroke)"
                  }}
                  onClick={() => loadTopicDetail(topic.id)}
                >
                  <div className="card-header">
                    <div className="section-title">
                      {topic.pinned ? "置顶 · " : ""} {topic.title}
                    </div>
                    <span className="card-tag">{new Date(topic.createdAt).toLocaleDateString("zh-CN")}</span>
                  </div>
                  <div className="section-sub">
                    {currentClass ? currentClass.name : ""} · {topic.authorName ?? "老师"}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p>暂无话题。</p>
          )}
        </Card>

        <Card title="话题详情" tag="讨论">
          {activeTopic ? (
            <>
              <div className="section-title">{activeTopic.title}</div>
              <div className="section-sub">
                {activeTopic.authorName ?? "老师"} · {new Date(activeTopic.createdAt).toLocaleString("zh-CN")}
              </div>
              <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{activeTopic.content}</p>
              <div style={{ marginTop: 12 }}>
                <div className="section-title">回复</div>
                {replies.length ? (
                  <div className="grid" style={{ gap: 8, marginTop: 8 }}>
                    {replies.map((reply) => (
                      <div key={reply.id} className="card">
                        <div className="section-sub">
                          {reply.authorName ?? "成员"} · {new Date(reply.createdAt).toLocaleString("zh-CN")}
                        </div>
                        <p style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{reply.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginTop: 6 }}>暂无回复。</p>
                )}
              </div>
              <form onSubmit={handleReply} style={{ display: "grid", gap: 8, marginTop: 12 }}>
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  rows={3}
                  placeholder="写下你的回复..."
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
                />
                {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
                <button className="button primary" type="submit" disabled={loading || !replyText.trim()}>
                  {loading ? "发送中..." : "发送回复"}
                </button>
              </form>
            </>
          ) : (
            <p>请选择一个话题查看详情。</p>
          )}
        </Card>
      </div>
    </div>
  );
}
