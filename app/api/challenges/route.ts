import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getChallengePoints, getChallengeStatus } from "@/lib/challenges";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tasks = await getChallengeStatus(user.id);
  const points = await getChallengePoints(user.id);
  return NextResponse.json({ data: { tasks, points } });
}
