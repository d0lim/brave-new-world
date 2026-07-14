"use client";

import type { AxisHubId } from "@/data/axisNetwork";
import { hubById } from "@/data/hubNav";
import type { AxisArmsDeal } from "@/lib/axisArmsPaths";

type AxisArmsPanelProps = {
  hubId: AxisHubId;
  deals: AxisArmsDeal[];
  citation?: string;
  onClose: () => void;
};

export function AxisArmsPanel({ hubId, deals, citation, onClose }: AxisArmsPanelProps) {
  const hub = hubById(hubId);
  return (
    <aside className="pointer-events-auto absolute right-3 top-20 z-40 flex max-h-[min(70vh,520px)] w-[min(92vw,320px)] flex-col overflow-hidden rounded-2xl border border-orange-300/20 bg-[#140f0a]/92 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-2 border-b border-orange-200/10 px-3 py-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-orange-200/55">SIPRI · 무기거래</p>
          <h2 className="mt-0.5 text-sm font-medium text-orange-50">{hub?.label ?? hubId} 관련 이전</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-2 py-0.5 text-xs text-orange-100/50 transition hover:bg-white/5 hover:text-orange-50"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {deals.length === 0 ? (
          <p className="px-2 py-4 text-xs text-orange-100/45">표시할 거래가 없습니다.</p>
        ) : (
          deals.slice(0, 40).map((d, i) => (
            <div
              key={`${d.supplier}-${d.recipient}-${d.designation}-${d.year}-${i}`}
              className="rounded-lg border border-orange-200/10 bg-orange-500/5 px-2.5 py-2"
            >
              <p className="text-[11px] text-orange-50/95">
                {d.supplier} → {d.recipient}
                {d.year ? ` · ${d.year}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-orange-100/85">
                {d.designation}
                {d.description ? ` · ${d.description}` : ""}
              </p>
              <p className="mt-1 text-[10px] text-orange-200/45">
                {d.category}
                {typeof d.tiv === "number" ? ` · TIV ${d.tiv}` : ""}
              </p>
            </div>
          ))
        )}
      </div>
      {citation ? (
        <p className="border-t border-orange-200/10 px-3 py-2 text-[9px] leading-4 text-orange-100/40">
          {citation}
        </p>
      ) : null}
    </aside>
  );
}
