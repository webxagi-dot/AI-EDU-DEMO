import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addFocusSession } from "@/lib/focus";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    durationMinutes?: number;
    mode?: "focus" | "break";
    startedAt?: string;
    endedAt?: string;
  };

  const duration = Math.max(1, Math.min(Number(body.durationMinutes) || 0, 180));
  const mode = body.mode === "break" ? "break" : "focus";

  if (!duration) {
    return NextResponse.json({ error: "invalid duration" }, { status: 400 });
  }

  const record = await addFocusSession({
    userId: user.id,
    mode,
    durationMinutes: duration,
    startedAt: body.startedAt,
    endedAt: body.endedAt
  });

  return NextResponse.json({ data: record });
}
