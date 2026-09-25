import Link from "next/link";

export default function Home() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">오늘의 브리핑</h1>
      <p className="opacity-70">
        데이터 수집(2단계)과 AI 해설(5단계)이 연결되면 이곳에 오늘의 요약이 표시됩니다.
      </p>
      <Link href="/settings" className="w-fit rounded border px-3 py-2 hover:bg-foreground/5">
        보유 종목 입력하기 →
      </Link>
    </section>
  );
}
