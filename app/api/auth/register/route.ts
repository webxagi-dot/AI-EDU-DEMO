import { NextResponse } from "next/server";
import crypto from "crypto";
import { createUser, getUserByEmail } from "@/lib/auth";
import { upsertStudentProfile } from "@/lib/profiles";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    role?: "student" | "parent";
    email?: string;
    password?: string;
    name?: string;
    grade?: string;
    studentEmail?: string;
  };

  if (!body.role || !body.email || !body.password || !body.name) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const existing = await getUserByEmail(body.email);
  if (existing) {
    return NextResponse.json({ error: "email exists" }, { status: 409 });
  }

  if (body.role === "student") {
    if (!body.grade) {
      return NextResponse.json({ error: "grade required" }, { status: 400 });
    }
    const id = `u-${crypto.randomBytes(6).toString("hex")}`;
    await createUser({
      id,
      email: body.email,
      name: body.name,
      role: "student",
      grade: body.grade,
      password: `plain:${body.password}`
    });
    await upsertStudentProfile({
      userId: id,
      grade: body.grade,
      subjects: ["math", "chinese", "english"],
      target: "",
      school: ""
    });
    return NextResponse.json({ ok: true });
  }

  if (body.role === "parent") {
    if (!body.studentEmail) {
      return NextResponse.json({ error: "studentEmail required" }, { status: 400 });
    }
    const student = await getUserByEmail(body.studentEmail);
    if (!student || student.role !== "student") {
      return NextResponse.json({ error: "student not found" }, { status: 404 });
    }
    const id = `u-${crypto.randomBytes(6).toString("hex")}`;
    await createUser({
      id,
      email: body.email,
      name: body.name,
      role: "parent",
      studentId: student.id,
      password: `plain:${body.password}`
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid role" }, { status: 400 });
}
