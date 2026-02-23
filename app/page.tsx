import Link from "next/link";
import Card from "@/components/Card";
import Stat from "@/components/Stat";

export default function Home() {
  return (
    <div className="grid" style={{ gap: 28 }}>
      <section className="hero">
        <div>
          <div className="badge">小学课后辅导 MVP</div>
          <h1>让每个孩子都能学懂、学会、看到进步</h1>
          <p>
            面向小学 1-6 年级，紧贴人教版知识点。用 AI 诊断测评、分层讲解与
            练习巩固，帮助家长掌握孩子的学习情况。
          </p>
          <div className="cta-row">
            <Link className="button primary" href="/student">
              开始学习
            </Link>
            <Link className="button secondary" href="/diagnostic">
              进入诊断
            </Link>
          </div>
        </div>
        <Card title="本周学习概览">
          <div className="grid grid-2">
            <Stat label="完成度" value="68%" helper="本周计划已完成" />
            <Stat label="正确率" value="82%" helper="近 3 天均值" />
            <Stat label="薄弱点" value="分数应用" helper="数学四年级" />
            <Stat label="学习时长" value="96 分钟" helper="本周累计" />
          </div>
        </Card>
      </section>

      <section className="grid grid-3">
        <Card title="诊断测评">
          <p>快速定位薄弱知识点，生成个性化学习计划。</p>
        </Card>
        <Card title="AI 辅导">
          <p>逐步提示、类比讲解、追问检查，帮助孩子真正理解。</p>
        </Card>
        <Card title="错题本">
          <p>自动归因 + 间隔复习，让错题变成提分点。</p>
        </Card>
      </section>

      <section className="grid grid-2">
        <Card title="家长周报">
          <p>一键查看孩子的学习进度、薄弱点和可执行的辅导建议。</p>
          <Link className="button secondary" href="/parent" style={{ marginTop: 12 }}>
            查看家长端
          </Link>
        </Card>
        <Card title="管理端">
          <p>维护题库与知识点树，追踪学生的整体表现。</p>
          <Link className="button secondary" href="/admin" style={{ marginTop: 12 }}>
            进入管理端
          </Link>
        </Card>
      </section>
    </div>
  );
}
