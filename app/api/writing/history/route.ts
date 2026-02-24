import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWritingSubmissionsByUser } from "@/lib/writing";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const list = await getWritingSubmissionsByUser(user.id);
  return NextResponse.json({ data: list });
}
