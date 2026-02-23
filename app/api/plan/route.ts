import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateStudyPlan, generateStudyPlans, getStudyPlan, getStudyPlans } from "@/lib/progress";
import { getStudentProfile } from "@/lib/profiles";

export async function GET(request: Request) {
  const user = getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const subject = url.searchParams.get("subject");
  const profile = getStudentProfile(user.id);
  const subjects = profile?.subjects?.length ? profile.subjects : ["math"];

  if (!subject || subject === "all") {
    const existing = getStudyPlans(user.id, subjects);
    const plans = existing.length ? existing : generateStudyPlans(user.id, subjects);
    const items = plans.flatMap((plan) =>
      plan.items.map((item) => ({ ...item, subject: plan.subject }))
    );
    return NextResponse.json({ data: { items, plans } });
  }

  const existing = getStudyPlan(user.id, subject);
  const plan = existing ?? generateStudyPlan(user.id, subject);
  return NextResponse.json({ data: plan });
}
