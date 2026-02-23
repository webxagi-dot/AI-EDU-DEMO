"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";

const subjectLabel: Record<string, string> = {
  math: "数学",
  chinese: "语文",
  english: "英语"
};

type KnowledgePoint = {
  id: string;
  subject: string;
  grade: string;
  title: string;
  chapter: string;
};

export default function KnowledgeTreePage() {
  const [list, setList] = useState<KnowledgePoint[]>([]);

  useEffect(() => {
    fetch("/api/knowledge-points")
      .then((res) => res.json())
      .then((data) => setList(data.data ?? []));
  }, []);

  const tree = list.reduce((acc, kp) => {
    if (!acc[kp.subject]) acc[kp.subject] = {};
    if (!acc[kp.subject][kp.grade]) acc[kp.subject][kp.grade] = {};
    if (!acc[kp.subject][kp.grade][kp.chapter]) acc[kp.subject][kp.grade][kp.chapter] = [];
    acc[kp.subject][kp.grade][kp.chapter].push(kp);
    return acc;
  }, {} as Record<string, Record<string, Record<string, KnowledgePoint[]>>>);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="知识点树（可视化）">
        {Object.keys(tree).length === 0 ? <p>暂无知识点。</p> : null}
        <div className="grid" style={{ gap: 12, marginTop: 12 }}>
          {Object.entries(tree).map(([subject, gradeMap]) => (
            <div className="card" key={subject}>
              <div className="section-title">{subjectLabel[subject] ?? subject}</div>
              <div className="grid" style={{ gap: 8, marginTop: 8 }}>
                {Object.entries(gradeMap).map(([grade, chapterMap]) => (
                  <div key={`${subject}-${grade}`}>
                    <div style={{ fontWeight: 600 }}>年级：{grade}</div>
                    <div className="grid" style={{ gap: 6, marginTop: 6 }}>
                      {Object.entries(chapterMap).map(([chapter, points]) => (
                        <div className="card" key={`${subject}-${grade}-${chapter}`}>
                          <div className="section-title" style={{ fontSize: 14 }}>
                            {chapter}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            {points.map((kp) => (
                              <span className="badge" key={kp.id}>
                                {kp.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
