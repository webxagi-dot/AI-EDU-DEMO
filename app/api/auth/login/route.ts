import { NextResponse } from "next/server";
import { createSession, getUserByEmail, setSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const user = getUserByEmail(body.email);
  if (!user || !verifyPassword(body.password, user.password)) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const session = createSession(user);
  const response = NextResponse.json({ ok: true, role: user.role, name: user.name });
  setSessionCookie(response, session.id);
  return response;
}
