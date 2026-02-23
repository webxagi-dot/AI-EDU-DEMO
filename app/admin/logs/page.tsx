"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";

type AdminLog = {
  id: string;
  adminId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  detail?: string | null;
  createdAt: string;
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);

  useEffect(() => {
    fetch("/api/admin/logs")
      .then((res) => res.json())
      .then((data) => setLogs(data.data ?? []));
  }, []);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="操作日志">
        {logs.length === 0 ? <p>暂无日志。</p> : null}
        <div className="grid" style={{ gap: 10 }}>
          {logs.map((log) => (
            <div className="card" key={log.id}>
              <div className="section-title">{log.action}</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                {new Date(log.createdAt).toLocaleString("zh-CN")} · 管理员 {log.adminId ?? "-"}
              </div>
              <div style={{ marginTop: 6, fontSize: 12 }}>
                {log.entityType} · {log.entityId ?? "-"}
              </div>
              {log.detail ? <div style={{ marginTop: 6 }}>{log.detail}</div> : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
