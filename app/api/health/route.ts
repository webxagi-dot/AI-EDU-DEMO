import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "k12-ai-tutor",
    ts: new Date().toISOString()
  });
}
