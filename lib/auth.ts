import crypto from "crypto";
import { cookies } from "next/headers";
import { readJson, writeJson } from "./storage";

export type UserRole = "student" | "parent" | "admin";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password: string; // use plain:xxx for MVP or salt:hash for scrypt
  grade?: string;
  studentId?: string; // for parent binding
};

export type Session = {
  id: string;
  userId: string;
  role: UserRole;
  expiresAt: string;
};

const USER_FILE = "users.json";
const SESSION_FILE = "sessions.json";
const SESSION_COOKIE = "mvp_session";
const SESSION_TTL_DAYS = 7;

export function getUsers(): User[] {
  return readJson<User[]>(USER_FILE, []);
}

export function saveUsers(users: User[]) {
  writeJson(USER_FILE, users);
}

export function getSessions(): Session[] {
  return readJson<Session[]>(SESSION_FILE, []);
}

export function saveSessions(sessions: Session[]) {
  writeJson(SESSION_FILE, sessions);
}

export function verifyPassword(input: string, stored: string) {
  if (stored.startsWith("plain:")) {
    return input === stored.replace("plain:", "");
  }

  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const derived = crypto.scryptSync(input, salt, 64).toString("hex");
  const hashBuf = Buffer.from(hash, "hex");
  const derivedBuf = Buffer.from(derived, "hex");
  if (hashBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, derivedBuf);
}

export function createSession(user: User) {
  const sessions = getSessions();
  const id = crypto.randomBytes(18).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const nextSessions = sessions.filter((session) => session.userId !== user.id);
  nextSessions.push({ id, userId: user.id, role: user.role, expiresAt });
  saveSessions(nextSessions);
  return { id, expiresAt };
}

export function getSessionByToken(token?: string | null) {
  if (!token) return null;
  const sessions = getSessions();
  const session = sessions.find((item) => item.id === token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    removeSession(token);
    return null;
  }
  return session;
}

export function removeSession(token: string) {
  const sessions = getSessions();
  saveSessions(sessions.filter((item) => item.id !== token));
}

export function setSessionCookie(response: Response, token: string) {
  const nextResponse = response as any;
  if (nextResponse.cookies?.set) {
    nextResponse.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60
    });
  }
}

export function clearSessionCookie(response: Response) {
  const nextResponse = response as any;
  if (nextResponse.cookies?.set) {
    nextResponse.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });
  }
}

export function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = getSessionByToken(token);
  if (!session) return null;
  const users = getUsers();
  const user = users.find((item) => item.id === session.userId);
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

export function getUserByEmail(email: string) {
  return getUsers().find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
