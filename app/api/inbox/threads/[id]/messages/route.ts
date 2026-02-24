import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addMessage, getThreadMessages } from "@/lib/inbox";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json()) as { content?: string };
  if (!body.content) {
    return NextResponse.json({ error: "missing content" }, { status: 400 });
  }
  const threadInfo = await getThreadMessages(context.params.id);
  const isParticipant = threadInfo.participants.some((p) => p.id === user.id);
  if (!isParticipant) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const message = await addMessage({ threadId: context.params.id, senderId: user.id, content: body.content });
  return NextResponse.json({ data: message });
}
