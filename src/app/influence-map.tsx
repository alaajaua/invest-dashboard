"use client";

import { useState } from "react";
import type { Insight } from "@/lib/insight/schema";

type Status = Insight["factors"][number]["status"];

// 상태 색은 항상 기호·글자와 함께 쓴다 (색만으로 의미를 전달하지 않음)
export const STATUS: Record<Status, { color: string; icon: string; label: string }> = {
  tailwind: { color: "#0ca30c", icon: "▲", label: "순풍" },
  headwind: { color: "#d03b3b", icon: "▼", label: "역풍" },
  mixed: { color: "#fab219", icon: "◆", label: "혼재" },
};
const EFFECT = { positive: STATUS.tailwind.color, negative: STATUS.headwind.color };
const WIDTH = { weak: 1.5, medium: 3, strong: 5 };

const W = 760;
const NODE_W = 190;
const NODE_H = 44;
const GAP = 16;
const LEFT_X = 20;
const RIGHT_X = W - NODE_W - 20;

type Selected = { kind: "factor"; id: string } | { kind: "holding"; symbol: string } | null;

export function InfluenceMap({ insight }: { insight: Insight }) {
  const { factors, holdings, links } = insight;
  const [selected, setSelected] = useState<Selected>(null);
  const [hoverLink, setHoverLink] = useState<number | null>(null);

  const rows = Math.max(factors.length, holdings.length);
  const height = rows * (NODE_H + GAP) + GAP;
  const yOf = (index: number, count: number) => {
    const block = count * (NODE_H + GAP) - GAP;
    return (height - block) / 2 + index * (NODE_H + GAP);
  };
  const factorY = new Map(factors.map((f, i) => [f.id, yOf(i, factors.length) + NODE_H / 2]));
  const holdingY = new Map(holdings.map((h, i) => [h.symbol, yOf(i, holdings.length) + NODE_H / 2]));

  const isActive = (from: string, to: string) =>
    !selected || (selected.kind === "factor" ? selected.id === from : selected.symbol === to);

  const factor = selected?.kind === "factor" ? factors.find((f) => f.id === selected.id) : undefined;
  const holding = selected?.kind === "holding" ? holdings.find((h) => h.symbol === selected.symbol) : undefined;
  const related = links.filter((l) => (factor ? l.from === factor.id : holding ? l.to === holding.symbol : false));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between text-xs opacity-70">
        <span>무엇이 (거시·테마)</span>
        <span>내 종목에</span>
      </div>
      <p className="text-xs opacity-50 md:hidden">그림을 옆으로 밀어서 보세요 →</p>
      {/* 좁은 화면에서는 글자가 읽히도록 원래 크기를 유지하고 가로로 밀어서 본다 */}
      <div className="-mx-4 overflow-x-auto px-4">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full min-w-[640px]" role="img" aria-label="요인과 보유 종목의 영향 관계도">
        {links.map((l, i) => {
          const y1 = factorY.get(l.from);
          const y2 = holdingY.get(l.to);
          if (y1 === undefined || y2 === undefined) return null;
          const x1 = LEFT_X + NODE_W;
          const x2 = RIGHT_X;
          const mid = (x1 + x2) / 2;
          const d = `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
          const active = isActive(l.from, l.to);
          return (
            <g key={i} onMouseEnter={() => setHoverLink(i)} onMouseLeave={() => setHoverLink(null)}>
              {/* 넓은 투명 선: 마우스를 올리기 쉽게 */}
              <path d={d} stroke="transparent" strokeWidth={14} fill="none" />
              <path
                d={d}
                fill="none"
                stroke={EFFECT[l.effect]}
                strokeWidth={WIDTH[l.strength]}
                strokeDasharray={l.effect === "negative" ? "6 4" : undefined}
                strokeLinecap="round"
                opacity={active ? (hoverLink === i ? 1 : 0.75) : 0.2}
              />
            </g>
          );
        })}
        {factors.map((f, i) => (
          <Node
            key={f.id}
            x={LEFT_X}
            y={yOf(i, factors.length)}
            title={f.name}
            sub={f.kind === "macro" ? "거시" : "테마"}
            status={f.status}
            selected={selected?.kind === "factor" && selected.id === f.id}
            onClick={() => setSelected(selected?.kind === "factor" && selected.id === f.id ? null : { kind: "factor", id: f.id })}
          />
        ))}
        {holdings.map((h, i) => (
          <Node
            key={h.symbol}
            x={RIGHT_X}
            y={yOf(i, holdings.length)}
            title={h.symbol}
            sub={h.name}
            status={h.status}
            selected={selected?.kind === "holding" && selected.symbol === h.symbol}
            onClick={() =>
              setSelected(selected?.kind === "holding" && selected.symbol === h.symbol ? null : { kind: "holding", symbol: h.symbol })
            }
          />
        ))}
      </svg>
      </div>

      <Legend />

      {hoverLink !== null && links[hoverLink] && (
        <p className="rounded border px-3 py-2 text-sm">
          <b>{factors.find((f) => f.id === links[hoverLink].from)?.name}</b> →{" "}
          <b>{links[hoverLink].to}</b>: {links[hoverLink].why}
        </p>
      )}

      {factor && (
        <DetailCard title={factor.name} status={factor.status}>
          <p><b>지금:</b> {factor.now}</p>
          <p><b>왜 중요한가:</b> {factor.why}</p>
          {factor.evidence.length > 0 && (
            <ul className="list-disc pl-5 opacity-80">
              {factor.evidence.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <Related items={related.map((l) => ({ name: l.to, effect: l.effect, why: l.why }))} />
        </DetailCard>
      )}
      {holding && (
        <DetailCard title={`${holding.symbol} · ${holding.name}`} status={holding.status}>
          <p>{holding.oneLiner}</p>
          <p><b>최근 1개월:</b> {holding.flow}</p>
          <Related
            items={related.map((l) => ({ name: factors.find((f) => f.id === l.from)?.name ?? l.from, effect: l.effect, why: l.why }))}
          />
          {holding.watch.length > 0 && (
            <div>
              <b>지켜볼 것</b>
              <ul className="list-disc pl-5">{holding.watch.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}
        </DetailCard>
      )}
      {!selected && <p className="text-sm opacity-60">요인이나 종목을 누르면 자세한 설명이 나옵니다. 선에 마우스를 올리면 연결 이유가 보여요.</p>}
    </div>
  );
}

function Node(props: {
  x: number; y: number; title: string; sub: string; status: Status; selected: boolean; onClick: () => void;
}) {
  const s = STATUS[props.status];
  return (
    <g
      transform={`translate(${props.x},${props.y})`}
      onClick={props.onClick}
      className="cursor-pointer"
      role="button"
      aria-label={`${props.title} ${s.label}`}
    >
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={8}
        fill="var(--background)"
        stroke={props.selected ? "var(--foreground)" : s.color}
        strokeWidth={props.selected ? 2.5 : 1.5}
      />
      <text x={12} y={19} fontSize={14} fontWeight={600} fill="var(--foreground)">
        <tspan fill={s.color}>{s.icon}</tspan> {props.title}
      </text>
      <text x={12} y={35} fontSize={11} fill="var(--foreground)" opacity={0.65}>
        {props.sub.length > 26 ? `${props.sub.slice(0, 25)}…` : props.sub} · {s.label}
      </text>
    </g>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs opacity-80">
      {Object.values(STATUS).map((s) => (
        <span key={s.label}><span style={{ color: s.color }}>{s.icon}</span> {s.label}</span>
      ))}
      <span><span style={{ color: EFFECT.positive }}>━</span> 긍정 영향</span>
      <span><span style={{ color: EFFECT.negative }}>┅</span> 부정 영향</span>
      <span>선 굵기 = 영향 크기</span>
    </div>
  );
}

function DetailCard({ title, status, children }: { title: string; status: Status; children: React.ReactNode }) {
  const s = STATUS[status];
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4 text-sm leading-relaxed" style={{ borderColor: s.color }}>
      <h3 className="text-base font-bold">
        <span style={{ color: s.color }}>{s.icon}</span> {title} <span className="text-xs font-normal opacity-70">{s.label}</span>
      </h3>
      {children}
    </div>
  );
}

function Related({ items }: { items: { name: string; effect: "positive" | "negative"; why: string }[] }) {
  if (!items.length) return null;
  return (
    <div>
      <b>연결</b>
      <ul className="flex flex-col gap-1 pt-1">
        {items.map((it, i) => (
          <li key={i}>
            <span style={{ color: EFFECT[it.effect] }}>{it.effect === "positive" ? "＋" : "－"}</span> <b>{it.name}</b>: {it.why}
          </li>
        ))}
      </ul>
    </div>
  );
}
