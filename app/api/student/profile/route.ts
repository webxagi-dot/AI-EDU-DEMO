import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentProfile, upsertStudentProfile } from "@/lib/profiles";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const profile = await getStudentProfile(user.id);
  return NextResponse.json({ data: profile });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    grade?: string;
    subjects?: string[];
    target?: string;
    school?: string;
  };

  if (!body.grade || !body.subjects?.length) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const profile = await upsertStudentProfile({
    userId: user.id,
    grade: body.grade,
    subjects: body.subjects,
    target: body.target ?? "",
    school: body.school ?? ""
  });

  return NextResponse.json({ data: profile });
}
