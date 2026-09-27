import Link from "next/link";
import { notFound } from "next/navigation";
import { INSIGHT_KEY, stockKey, type InsightRecord, type StockRecord } from "@/lib/insight/schema";
import { createClient } from "@/lib/supabase/server";
import { ExplainText } from "../../explain-text";
import { IMPACT, STATUS } from "@/lib/insight/style";
import { PriceChart } from "./price-chart";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });

const SCENARIOS = [
  { key: "bull", label: "좋아진다면", icon: "▲", color: STATUS.tailwind.color },
  { key: "base", label: "기본 흐름", icon: "●", color: "var(--chart-muted)" },
  { key: "bear", label: "나빠진다면", icon: "▼", color: STATUS.headwind.color },
] as const;

export default async function StockPage({ params }: PageProps<"/stock/[symbol]">) {
  const symbol = decodeURIComponent((await params).symbol).toUpperCase();
  if (!/^[A-Z.\-]{1,10}$/.test(symbol)) notFound();

  const supabase = await createClient();
  const [{ data: stockRow }, { data: insightRow }, { data: holding }] = await Promise.all([
    supabase.from("market_cache").select("data").eq("key", stockKey(symbol)).maybeSingle(),
    supabase.from("market_cache").select("data").eq("key", INSIGHT_KEY).maybeSingle(),
    supabase.from("holdings").select("symbol").eq("symbol", symbol).maybeSingle(),
  ]);
  const record = stockRow?.data as StockRecord | undefined;
  const insight = (insightRow?.data as InsightRecord | undefined)?.insight;
  const summary = insight?.holdings.find((h) => h.symbol === symbol);
  const links = insight?.links.filter((l) => l.to === symbol) ?? [];

  const back = (
    <Link href="/" className="text-sm opacity-70 hover:opacity-100">← 영향 지도로</Link>
  );

  if (!record) {
    return (
      <section className="flex flex-col gap-4">
        {back}
        <h1 className="text-2xl font-bold">{symbol}</h1>
        <p className="rounded-lg border p-4 opacity-80">
          {holding
            ? "아직 이 종목의 상세 해설이 없습니다. 평일 밤 10시쯤 예약 작업이 실행되면 채워집니다."
            : "등록되지 않은 종목입니다. 내 종목에 추가하면 다음 예약 작업부터 상세 해설이 만들어집니다."}
        </p>
      </section>
    );
  }

  const d = record.detail;
  const g = [...d.glossary, ...(insight?.glossary ?? [])];
  const status = summary ? STATUS[summary.status] : null;

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        {back}
        <h1 className="text-2xl font-bold">
          {status && <span style={{ color: status.color }}>{status.icon} </span>}
          {d.symbol} <span className="text-lg font-normal opacity-70">{d.name}</span>
          {status && <span className="pl-2 text-sm font-normal opacity-70">{status.label}</span>}
        </h1>
        <p className="text-sm opacity-60">{fmtTime(record.generatedAt)} 기준 · AI 해설 · {d.intro.sector}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 text-sm leading-relaxed">
          <p className="pb-1 opacity-60">이 회사는</p>
          <p><ExplainText text={d.intro.what} glossary={g} /></p>
        </div>
        <div className="rounded-lg border p-4 text-sm leading-relaxed">
          <p className="pb-1 opacity-60">돈을 버는 방법</p>
          <p><ExplainText text={d.intro.howMoney} glossary={g} /></p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="pb-1 text-lg font-bold">최근 1개월, 왜 이렇게 움직였나</h2>
        {summary && <p className="pb-3 text-sm leading-relaxed"><ExplainText text={summary.flow} glossary={g} /></p>}
        <PriceChart prices={d.prices} events={d.events} />
        {d.events.length > 0 && (
          <ol className="flex flex-col gap-2 border-t pt-3 text-sm">
            {d.events.map((e, i) => {
              const s = IMPACT[e.impact];
              return (
                <li key={i}>
                  <span style={{ color: s.color }}>{s.icon}</span> <b>{e.date}</b> {e.title}{" "}
                  <span className="opacity-60">— {e.explanation}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">이 종목을 움직이는 힘</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {d.drivers.map((dr, i) => {
            const s = STATUS[dr.status];
            return (
              <div key={i} className="rounded-lg border p-4 text-sm leading-relaxed" style={{ borderColor: s.color }}>
                <p className="font-bold"><span style={{ color: s.color }}>{s.icon}</span> {dr.name} <span className="text-xs font-normal opacity-70">{s.label}</span></p>
                <p className="pt-1"><ExplainText text={dr.explanation} glossary={g} /></p>
              </div>
            );
          })}
        </div>
        {links.length > 0 && (
          <p className="text-sm opacity-70">
            영향 지도에서 연결된 요인:{" "}
            {links.map((l, i) => {
              const f = insight?.factors.find((x) => x.id === l.from);
              return <span key={i}>{i > 0 && ", "}{f?.name ?? l.from}({l.effect === "positive" ? "＋" : "－"})</span>;
            })}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">앞으로의 시나리오</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {SCENARIOS.map((sc) => {
            const v = d.scenarios[sc.key];
            return (
              <div key={sc.key} className="flex flex-col gap-2 rounded-lg border p-4 text-sm leading-relaxed" style={{ borderColor: sc.color }}>
                <p className="font-bold"><span style={{ color: sc.color }}>{sc.icon}</span> {sc.label}</p>
                <p><span className="opacity-60">이런 일이 생기면: </span><ExplainText text={v.conditions} glossary={g} /></p>
                <p><span className="opacity-60">그 의미: </span><ExplainText text={v.meaning} glossary={g} /></p>
              </div>
            );
          })}
        </div>
        <p className="text-xs opacity-50">시나리오는 이해를 돕기 위한 가정이며 예측이나 투자 권유가 아닙니다.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 text-sm">
          <h2 className="pb-2 text-base font-bold">지켜볼 일정</h2>
          {d.upcoming.length ? (
            <ul className="flex flex-col gap-1">{d.upcoming.map((u, i) => <li key={i}><b>{u.date}</b> {u.what}</li>)}</ul>
          ) : (
            <p className="opacity-60">확인된 일정이 없습니다.</p>
          )}
          {summary && summary.watch.length > 0 && (
            <ul className="list-disc pt-2 pl-5 opacity-80">{summary.watch.map((w, i) => <li key={i}>{w}</li>)}</ul>
          )}
        </div>
        <div className="rounded-lg border p-4 text-sm">
          <h2 className="pb-2 text-base font-bold">주의할 점</h2>
          <ul className="list-disc pl-5">{d.risks.map((r, i) => <li key={i}><ExplainText text={r} glossary={g} /></li>)}</ul>
        </div>
      </div>

      {d.news.length > 0 && (
        <div className="rounded-lg border p-4 text-sm">
          <h2 className="pb-2 text-base font-bold">관련 뉴스</h2>
          <ul className="flex flex-col gap-2">
            {d.news.map((n, i) => {
              const s = IMPACT[n.impact];
              return (
                <li key={i}>
                  <span style={{ color: s.color }} aria-label={s.label}>{s.icon}</span>{" "}
                  <a href={n.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">{n.title}</a>{" "}
                  <span className="opacity-60">{n.source} · {n.date}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {d.glossary.length > 0 && (
        <details className="rounded-lg border p-4 text-sm">
          <summary className="cursor-pointer font-bold">이 종목의 용어 {d.glossary.length}개</summary>
          <dl className="grid gap-2 pt-3">
            {d.glossary.map((x) => <div key={x.term}><dt className="font-medium">{x.term}</dt><dd className="opacity-80">{x.easy}</dd></div>)}
          </dl>
        </details>
      )}

      <p className="text-xs opacity-50">AI 해설은 이해를 돕기 위한 참고 자료이며 투자 권유가 아닙니다. 최종 판단은 본인의 몫입니다.</p>
    </section>
  );
}
