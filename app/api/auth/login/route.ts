import { NextResponse } from "next/server";
import { createSession, getUserByEmail, setSessionCookie, verifyPassword } from "@/lib/auth";
import { addAdminLog } from "@/lib/admin-log";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    role?: "student" | "teacher" | "parent" | "admin";
  };
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const user = await getUserByEmail(body.email);
  if (!user || !verifyPassword(body.password, user.password)) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  if (body.role && user.role !== body.role) {
    return NextResponse.json({ error: "账号身份不匹配，请确认选择的身份" }, { status: 403 });
  }

  const session = await createSession(user);
  const response = NextResponse.json({ ok: true, role: user.role, name: user.name });
  setSessionCookie(response, session.id);

  if (user.role === "admin") {
    await addAdminLog({
      adminId: user.id,
      action: "admin_login",
      entityType: "auth",
      entityId: user.id,
      detail: user.email
    });
  }

  return response;
}
