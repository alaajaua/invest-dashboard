import type { Insight } from "@/lib/insight/schema";

// 본문 속 용어에 점선 밑줄을 긋고, 마우스를 올리면 쉬운 설명을 보여 준다.
export function ExplainText({ text, glossary }: { text: string; glossary: Insight["glossary"] }) {
  const terms = glossary.filter((g) => g.term.trim()).sort((a, b) => b.term.length - a.term.length);
  if (!terms.length) return <>{text}</>;
  const escaped = terms.map((g) => g.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "g"));
  return (
    <>
      {parts.map((part, i) => {
        const g = terms.find((t) => t.term === part);
        return g ? (
          <abbr key={i} title={g.easy} className="cursor-help underline decoration-dotted underline-offset-4">
            {part}
          </abbr>
        ) : (
          part
        );
      })}
    </>
  );
}
