import { createClient } from "@/lib/supabase/server";
import { deleteHolding } from "./actions";
import { HoldingForm } from "./holding-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: holdings, error } = await supabase
    .from("holdings")
    .select("id, symbol, shares, avg_cost, target_weight")
    .order("symbol");

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">보유 종목 설정</h1>
        <p className="text-sm opacity-70">같은 종목을 다시 입력하면 수량·평단가가 수정됩니다. 최대 10개.</p>
      </div>

      <HoldingForm />

      {error && <p className="text-sm text-red-600">불러오기 실패: {error.message}</p>}

      <table className="w-full text-left text-sm">
        <thead className="border-b">
          <tr>
            <th className="py-2">종목</th>
            <th>수량</th>
            <th>평단가</th>
            <th>목표 비중</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {holdings?.map((h) => (
            <tr key={h.id} className="border-b">
              <td className="py-2 font-medium">{h.symbol}</td>
              <td>{Number(h.shares)}</td>
              <td>${Number(h.avg_cost).toFixed(2)}</td>
              <td>{h.target_weight == null ? "-" : `${Number(h.target_weight)}%`}</td>
              <td className="text-right">
                <form action={deleteHolding}>
                  <input type="hidden" name="id" value={h.id} />
                  <button className="text-red-600 hover:underline">삭제</button>
                </form>
              </td>
            </tr>
          ))}
          {holdings?.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center opacity-60">아직 등록된 종목이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
