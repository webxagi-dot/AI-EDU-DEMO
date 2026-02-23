import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateStudyPlan, generateStudyPlans, getStudyPlan, getStudyPlans } from "@/lib/progress";
import { getStudentProfile } from "@/lib/profiles";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const subject = url.searchParams.get("subject");
  const profile = await getStudentProfile(user.id);
  const subjects = profile?.subjects?.length ? profile.subjects : ["math"];

  if (!subject || subject === "all") {
    const existing = await getStudyPlans(user.id, subjects);
    const plans = existing.length ? existing : await generateStudyPlans(user.id, subjects);
    const items = plans.flatMap((plan) =>
      plan.items.map((item) => ({ ...item, subject: plan.subject }))
    );
    return NextResponse.json({ data: { items, plans } });
  }

  const existing = await getStudyPlan(user.id, subject);
  const plan = existing ?? await generateStudyPlan(user.id, subject);
  return NextResponse.json({ data: plan });
}
