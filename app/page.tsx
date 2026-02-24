import Link from "next/link";
import Card from "@/components/Card";
import Stat from "@/components/Stat";
import EduIcon from "@/components/EduIcon";

export default function Home() {
  return (
    <div className="grid" style={{ gap: 28 }}>
      <section className="hero">
        <div>
          <div className="badge">航科AI教育 · 小学课后辅导</div>
          <h1>让孩子学得更有趣，学得更扎实</h1>
          <p>
            面向小学 1-6 年级，紧贴人教版知识点。通过 AI 诊断测评、分层讲解、
            间隔复习与个性化练习，帮助孩子看到持续进步。
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
        <div className="hero-visual">
          <div className="chalkboard">
            <h3>今日课堂</h3>
            <ul>
              <li>分数意义与比较</li>
              <li>读写分数练习</li>
              <li>错题归因与讲评</li>
            </ul>
          </div>
          <div className="note-row">
            <div className="sticky-note">
              <div className="section-title">学习计划</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>本周完成 4/6</div>
            </div>
            <div className="sticky-note">
              <div className="section-title">自适应练习</div>
              <div style={{ fontSize: 12, color: "var(--ink-1)" }}>今日推荐 5 题</div>
            </div>
          </div>
          <div className="grid grid-3">
            <div className="card feature-card">
              <EduIcon name="book" />
              <div className="section-title">诊断测评</div>
              <p>精准定位知识薄弱点</p>
            </div>
            <div className="card feature-card">
              <EduIcon name="pencil" />
              <div className="section-title">AI 讲解</div>
              <p>逐步提示与陪练追问</p>
            </div>
            <div className="card feature-card">
              <EduIcon name="chart" />
              <div className="section-title">学习画像</div>
              <p>能力雷达 + 成长轨迹</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-3">
        <Card title="诊断测评" tag="入门">
          <div className="feature-card">
            <EduIcon name="book" />
            <p>快速定位薄弱知识点，生成个性化学习计划。</p>
          </div>
        </Card>
        <Card title="AI 辅导" tag="智能">
          <div className="feature-card">
            <EduIcon name="brain" />
            <p>逐步提示、类比讲解、追问检查，帮助孩子真正理解。</p>
          </div>
        </Card>
        <Card title="错题本" tag="提升">
          <div className="feature-card">
            <EduIcon name="puzzle" />
            <p>自动归因 + 间隔复习，让错题变成提分点。</p>
          </div>
        </Card>
      </section>

      <section className="grid grid-3">
        <Card title="写作批改" tag="表达">
          <div className="feature-card">
            <EduIcon name="pencil" />
            <p>结构、语法、词汇多维度评分与改进建议。</p>
          </div>
        </Card>
        <Card title="挑战任务" tag="成长">
          <div className="feature-card">
            <EduIcon name="trophy" />
            <p>闯关任务与奖励积分，激发学习动力。</p>
          </div>
        </Card>
        <Card title="朗读评分" tag="语文/英语">
          <div className="feature-card">
            <EduIcon name="rocket" />
            <p>跟读评分与语音反馈，提升表达与语感。</p>
          </div>
        </Card>
      </section>

      <section className="grid grid-2">
        <Card title="本周学习概览" tag="数据">
          <div className="grid grid-2">
            <Stat label="完成度" value="68%" helper="本周计划已完成" />
            <Stat label="正确率" value="82%" helper="近 3 天均值" />
            <Stat label="薄弱点" value="分数应用" helper="数学四年级" />
            <Stat label="学习时长" value="96 分钟" helper="本周累计" />
          </div>
        </Card>
        <Card title="AI 学习陪练" tag="陪伴">
          <div className="feature-card">
            <EduIcon name="board" />
            <p>分步提示 + 卡点追问，模拟老师课堂陪练。</p>
          </div>
        </Card>
      </section>

      <section className="grid grid-2">
        <Card title="家长周报" tag="共育">
          <p>一键查看孩子的学习进度、薄弱点和可执行的辅导建议。</p>
          <Link className="button secondary" href="/parent" style={{ marginTop: 12 }}>
            查看家长端
          </Link>
        </Card>
        <Card title="管理端" tag="运营">
          <p>维护题库与知识点树，追踪学生的整体表现。</p>
          <Link className="button secondary" href="/admin" style={{ marginTop: 12 }}>
            进入管理端
          </Link>
        </Card>
      </section>
    </div>
  );
}
