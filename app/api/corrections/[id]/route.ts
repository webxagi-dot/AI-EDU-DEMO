import { NextResponse } from "next/server";
import { getStudentContext } from "@/lib/user-context";
import { updateCorrectionTask } from "@/lib/corrections";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const student = await getStudentContext();
  if (!student) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { status?: "pending" | "completed" };
  if (!body.status) {
    return NextResponse.json({ error: "status required" }, { status: 400 });
  }

  const next = await updateCorrectionTask({ id: context.params.id, userId: student.id, status: body.status });
  if (!next) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ data: next });
}
