import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getThreadMessages } from "@/lib/inbox";

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await getThreadMessages(context.params.id, user.id);
  const isParticipant = data.participants.some((p) => p.id === user.id);
  if (!isParticipant) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ data });
}
