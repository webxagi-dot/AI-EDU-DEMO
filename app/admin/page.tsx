import Card from "@/components/Card";
import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="题库管理">
        <p>维护题库、解析与难度标签。</p>
        <Link className="button secondary" href="/admin/questions" style={{ marginTop: 12 }}>
          进入题库
        </Link>
      </Card>
      <Card title="知识点树">
        <p>人教版小学：学科 → 年级 → 单元 → 知识点。</p>
        <Link className="button secondary" href="/admin/knowledge-points" style={{ marginTop: 12 }}>
          管理知识点
        </Link>
      </Card>
      <Card title="学生概览">
        <p>本周活跃 128 人，完成诊断 72 人。</p>
      </Card>
    </div>
  );
}
