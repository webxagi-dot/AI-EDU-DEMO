import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuestions } from "@/lib/content";
import { getWrongQuestionIds } from "@/lib/progress";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const wrongIds = await getWrongQuestionIds(user.id);
  const questions = (await getQuestions()).filter((q) => wrongIds.includes(q.id));

  return NextResponse.json({ data: questions });
}
