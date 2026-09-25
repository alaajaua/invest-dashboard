"use client";

import { useActionState } from "react";
import { upsertHolding, type FormState } from "./actions";

export function HoldingForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(upsertHolding, {});

  return (
    <form action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <input name="symbol" placeholder="종목 (AAPL)" required className="rounded border px-2 py-1 uppercase" />
      <input name="shares" type="number" step="any" placeholder="수량" required className="rounded border px-2 py-1" />
      <input name="avg_cost" type="number" step="any" placeholder="평단가 ($)" required className="rounded border px-2 py-1" />
      <input name="target_weight" type="number" step="any" placeholder="목표 비중 % (선택)" className="rounded border px-2 py-1" />
      <button disabled={pending} className="rounded bg-foreground px-3 py-1 text-background disabled:opacity-50">
        {pending ? "저장 중…" : "추가/수정"}
      </button>
      {state.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
