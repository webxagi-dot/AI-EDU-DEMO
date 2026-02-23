import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateStudyPlan, getStudyPlan } from "@/lib/progress";

export async function GET(request: Request) {
  const user = getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const subject = url.searchParams.get("subject") ?? "math";
  const existing = getStudyPlan(user.id, subject);
  const plan = existing ?? generateStudyPlan(user.id, subject);
  return NextResponse.json({ data: plan });
}
