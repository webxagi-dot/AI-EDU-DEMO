"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import Stat from "@/components/Stat";

export default function ParentPage() {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    fetch("/api/report/weekly")
      .then((res) => res.json())
      .then((data) => setReport(data));
  }, []);

  if (!report) {
    return <Card title="家长周报">加载中...</Card>;
  }

  if (report.error) {
    return <Card title="家长周报">请先登录家长账号。</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="家长周报">
        <div className="grid grid-2">
          <Stat label="完成题量" value={`${report.stats.total} 题`} helper="近 7 天" />
          <Stat label="正确率" value={`${report.stats.accuracy}%`} helper="近 7 天" />
        </div>
      </Card>
      <Card title="薄弱点与建议">
        <div className="grid" style={{ gap: 8 }}>
          {report.weakPoints?.length ? (
            report.weakPoints.map((item: any) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                <p>正确率 {item.ratio}%</p>
                <p>建议：本周补做 5 题，巩固该知识点。</p>
              </div>
            ))
          ) : (
            <p>暂无薄弱点数据。</p>
          )}
        </div>
      </Card>
    </div>
  );
}
