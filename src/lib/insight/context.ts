import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bar, NewsItem, Point } from "@/lib/market/alphavantage";

const pct = (a: number, b: number) => Math.round((a / b - 1) * 1000) / 10;

function priceSummary(bars: Bar[]) {
  const month = bars.slice(-22);
  if (month.length < 2) return null;
  const last = month.at(-1)!;
  const moves = month
    .slice(1)
    .map((b, i) => ({ date: b.date, change: pct(b.close, month[i].close) }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 3);
  return {
    asOf: last.date,
    close: last.close,
    change1w: month.length > 5 ? pct(last.close, month.at(-6)!.close) : null,
    change1m: pct(last.close, month[0].close),
    biggestDailyMoves: moves,
  };
}

function newsSummary(items: NewsItem[], symbol: string) {
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return items
    .filter((n) => Date.parse(n.publishedAt) >= since)
    .map((n) => {
      const t = n.tickers.find((x) => x.ticker === symbol);
      return { date: n.publishedAt.slice(0, 10), title: n.title, source: n.source, relevance: t?.relevance ?? 0, sentiment: t?.sentiment ?? n.sentiment };
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 8);
}

const recent = (points: Point[] | undefined, n: number) => (points ?? []).slice(-n);

/** market_cache에서 AI에게 넘길 요약 데이터를 만든다 (원본 전체는 너무 크다). */
export async function buildContext(db: SupabaseClient, symbols: string[]) {
  const { data, error } = await db.from("market_cache").select("key, data, fetched_at");
  if (error) throw new Error(`시장 데이터 조회 실패: ${error.message}`);
  const cache = new Map((data ?? []).map((r) => [r.key as string, r.data]));

  const holdings = symbols.map((symbol) => {
    const overview = cache.get(`overview:${symbol}`) as Record<string, string> | undefined;
    const earnings = cache.get(`earnings:${symbol}`) as { quarterly?: Record<string, string>[] } | undefined;
    return {
      symbol,
      company: overview
        ? {
            name: overview.Name,
            sector: overview.Sector,
            industry: overview.Industry,
            description: overview.Description?.slice(0, 400),
          }
        : null,
      price: priceSummary((cache.get(`daily:${symbol}`) as Bar[]) ?? []),
      news: newsSummary((cache.get(`news:${symbol}`) as NewsItem[]) ?? [], symbol),
      latestEarnings: earnings?.quarterly?.[0] ?? null,
    };
  });

  const sectorEtfs = [...cache.keys()]
    .filter((k) => /^daily:XL[A-Z]+$/.test(k))
    .map((k) => ({ etf: k.slice(6), price: priceSummary(cache.get(k) as Bar[]) }));

  return {
    today: new Date().toISOString().slice(0, 10),
    market: { spy: priceSummary((cache.get("daily:SPY") as Bar[]) ?? []), sectorEtfs },
    macro: {
      treasury10y: recent(cache.get("macro:TREASURY_10Y") as Point[], 22),
      fedFundsRate: recent(cache.get("macro:FEDERAL_FUNDS_RATE") as Point[], 4),
      cpi: recent(cache.get("macro:CPI") as Point[], 13),
      unemployment: recent(cache.get("macro:UNEMPLOYMENT") as Point[], 4),
    },
    holdings,
  };
}
