import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getJoinRequestsByStudent } from "@/lib/classes";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = await getJoinRequestsByStudent(user.id);
  return NextResponse.json({ data });
}
