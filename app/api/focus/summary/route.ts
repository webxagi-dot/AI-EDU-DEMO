import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFocusSummary } from "@/lib/focus";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = await getFocusSummary(user.id);
  return NextResponse.json({ data });
}
