import Card from "@/components/Card";
import { getCurrentUser } from "@/lib/auth";
import { generateStudyPlans, getStudyPlans } from "@/lib/progress";
import { getKnowledgePoints } from "@/lib/content";
import { getStudentProfile } from "@/lib/profiles";

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

  const profile = getStudentProfile(user.id);
  const subjects = profile?.subjects?.length ? profile.subjects : ["math"];
  const plans = getStudyPlans(user.id, subjects);
  const finalPlans = plans.length ? plans : generateStudyPlans(user.id, subjects);
  const knowledgePoints = getKnowledgePoints();

  const labelMap: Record<string, string> = {
    math: "数学",
    chinese: "语文",
    english: "英语"
  };

  return (
    <div className="grid" style={{ gap: 18 }}>
      <Card title="学习计划">
        <p>为你生成 7 天游学计划（多学科）。</p>
        <div className="grid" style={{ gap: 12, marginTop: 12 }}>
          {finalPlans.map((plan) => (
            <div className="card" key={plan.subject}>
              <div className="section-title">{labelMap[plan.subject] ?? plan.subject}</div>
              <div className="grid" style={{ gap: 8, marginTop: 8 }}>
                {plan.items.map((item) => {
                  const kp = knowledgePoints.find((k) => k.id === item.knowledgePointId);
                  return (
                    <div key={item.knowledgePointId}>
                      {kp?.title ?? "知识点"} · 目标 {item.targetCount} 题 · 截止{" "}
                      {new Date(item.dueDate).toLocaleDateString("zh-CN")}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
