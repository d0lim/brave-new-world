import { NextResponse } from "next/server";
import { ensureSubmarineTunnelsSeeded } from "@/lib/d1MaritimeAir";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const secret =
    process.env.INGEST_CRON_SECRET?.trim() || process.env.NEWS_WARM_SECRET?.trim();
  if (!secret) return true;
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = new URL(request.url).searchParams.get("secret") || "";
  return bearer === secret || query === secret;
}

/**
 * 해저터널 시드를 D1에 채운다 (이미 있으면 no-op).
 * POST /api/submarine-tunnels/warm
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const written = await ensureSubmarineTunnelsSeeded();
  return NextResponse.json({
    ok: true,
    written,
    receivedAt: new Date().toISOString(),
  });
}
