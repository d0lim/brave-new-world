"use client";

import { useCallback, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { getUserAnthropicApiKey } from "@/lib/llm/userAnthropicKey";

type Props = {
  lang: LabelLanguage;
  title: string;
  source?: string;
  link?: string;
  focusLabel?: string;
  excerpt?: string;
};

/**
 * 등불 뉴스 「왜 중요?」 — 외교학 교수 톤 Claude 해설 (유저 BYOK).
 */
export function LampWhyMattersButton({
  lang,
  title,
  source,
  link,
  focusLabel,
  excerpt,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (loading || !title.trim()) return;
    setOpen(true);
    if (text) return;

    setLoading(true);
    setError(null);
    setMeta(null);

    const userKey = getUserAnthropicApiKey();
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (userKey) headers["x-anthropic-api-key"] = userKey;

    try {
      const res = await fetch("/api/claude/why-matters", {
        method: "POST",
        cache: "no-store",
        headers,
        body: JSON.stringify({
          title,
          source,
          link,
          focusLabel,
          excerpt,
          lang: lang === "en" ? "en" : "ko",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        text?: string;
        error?: string;
        stub?: boolean;
        billing?: string;
        model?: string;
        needUserKey?: boolean;
      };

      if (!res.ok || data.error) {
        setError(
          data.error ||
            (lang === "en" ? "Could not explain this item." : "해설을 가져오지 못했습니다."),
        );
        return;
      }

      setText(data.text || null);
      setMeta(
        [
          data.stub ? (lang === "en" ? "stub demo" : "스텁 데모") : null,
          data.billing === "user-byok"
            ? lang === "en"
              ? "your key"
              : "본인 키"
            : null,
          data.model,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : lang === "en"
            ? "Network error"
            : "네트워크 오류",
      );
    } finally {
      setLoading(false);
    }
  }, [excerpt, focusLabel, lang, link, loading, source, text, title]);

  const toggle = () => {
    if (open && text) {
      setOpen(false);
      return;
    }
    void run();
  };

  return (
    <div className="mt-3 border-t border-[#8b6914]/20 pt-3">
      <button
        type="button"
        disabled={loading || !title.trim()}
        onClick={toggle}
        className="rounded-sm border border-[#8b6914]/45 bg-[#efe0b8] px-3 py-1.5 text-[12px] tracking-[0.04em] text-[#3d2a18] shadow-sm transition hover:bg-[#f7ecd0] disabled:cursor-wait disabled:opacity-60"
      >
        {loading
          ? lang === "en"
            ? "Seminar brief…"
            : "해설 작성 중…"
          : open && text
            ? lang === "en"
              ? "Hide"
              : "접기"
            : lang === "en"
              ? "Why it matters"
              : "왜 중요?"}
      </button>

      {open ? (
        <div className="mt-3 rounded-sm border border-[#8b6914]/25 bg-[#f3e6c8]/7 px-3 py-3 sm:px-4">
          {meta ? (
            <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[#6b4a22]/6">
              {meta}
            </p>
          ) : null}
          {error ? (
            <p className="text-[13px] leading-relaxed text-[#8b3a2a]">{error}</p>
          ) : null}
          {loading && !text ? (
            <p className="text-[13px] leading-relaxed text-[#5a4428]/75">
              {lang === "en"
                ? "IR seminar voice — weighing timing, realignment, and second-order effects…"
                : "외교학 세미나 톤으로 시기·관계 재편·파급을 정리하는 중…"}
            </p>
          ) : null}
          {text ? (
            <div className="whitespace-pre-wrap text-[13px] leading-[1.75] text-[#3f2e1c] sm:text-[14px] sm:leading-[1.8]">
              {text}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
