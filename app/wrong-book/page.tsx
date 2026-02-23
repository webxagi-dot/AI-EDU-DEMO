"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";

type Question = {
  id: string;
  stem: string;
  explanation: string;
};

export default function WrongBookPage() {
  const [list, setList] = useState<Question[]>([]);

  useEffect(() => {
    fetch("/api/wrong-book")
      .then((res) => res.json())
      .then((data) => setList(data.data ?? []));
  }, []);

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="错题本">
        <div className="grid" style={{ gap: 12 }}>
          {list.length === 0 ? <p>暂无错题，继续保持！</p> : null}
          {list.map((item) => (
            <div className="card" key={item.id}>
              <div className="section-title">{item.stem}</div>
              <p>{item.explanation}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
