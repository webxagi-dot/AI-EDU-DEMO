import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import { getAdminLogs } from "@/lib/admin-log";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireRole("admin");
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 200);
  const logs = await getAdminLogs(limit);
  return NextResponse.json({ data: logs });
}
