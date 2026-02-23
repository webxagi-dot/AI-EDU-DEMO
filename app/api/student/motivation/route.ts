import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBadges, getStreak, getWeeklyStats } from "@/lib/progress";

export async function GET() {
  const user = getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const streak = getStreak(user.id);
  const badges = getBadges(user.id);
  const weekly = getWeeklyStats(user.id);

  return NextResponse.json({
    streak,
    badges,
    weekly
  });
}
