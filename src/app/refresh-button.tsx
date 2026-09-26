"use client";

import { useState, useTransition } from "react";
import { refreshData, refreshInsight } from "./actions";

export function RefreshButtons() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();

  const runData = () =>
    startTransition(async () => {
      setMessage("데이터 수집 중… (최대 1분)");
      const r = await refreshData();
      if ("error" in r) return setMessage(`실패: ${r.error}`);
      const parts = [`${r.fetched.length}건 수집`];
      if (r.failed.length) parts.push(`${r.failed.length}건 실패 (${r.failed[0].error})`);
      if (r.pending.length) parts.push(`${r.pending.length}건 대기 (${r.stoppedReason})`);
      if (!r.fetched.length && !r.failed.length && !r.pending.length) parts[0] = "이미 최신 데이터";
      setMessage(parts.join(" · "));
    });

  const runInsight = () =>
    startTransition(async () => {
      setMessage("AI가 영향 지도를 만드는 중… (1~3분)");
      const r = await refreshInsight();
      setMessage("error" in r ? `실패: ${r.error}` : "새 영향 지도를 만들었습니다.");
    });

  const button = "rounded border px-3 py-1 hover:bg-foreground/5 disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button disabled={pending} onClick={runData} className={button}>데이터 갱신</button>
      <button disabled={pending} onClick={runInsight} className={button}>AI 해설 새로 만들기</button>
      {message && <span className="opacity-70">{message}</span>}
    </div>
  );
}
