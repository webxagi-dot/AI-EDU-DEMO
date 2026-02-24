import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { claimChallenge, getChallengePoints, getChallengeStatus } from "@/lib/challenges";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { taskId?: string };
  if (!body.taskId) {
    return NextResponse.json({ error: "missing taskId" }, { status: 400 });
  }

  const result = await claimChallenge(user.id, body.taskId);
  const tasks = await getChallengeStatus(user.id);
  const points = await getChallengePoints(user.id);
  return NextResponse.json({ data: { tasks, points, result } });
}
