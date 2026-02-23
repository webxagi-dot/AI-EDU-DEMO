import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClassById, updateClassSettings } from "@/lib/classes";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function generateJoinCode() {
  return crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

export async function POST(_: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const classId = context.params.id;
  const klass = await getClassById(classId);
  if (!klass || klass.teacherId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updated = await updateClassSettings(classId, { joinCode: generateJoinCode() });
  return NextResponse.json({ data: updated });
}
