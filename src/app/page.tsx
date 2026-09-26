import Link from "next/link";
import { INSIGHT_KEY } from "@/lib/insight/generate";
import type { InsightRecord } from "@/lib/insight/schema";
import { DAILY_LIMIT } from "@/lib/market/collector";
import { createClient } from "@/lib/supabase/server";
import { ExplainText } from "./explain-text";
import { InfluenceMap, STATUS } from "./influence-map";
import { RefreshButtons } from "./refresh-button";

// AI 해설 생성(Server Action)이 1분 이상 걸릴 수 있다.
export const maxDuration = 300;

const WEATHER = { sunny: "☀️", cloudy: "⛅", stormy: "⛈️" };

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });

export default async function Home() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: holdings }, { data: insightRow }, { data: usage }, { count: cacheCount }] = await Promise.all([
    supabase.from("holdings").select("symbol").order("symbol"),
    supabase.from("market_cache").select("data").eq("key", INSIGHT_KEY).maybeSingle(),
    supabase.from("api_usage").select("calls").eq("day", today).maybeSingle(),
    supabase.from("market_cache").select("key", { count: "exact", head: true }).neq("key", INSIGHT_KEY),
  ]);
  const record = insightRow?.data as InsightRecord | undefined;
  const insight = record?.insight;

  if (!holdings?.length) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">영향 지도</h1>
        <p className="opacity-70">먼저 보유하거나 관심 있는 종목을 등록해 주세요.</p>
        <Link href="/settings" className="w-fit rounded border px-3 py-2 hover:bg-foreground/5">종목 등록하기 →</Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm opacity-60">{record ? `${fmtTime(record.generatedAt)} 기준 · AI 해설` : "아직 AI 해설이 없습니다"}</p>
        <h1 className="text-2xl font-bold leading-snug">{insight?.headline ?? "오늘의 영향 지도"}</h1>
      </header>

      {insight ? (
        <>
          <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
            <div className="rounded-lg border p-4">
              <p className="text-sm opacity-60">시장 날씨</p>
              <p className="py-1 text-2xl font-bold">{WEATHER[insight.weather.state]} {insight.weather.label}</p>
              <p className="text-sm leading-relaxed"><ExplainText text={insight.weather.explanation} glossary={insight.glossary} /></p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm opacity-60">한눈에 보기</p>
              <p className="pt-1 leading-relaxed"><ExplainText text={insight.summary} glossary={insight.glossary} /></p>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="pb-3 text-lg font-bold">무엇이 내 종목을 움직이나</h2>
            <InfluenceMap insight={insight} />
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">종목별 이야기</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {insight.holdings.map((h) => {
                const s = STATUS[h.status];
                return (
                  <article key={h.symbol} className="flex flex-col gap-2 rounded-lg border p-4 text-sm leading-relaxed">
                    <h3 className="text-base font-bold">
                      <span style={{ color: s.color }}>{s.icon}</span> {h.symbol}{" "}
                      <span className="text-xs font-normal opacity-70">{h.name} · {s.label}</span>
                    </h3>
                    <p><ExplainText text={h.oneLiner} glossary={insight.glossary} /></p>
                    <p><b>최근 1개월:</b> <ExplainText text={h.flow} glossary={insight.glossary} /></p>
                    {h.watch.length > 0 && (
                      <ul className="list-disc pl-5 opacity-80">{h.watch.map((w, i) => <li key={i}>{w}</li>)}</ul>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          {insight.glossary.length > 0 && (
            <details className="rounded-lg border p-4 text-sm">
              <summary className="cursor-pointer font-bold">오늘 나온 용어 {insight.glossary.length}개</summary>
              <dl className="grid gap-2 pt-3">
                {insight.glossary.map((g) => (
                  <div key={g.term}><dt className="font-medium">{g.term}</dt><dd className="opacity-80">{g.easy}</dd></div>
                ))}
              </dl>
            </details>
          )}
        </>
      ) : (
        <p className="rounded-lg border p-4 opacity-80">
          데이터가 모이면 매일 아침 AI가 영향 지도를 만듭니다. 지금 바로 보려면 아래에서 <b>데이터 갱신</b> 후 <b>AI 해설 새로 만들기</b>를 누르세요.
        </p>
      )}

      <footer className="flex flex-col gap-2 border-t pt-4 text-sm">
        <p className="opacity-60">
          등록 종목 {holdings.length}개 · 수집된 데이터 {cacheCount ?? 0}건 · 오늘 API 사용 {usage?.calls ?? 0}/{DAILY_LIMIT}회
        </p>
        <RefreshButtons />
        <p className="text-xs opacity-50">AI 해설은 이해를 돕기 위한 참고 자료이며 투자 권유가 아닙니다. 최종 판단은 본인의 몫입니다.</p>
      </footer>
    </section>
  );
}
