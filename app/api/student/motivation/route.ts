import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBadges, getStreak, getWeeklyStats } from "@/lib/progress";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const streak = await getStreak(user.id);
  const badges = await getBadges(user.id);
  const weekly = await getWeeklyStats(user.id);

  return NextResponse.json({
    streak,
    badges,
    weekly
  });
}
