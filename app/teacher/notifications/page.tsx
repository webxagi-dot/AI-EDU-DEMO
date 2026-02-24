"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";
import { SUBJECT_LABELS } from "@/lib/constants";

type ClassItem = { id: string; name: string; subject: string; grade: string };
type RuleItem = {
  id: string;
  classId: string;
  enabled: boolean;
  dueDays: number;
  overdueDays: number;
  includeParents: boolean;
};

export default function TeacherNotificationRulesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/teacher/notifications/rules");
    const payload = await res.json();
    if (res.ok) {
      setClasses(payload.classes ?? []);
      setRules(payload.rules ?? []);
      if (payload.classes?.length && !classId) {
        setClassId(payload.classes[0].id);
      }
    } else {
      setError(payload?.error ?? "加载失败");
    }
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentRule = useMemo(() => {
    return (
      rules.find((rule) => rule.classId === classId) ?? {
        id: "",
        classId,
        enabled: true,
        dueDays: 2,
        overdueDays: 0,
        includeParents: true
      }
    );
  }, [rules, classId]);

  function updateRule(patch: Partial<RuleItem>) {
    setRules((prev) => {
      const index = prev.findIndex((item) => item.classId === classId);
      const next = { ...currentRule, ...patch, classId };
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = next;
        return updated;
      }
      return [...prev, next];
    });
  }

  async function handleSave() {
    if (!classId) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/teacher/notifications/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        enabled: currentRule.enabled,
        dueDays: currentRule.dueDays,
        overdueDays: currentRule.overdueDays,
        includeParents: currentRule.includeParents
      })
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "保存失败");
    } else {
      setMessage("通知规则已保存");
      await load();
    }
    setLoading(false);
  }

  async function handleRun() {
    if (!classId) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/teacher/notifications/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId })
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error ?? "发送失败");
    } else {
      setMessage(`已发送提醒：学生 ${payload.data?.students ?? 0} 人，家长 ${payload.data?.parents ?? 0} 人。`);
    }
    setLoading(false);
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>通知规则</h2>
          <div className="section-sub">设置截止前/逾期提醒并支持家长抄送。</div>
        </div>
        <span className="chip">教师端</span>
      </div>

      <Card title="规则配置" tag="规则">
        <div className="feature-card">
          <EduIcon name="rocket" />
          <p>当前为手动触发模式，点击“立即发送提醒”即可执行一次规则。</p>
        </div>
        <div className="grid grid-2" style={{ alignItems: "end", marginTop: 12 }}>
          <label>
            <div className="section-title">选择班级</div>
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name} · {SUBJECT_LABELS[klass.subject] ?? klass.subject} · {klass.grade} 年级
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="section-title">提醒开关</div>
            <select
              value={currentRule.enabled ? "on" : "off"}
              onChange={(event) => updateRule({ enabled: event.target.value === "on" })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            >
              <option value="on">开启</option>
              <option value="off">关闭</option>
            </select>
          </label>
          <label>
            <div className="section-title">截止前提醒（天）</div>
            <input
              type="number"
              min={0}
              value={currentRule.dueDays}
              onChange={(event) => updateRule({ dueDays: Number(event.target.value) })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">逾期提醒（天）</div>
            <input
              type="number"
              min={0}
              value={currentRule.overdueDays}
              onChange={(event) => updateRule({ overdueDays: Number(event.target.value) })}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={currentRule.includeParents}
              onChange={(event) => updateRule({ includeParents: event.target.checked })}
            />
            抄送家长
          </label>
        </div>
        {error ? <div style={{ marginTop: 8, color: "#b42318", fontSize: 13 }}>{error}</div> : null}
        {message ? <div style={{ marginTop: 8, color: "#027a48", fontSize: 13 }}>{message}</div> : null}
        <div className="cta-row" style={{ marginTop: 12 }}>
          <button className="button secondary" type="button" onClick={handleSave} disabled={loading}>
            保存规则
          </button>
          <button className="button primary" type="button" onClick={handleRun} disabled={loading}>
            立即发送提醒
          </button>
        </div>
      </Card>
    </div>
  );
}
