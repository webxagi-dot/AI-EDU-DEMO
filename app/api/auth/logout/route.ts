import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionCookieName, removeSession } from "@/lib/auth";
import { cookies } from "next/headers";
export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (token) {
    await removeSession(token);
  }
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
