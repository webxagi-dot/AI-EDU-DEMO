"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import EduIcon from "@/components/EduIcon";

type FavoriteItem = {
  id: string;
  questionId: string;
  tags: string[];
  updatedAt: string;
  question?: {
    id: string;
    stem: string;
    subject: string;
    grade: string;
    knowledgePointTitle: string;
  } | null;
};

export default function StudentFavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [filterTag, setFilterTag] = useState("");

  async function load() {
    const res = await fetch("/api/favorites?includeQuestion=1");
    const data = await res.json();
    setFavorites(data?.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function editTags(item: FavoriteItem) {
    const input = prompt("输入标签（用逗号分隔）", item.tags?.join(",") ?? "");
    if (input === null) return;
    const tags = input
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await fetch(`/api/favorites/${item.questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags })
    });
    load();
  }

  async function remove(item: FavoriteItem) {
    await fetch(`/api/favorites/${item.questionId}`, { method: "DELETE" });
    load();
  }

  const filtered = filterTag
    ? favorites.filter((item) => item.tags?.some((tag) => tag.includes(filterTag)))
    : favorites;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="section-head">
        <div>
          <h2>题目收藏夹</h2>
          <div className="section-sub">收藏题目 + 自定义标签，便于复习。</div>
        </div>
        <span className="chip">收藏</span>
      </div>

      <Card title="收藏筛选" tag="标签">
        <div className="grid grid-2">
          <label>
            <div className="section-title">标签关键字</div>
            <input
              value={filterTag}
              onChange={(event) => setFilterTag(event.target.value)}
              placeholder="例如：分数、应用题"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid var(--stroke)" }}
            />
          </label>
          <div className="card" style={{ alignSelf: "end" }}>
            <div className="section-title">收藏数</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{favorites.length}</div>
          </div>
        </div>
      </Card>

      <Card title="我的收藏" tag="清单">
        <div className="grid" style={{ gap: 10 }}>
          {filtered.length === 0 ? <p>暂无收藏记录。</p> : null}
          {filtered.map((item) => (
            <div className="card" key={item.id}>
              <div className="feature-card">
                <EduIcon name="book" />
                <div>
                  <div className="section-title">{item.question?.stem ?? "题目"}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-1)" }}>
                    {item.question?.knowledgePointTitle ?? "知识点"} · {item.question?.grade ?? "-"} 年级
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-1)" }}>
                标签：{item.tags?.length ? item.tags.join("、") : "未设置"}
              </div>
              <div className="cta-row" style={{ marginTop: 10 }}>
                <button className="button secondary" onClick={() => editTags(item)}>
                  编辑标签
                </button>
                <button className="button secondary" onClick={() => remove(item)}>
                  取消收藏
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
