import { NextResponse } from "next/server";
import { getClaudeServerStatus } from "@/lib/llm/anthropicEnv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/claude/status
 * 키 값은 절대 반환하지 않음. UI가 BYOK/서버 digest 준비 상태만 확인.
 */
export async function GET() {
  return NextResponse.json(getClaudeServerStatus());
}
