"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserMenuProps = {
  user?: { name: string; role: string } | null;
};

export default function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setLoading(false);
    router.push("/login");
    router.refresh();
  }

  if (!user) {
    return (
      <a className="button secondary" href="/login">
        登录
      </a>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 13, color: "var(--ink-1)" }}>{user.name}</div>
      <button className="button secondary" onClick={handleLogout} disabled={loading}>
        {loading ? "退出中" : "退出"}
      </button>
    </div>
  );
}
