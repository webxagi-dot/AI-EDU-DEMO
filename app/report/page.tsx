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
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <div className="card">
            <div className="section-title">上周练习题量</div>
            <p>{report.previousStats?.total ?? 0} 题</p>
          </div>
          <div className="card">
            <div className="section-title">上周正确率</div>
            <p>{report.previousStats?.accuracy ?? 0}%</p>
          </div>
        </div>
      </Card>
      <Card title="学习趋势（近 7 天）">
        <div className="grid" style={{ gap: 8 }}>
          {report.trend?.map((item: any) => (
            <div key={item.date} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 80, fontSize: 12, color: "var(--ink-1)" }}>{item.date}</div>
              <div style={{ flex: 1, background: "rgba(30,90,122,0.08)", borderRadius: 999, height: 10 }}>
                <div
                  style={{
                    width: `${item.accuracy}%`,
                    background: "var(--brand-0)",
                    height: 10,
                    borderRadius: 999
                  }}
                />
              </div>
              <div style={{ width: 40, fontSize: 12 }}>{item.accuracy}%</div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="薄弱点">
        <div className="grid" style={{ gap: 8 }}>
          {report.weakPoints?.length ? (
            report.weakPoints.map((item: any) => (
              <div className="card" key={item.id}>
                <div className="section-title">{item.title}</div>
                <p>
                  正确率 {item.ratio}% · 练习 {item.total} 题
                </p>
              </div>
            ))
          ) : (
            <p>暂无薄弱点数据。</p>
          )}
        </div>
        {report.suggestions?.length ? (
          <div style={{ marginTop: 12 }}>
            <div className="badge">学习建议</div>
            <div className="grid" style={{ gap: 6, marginTop: 8 }}>
              {report.suggestions.map((item: string, idx: number) => (
                <div key={`${item}-${idx}`}>{item}</div>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
