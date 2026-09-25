"use client";

import { useState, useTransition } from "react";
import { refreshData } from "./actions";

export function RefreshButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();

  return (
    <div className="flex items-center gap-3">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await refreshData();
            if ("error" in r) return setMessage(r.error);
            const parts = [`${r.fetched.length}건 갱신`];
            if (r.failed.length) parts.push(`${r.failed.length}건 실패`);
            if (r.pending.length) parts.push(`${r.pending.length}건 대기 (${r.stoppedReason})`);
            if (!r.fetched.length && !r.failed.length && !r.pending.length) parts[0] = "이미 최신 상태";
            setMessage(parts.join(" · "));
          })
        }
        className="rounded border px-3 py-1 text-sm hover:bg-foreground/5 disabled:opacity-50"
      >
        {pending ? "갱신 중… (최대 1분)" : "지금 갱신"}
      </button>
      {message && <span className="text-sm opacity-70">{message}</span>}
    </div>
  );
}
