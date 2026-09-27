"use client";

import { useState } from "react";
import type { StockDetail } from "@/lib/insight/schema";
import { IMPACT } from "@/lib/insight/style";

const W = 720;
const H = 260;
const PAD = { top: 20, right: 16, bottom: 28, left: 52 };

const shortDate = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/** 최근 1개월 종가 선 그래프 + 사건 표시. 점에 마우스를 올리거나 누르면 "왜 움직였나"를 보여 준다. */
export function PriceChart({ prices, events }: Pick<StockDetail, "prices" | "events">) {
  const [hover, setHover] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  if (prices.length < 2) return <p className="text-sm opacity-60">가격 데이터가 아직 부족합니다.</p>;

  const closes = prices.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const lo = min - span * 0.1;
  const hi = max + span * 0.1;
  const x = (i: number) => PAD.left + (i / (prices.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const path = prices.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.close)}`).join(" ");
  const ticks = [lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1];
  const labelEvery = Math.ceil(prices.length / 6);

  // 사건 날짜가 거래일이 아니면(주말 등) 그 다음 거래일에 표시
  const markers = events
    .map((e, ei) => ({ ei, e, i: prices.findIndex((p) => p.date >= e.date) }))
    .filter((m) => m.i >= 0);

  const first = prices[0].close;
  const hovered = hover !== null ? prices[hover] : null;
  const active = selectedEvent !== null ? events[selectedEvent] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-4 overflow-x-auto px-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[560px] touch-none"
          role="img"
          aria-label="최근 1개월 종가 추이와 주요 사건"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(ev) => {
            const r = ev.currentTarget.getBoundingClientRect();
            const px = ((ev.clientX - r.left) / r.width) * W;
            const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (prices.length - 1));
            setHover(Math.max(0, Math.min(prices.length - 1, i)));
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--chart-muted)">
                ${t.toFixed(t < 10 ? 2 : 0)}
              </text>
            </g>
          ))}
          {prices.map((p, i) =>
            (i % labelEvery === 0 && prices.length - 1 - i >= labelEvery / 2) || i === prices.length - 1 ? (
              <text key={p.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--chart-muted)">
                {shortDate(p.date)}
              </text>
            ) : null,
          )}
          <path d={path} fill="none" stroke="var(--chart-line)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--chart-muted)" strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(prices[hover].close)} r={4} fill="var(--chart-line)" stroke="var(--background)" strokeWidth={2} />
            </g>
          )}

          {markers.map(({ ei, e, i }) => {
            const s = IMPACT[e.impact];
            const cy = y(prices[i].close);
            return (
              <g key={ei} className="cursor-pointer" onClick={() => setSelectedEvent(selectedEvent === ei ? null : ei)}>
                <circle cx={x(i)} cy={cy} r={14} fill="transparent" />
                <circle
                  cx={x(i)}
                  cy={cy}
                  r={selectedEvent === ei ? 8 : 6}
                  fill={s.color}
                  stroke="var(--background)"
                  strokeWidth={2}
                />
                <text x={x(i)} y={cy - 12} textAnchor="middle" fontSize={11} fill={s.color} pointerEvents="none">
                  {s.icon}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="min-h-6 text-sm">
        {hovered ? (
          <span>
            <b>{hovered.date}</b> 종가 ${hovered.close.toFixed(2)}{" "}
            <span className="opacity-60">(1개월 전 대비 {((hovered.close / first - 1) * 100).toFixed(1)}%)</span>
          </span>
        ) : (
          <span className="opacity-60">그래프에 마우스를 올리면 날짜별 종가가, 점을 누르면 그날 무슨 일이 있었는지 보여요.</span>
        )}
      </div>

      {active && (
        <div className="rounded-lg border p-3 text-sm leading-relaxed" style={{ borderColor: IMPACT[active.impact].color }}>
          <p className="font-bold">
            <span style={{ color: IMPACT[active.impact].color }}>{IMPACT[active.impact].icon}</span> {active.date} · {active.title}{" "}
            <span className="text-xs font-normal opacity-70">{IMPACT[active.impact].label}</span>
          </p>
          <p className="pt-1">{active.explanation}</p>
        </div>
      )}
    </div>
  );
}
