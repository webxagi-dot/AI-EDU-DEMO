import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { refreshStudyPlan } from "@/lib/progress";
import { getStudentProfile } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { subject?: string };
  const profile = await getStudentProfile(user.id);
  const subjects = profile?.subjects?.length ? profile.subjects : ["math"];

  if (!body.subject || body.subject === "all") {
    const plans = await Promise.all(subjects.map((subject) => refreshStudyPlan(user.id, subject)));
    const items = plans.flatMap((plan) => plan.items.map((item) => ({ ...item, subject: plan.subject })));
    return NextResponse.json({ data: { items, plans } });
  }

  const plan = await refreshStudyPlan(user.id, body.subject);
  return NextResponse.json({ data: plan });
}
