import { NextResponse } from "next/server";
import crypto from "crypto";
import { createUser, getUserByEmail, getUserById } from "@/lib/auth";
import { getStudentProfileByObserverCode, upsertStudentProfile } from "@/lib/profiles";
import { SUBJECT_OPTIONS } from "@/lib/constants";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    role?: "student" | "parent";
    email?: string;
    password?: string;
    name?: string;
    grade?: string;
    studentEmail?: string;
    observerCode?: string;
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
      subjects: SUBJECT_OPTIONS.map((item) => item.value),
      target: "",
      school: ""
    });
    return NextResponse.json({ ok: true });
  }

  if (body.role === "parent") {
    let student = null;
    const observerCode = body.observerCode?.trim();
    if (observerCode) {
      const profile = await getStudentProfileByObserverCode(observerCode);
      if (!profile) {
        return NextResponse.json({ error: "observer code invalid" }, { status: 404 });
      }
      student = await getUserById(profile.userId);
    } else if (body.studentEmail) {
      student = await getUserByEmail(body.studentEmail);
    } else {
      return NextResponse.json({ error: "studentEmail or observerCode required" }, { status: 400 });
    }

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
