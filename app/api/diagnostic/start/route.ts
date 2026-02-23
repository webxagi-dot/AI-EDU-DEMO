import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDiagnosticQuestions } from "@/lib/progress";
import { getStudentProfile } from "@/lib/profiles";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { subject?: string; grade?: string };
  const subject = body.subject ?? "math";
  const profile = await getStudentProfile(user.id);
  const grade = body.grade ?? profile?.grade ?? (user.grade ?? "4");

  const questions = await getDiagnosticQuestions(subject, grade, 10);

  return NextResponse.json({
    subject,
    grade,
    questions: questions.map((q) => ({
      id: q.id,
      stem: q.stem,
      options: q.options,
      knowledgePointId: q.knowledgePointId
    }))
  });
}
