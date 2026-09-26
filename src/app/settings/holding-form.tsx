"use client";

import { useActionState } from "react";
import { upsertHolding, type FormState } from "./actions";

export function HoldingForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(upsertHolding, {});

  return (
    <form action={action} className="flex flex-wrap gap-2">
      <input name="symbol" placeholder="종목 코드 (예: AAPL)" required className="rounded border px-2 py-1 uppercase" />
      <button disabled={pending} className="rounded bg-foreground px-3 py-1 text-background disabled:opacity-50">
        {pending ? "추가 중…" : "추가"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
