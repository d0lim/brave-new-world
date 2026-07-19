/**
 * 연속 적중 공유 카드 — Wordle 그리드 대신 UP/DOWN + 스트릭.
 */

export async function renderTensionStreakCard(options: {
  lang: "ko" | "en";
  streak: number;
  lastHit: boolean | null;
  label: string;
  pick: "up" | "down" | null;
  date: string;
}): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const w = 720;
  const h = 420;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const ko = options.lang === "ko";
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#0b1220");
  grad.addColorStop(1, "#1a1030");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
  ctx.font = "600 22px Inter, Wanted Sans, sans-serif";
  ctx.fillText(ko ? "WTI · 내일의 세계 긴장도" : "WTI · Tomorrow’s tension", 48, 64);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "500 28px Inter, Wanted Sans, sans-serif";
  const title =
    options.streak > 0
      ? ko
        ? `🎯 ${options.streak}일 연속 적중`
        : `🎯 ${options.streak}-day streak`
      : ko
        ? "오늘의 한 수"
        : "Today’s call";
  ctx.fillText(title, 48, 120);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 18px Inter, Wanted Sans, sans-serif";
  ctx.fillText(options.label, 48, 168);

  if (options.pick) {
    const up = options.pick === "up";
    ctx.fillStyle = up ? "#34d399" : "#fb7185";
    ctx.font = "700 64px Inter, sans-serif";
    ctx.fillText(up ? "UP ↑" : "DOWN ↓", 48, 260);
  }

  if (options.lastHit != null) {
    ctx.fillStyle = options.lastHit ? "#86efac" : "#fda4af";
    ctx.font = "500 20px Inter, Wanted Sans, sans-serif";
    ctx.fillText(
      options.lastHit
        ? ko
          ? "어제 적중"
          : "Yesterday: hit"
        : ko
          ? "어제 빗나감"
          : "Yesterday: miss",
      48,
      310,
    );
  }

  ctx.fillStyle = "#64748b";
  ctx.font = "400 14px Inter, sans-serif";
  ctx.fillText(`Brave New World · ${options.date}`, 48, 380);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
