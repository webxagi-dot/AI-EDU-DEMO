import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "k12-ai-tutor",
    ts: new Date().toISOString()
  });
}
