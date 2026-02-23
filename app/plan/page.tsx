import Card from "@/components/Card";
import { getCurrentUser } from "@/lib/auth";
import { generateStudyPlan, getStudyPlan } from "@/lib/progress";
import { getKnowledgePoints } from "@/lib/content";

export const dynamic = "force-dynamic";

export default function PlanPage() {
  const user = getCurrentUser();
  if (!user || user.role !== "student") {
    return (
      <Card title="学习计划">
        <p>请先登录学生账号。</p>
      </Card>
    );
  }

  const subject = "math";
  const plan = getStudyPlan(user.id, subject) ?? generateStudyPlan(user.id, subject);
  const knowledgePoints = getKnowledgePoints();

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="学习计划">
        <p>为你生成 7 天游学计划（数学）。</p>
        <div className="grid" style={{ gap: 8, marginTop: 12 }}>
          {plan.items.map((item) => {
            const kp = knowledgePoints.find((k) => k.id === item.knowledgePointId);
            return (
              <div className="card" key={item.knowledgePointId}>
                <div className="section-title">{kp?.title ?? "知识点"}</div>
                <p>目标练习：{item.targetCount} 题</p>
                <p>截止日期：{new Date(item.dueDate).toLocaleDateString("zh-CN")}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
