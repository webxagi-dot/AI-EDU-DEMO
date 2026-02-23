import { NextResponse } from "next/server";
import { getKnowledgePoints } from "@/lib/content";

export async function GET() {
  return NextResponse.json({ data: await getKnowledgePoints() });
}
