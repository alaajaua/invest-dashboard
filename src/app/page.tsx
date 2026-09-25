import Link from "next/link";
import type { Bar } from "@/lib/market/alphavantage";
import { DAILY_LIMIT } from "@/lib/market/collector";
import { createClient } from "@/lib/supabase/server";
import { RefreshButton } from "./refresh-button";

export const maxDuration = 60;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" });

export default async function Home() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: holdings } = await supabase.from("holdings").select("symbol, shares, avg_cost").order("symbol");
  const keys = (holdings ?? []).map((h) => `daily:${h.symbol}`);
  const [{ data: cache }, { data: usage }] = await Promise.all([
    supabase.from("market_cache").select("key, data, fetched_at").in("key", keys),
    supabase.from("api_usage").select("calls").eq("day", today).maybeSingle(),
  ]);
  const byKey = new Map((cache ?? []).map((c) => [c.key as string, c]));

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">오늘의 브리핑</h1>
        <p className="text-sm opacity-70">AI 브리핑은 5단계에서 이곳에 표시됩니다. 지금은 수집된 시세를 보여 줍니다.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 text-sm">
        <span>
          오늘 API 사용량 <b>{usage?.calls ?? 0}</b> / {DAILY_LIMIT}회
        </span>
        <RefreshButton />
      </div>

      {!holdings?.length ? (
        <Link href="/settings" className="w-fit rounded border px-3 py-2 hover:bg-foreground/5">
          보유 종목 입력하기 →
        </Link>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b">
            <tr>
              <th className="py-2">종목</th>
              <th>종가</th>
              <th>전일 대비</th>
              <th>평가 손익</th>
              <th>갱신 시각</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const row = byKey.get(`daily:${h.symbol}`);
              const bars = (row?.data ?? []) as Bar[];
              const last = bars.at(-1);
              const prev = bars.at(-2);
              const change = last && prev ? (last.close / prev.close - 1) * 100 : undefined;
              const pnl = last ? (last.close - Number(h.avg_cost)) * Number(h.shares) : undefined;
              return (
                <tr key={h.symbol} className="border-b">
                  <td className="py-2 font-medium">{h.symbol}</td>
                  <td>{last ? `$${last.close.toFixed(2)}` : "-"}</td>
                  <td className={change === undefined ? "" : change >= 0 ? "text-green-600" : "text-red-600"}>
                    {change === undefined ? "-" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                  </td>
                  <td className={pnl === undefined ? "" : pnl >= 0 ? "text-green-600" : "text-red-600"}>
                    {pnl === undefined ? "-" : `${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toFixed(2)}`}
                  </td>
                  <td className="opacity-70">{row ? fmtTime(row.fetched_at as string) : "미수집"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
