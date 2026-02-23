import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSession, createUser, getUserByEmail, setSessionCookie, getTeacherCount } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
    inviteCode?: string;
  };

  if (!body.email || !body.password || !body.name) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const expectedInvite = process.env.TEACHER_INVITE_CODE?.trim();
  const teacherCount = await getTeacherCount();
  const allowWithoutInvite = !expectedInvite && teacherCount === 0;

  if (expectedInvite) {
    if (!body.inviteCode || body.inviteCode !== expectedInvite) {
      return NextResponse.json({ error: "invalid invite code" }, { status: 403 });
    }
  } else if (!allowWithoutInvite) {
    return NextResponse.json({ error: "invite code required" }, { status: 403 });
  }

  const existing = await getUserByEmail(body.email);
  if (existing) {
    return NextResponse.json({ error: "email exists" }, { status: 409 });
  }

  const id = `u-teacher-${crypto.randomBytes(6).toString("hex")}`;
  const user = {
    id,
    email: body.email,
    name: body.name,
    role: "teacher" as const,
    password: `plain:${body.password}`
  };
  await createUser(user);
  const session = await createSession(user);

  const response = NextResponse.json({ ok: true, role: "teacher", name: body.name });
  setSessionCookie(response, session.id);
  return response;
}
