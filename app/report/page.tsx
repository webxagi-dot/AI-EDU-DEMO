"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";

export default function ReportPage() {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    fetch("/api/report/weekly")
      .then((res) => res.json())
      .then((data) => setReport(data));
  }, []);

  if (!report) {
    return <Card title="学习报告">加载中...</Card>;
  }

  if (report.error) {
    return <Card title="学习报告">请先登录学生账号。</Card>;
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="学习报告">
        <div className="grid grid-2">
          <div className="card">
            <div className="section-title">本周练习题量</div>
            <p>{report.stats.total} 题</p>
          </div>
          <div className="card">
            <div className="section-title">正确率</div>
            <p>{report.stats.accuracy}%</p>
          </div>
        </div>
      </Card>
      <Card title="薄弱点">
        <div className="grid" style={{ gap: 8 }}>
          {report.weakPoints?.length ? (
            report.weakPoints.map((item: any) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                <p>正确率 {item.ratio}%</p>
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
