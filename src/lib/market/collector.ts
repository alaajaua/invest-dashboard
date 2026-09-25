import { createAdminClient } from "@/lib/supabase/admin";
import { avFetch, parseDaily, parseEconomic, parseNews, RateLimitError } from "./alphavantage";
import { sectorEtf } from "./sectors";

export const DAILY_LIMIT = 25;
const HOUR = 60 * 60 * 1000;

type Task = {
  key: string;
  ttlHours: number;
  params: Record<string, string>;
  parse: (json: Record<string, unknown>) => unknown;
};

const daily = (symbol: string): Task => ({
  key: `daily:${symbol}`,
  ttlHours: 18,
  params: { function: "TIME_SERIES_DAILY", symbol, outputsize: "compact" },
  parse: parseDaily,
});

const macro = (name: string, params: Record<string, string>, ttlHours: number): Task => ({
  key: `macro:${name}`,
  ttlHours,
  params,
  parse: parseEconomic,
});

// 우선순위 순서대로 나열. 예산이 모자라면 뒤쪽 작업은 다음 실행으로 미뤄진다.
function buildTasks(symbols: string[], sectors: Map<string, string>): Task[] {
  const etfs = [...new Set([...sectors.values()].map(sectorEtf).filter((e): e is string => !!e))];

  return [
    ...symbols.map(daily),
    daily("SPY"),
    // NEWS_SENTIMENT의 tickers는 AND 조건이라 종목별로 따로 호출한다.
    ...symbols.map((symbol) => ({
      key: `news:${symbol}`,
      ttlHours: 44,
      params: { function: "NEWS_SENTIMENT", tickers: symbol, sort: "LATEST", limit: "50" },
      parse: parseNews,
    })),
    macro("TREASURY_10Y", { function: "TREASURY_YIELD", interval: "daily", maturity: "10year" }, 18),
    ...etfs.filter((e) => !symbols.includes(e)).map(daily),
    ...symbols.flatMap((symbol) => [
      { key: `overview:${symbol}`, ttlHours: 7 * 24, params: { function: "OVERVIEW", symbol }, parse: (j: Record<string, unknown>) => j },
      {
        key: `earnings:${symbol}`,
        ttlHours: 7 * 24,
        params: { function: "EARNINGS", symbol },
        parse: (j: Record<string, unknown>) => ({ quarterly: ((j["quarterlyEarnings"] ?? []) as unknown[]).slice(0, 8) }),
      },
    ]),
    macro("FEDERAL_FUNDS_RATE", { function: "FEDERAL_FUNDS_RATE", interval: "monthly" }, 7 * 24),
    macro("CPI", { function: "CPI", interval: "monthly" }, 7 * 24),
    macro("UNEMPLOYMENT", { function: "UNEMPLOYMENT" }, 7 * 24),
  ];
}

export type CollectResult = {
  fetched: string[];
  failed: { key: string; error: string }[];
  pending: string[];
  callsToday: number;
  stoppedReason?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 오래된(TTL 지난) 데이터만 우선순위대로 가져온다.
 * @param reserve 수동 새로고침용으로 남겨 둘 호출 수
 * @param deadlineMs 이 시간이 지나면 중단 (서버리스 함수 제한시간 대비)
 */
export async function collect({ reserve = 0, deadlineMs = 50_000 } = {}): Promise<CollectResult> {
  const startedAt = Date.now();
  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: usage }, { data: holdings }, { data: cache }] = await Promise.all([
    db.from("api_usage").select("calls").eq("day", today).maybeSingle(),
    db.from("holdings").select("symbol"),
    db.from("market_cache").select("key, fetched_at, data->Sector"),
  ]);

  let calls = usage?.calls ?? 0;
  const symbols = [...new Set((holdings ?? []).map((h) => h.symbol as string))].sort();
  const fetchedAt = new Map((cache ?? []).map((c) => [c.key as string, Date.parse(c.fetched_at as string)]));
  const sectors = new Map(
    (cache ?? [])
      .filter((c) => (c.key as string).startsWith("overview:") && c.Sector)
      .map((c) => [(c.key as string).slice("overview:".length), String(c.Sector)]),
  );

  const stale = buildTasks(symbols, sectors).filter(
    (t) => Date.now() - (fetchedAt.get(t.key) ?? 0) > t.ttlHours * HOUR,
  );

  const result: CollectResult = { fetched: [], failed: [], pending: [], callsToday: calls };

  for (let i = 0; i < stale.length; i++) {
    const task = stale[i];
    if (calls >= DAILY_LIMIT - reserve) {
      result.stoppedReason = "오늘 호출 예산 소진";
    } else if (Date.now() - startedAt > deadlineMs) {
      result.stoppedReason = "실행 시간 제한";
    }
    if (result.stoppedReason) {
      result.pending = stale.slice(i).map((t) => t.key);
      break;
    }

    calls++;
    await db.from("api_usage").upsert({ day: today, calls });
    try {
      const data = task.parse(await avFetch(task.params));
      const { error } = await db.from("market_cache").upsert({ key: task.key, data, fetched_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      result.fetched.push(task.key);
    } catch (e) {
      if (e instanceof RateLimitError) {
        if (e.daily) {
          result.stoppedReason = "Alpha Vantage 일일 한도 도달";
          result.pending = stale.slice(i).map((t) => t.key);
          break;
        }
        // 초/분당 제한: 잠시 쉬고 같은 작업을 다시 시도
        await sleep(15_000);
        i--;
        continue;
      }
      result.failed.push({ key: task.key, error: e instanceof Error ? e.message : String(e) });
    }
    await sleep(1_200);
  }

  result.callsToday = calls;
  return result;
}
