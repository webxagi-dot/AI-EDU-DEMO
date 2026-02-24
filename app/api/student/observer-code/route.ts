import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureObserverCode, rotateObserverCode } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const code = await ensureObserverCode(user.id);
  return NextResponse.json({ data: { code } });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const code = await rotateObserverCode(user.id);
  return NextResponse.json({ data: { code } });
}
