"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "登录失败");
      }
      if (data.role === "admin") {
        router.push("/admin");
      } else if (data.role === "parent") {
        router.push("/parent");
      } else {
        router.push("/student");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 18, maxWidth: 420 }}>
      <Card title="登录">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label>
            <div className="section-title">邮箱</div>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@demo.com"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <label>
            <div className="section-title">密码</div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Student123"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          {error ? <div style={{ color: "#b42318", fontSize: 13 }}>{error}</div> : null}
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
        <div style={{ marginTop: 12, fontSize: 13, color: "var(--ink-1)" }}>
          演示账号：student@demo.com / Student123
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: "var(--ink-1)" }}>
          没有账号？<a href="/register">去注册</a>
        </div>
      </Card>
    </div>
  );
}
