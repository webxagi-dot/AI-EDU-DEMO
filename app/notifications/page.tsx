"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";

type Notification = {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  readAt?: string;
};

export default function NotificationsPage() {
  const [list, setList] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/notifications");
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "加载失败");
      return;
    }
    setList(data.data ?? []);
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    load();
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return <Card title="通知中心">{error}</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="通知中心">
        {list.length === 0 ? (
          <p>暂无通知。</p>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {list.map((item) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                <p>{item.content}</p>
                <p style={{ fontSize: 12, color: "var(--ink-1)" }}>
                  {new Date(item.createdAt).toLocaleString("zh-CN")}
                </p>
                {item.readAt ? (
                  <span className="badge">已读</span>
                ) : (
                  <button className="button secondary" type="button" onClick={() => markRead(item.id)}>
                    标记已读
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
