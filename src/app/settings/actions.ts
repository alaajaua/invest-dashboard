"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string };

export async function upsertHolding(_prev: FormState, formData: FormData): Promise<FormState> {
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const shares = Number(formData.get("shares"));
  const avgCost = Number(formData.get("avg_cost"));
  const targetRaw = String(formData.get("target_weight") ?? "").trim();
  const targetWeight = targetRaw === "" ? null : Number(targetRaw);

  if (!/^[A-Z.\-]{1,10}$/.test(symbol)) return { error: "종목 코드를 확인하세요 (예: AAPL)." };
  if (!(shares > 0)) return { error: "수량은 0보다 커야 합니다." };
  if (!(avgCost >= 0)) return { error: "평단가를 확인하세요." };
  if (targetWeight !== null && !(targetWeight >= 0 && targetWeight <= 100))
    return { error: "목표 비중은 0~100 사이여야 합니다." };

  const supabase = await createClient();
  const { count } = await supabase.from("holdings").select("*", { count: "exact", head: true });
  const { data: existing } = await supabase.from("holdings").select("id").eq("symbol", symbol).maybeSingle();
  // 무료 API 한도(하루 25회)에 맞춰 최대 10종목으로 제한
  if (!existing && (count ?? 0) >= 10) return { error: "종목은 최대 10개까지 등록할 수 있습니다." };

  const { error } = await supabase.from("holdings").upsert(
    { symbol, shares, avg_cost: avgCost, target_weight: targetWeight },
    { onConflict: "user_id,symbol" },
  );
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function deleteHolding(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("holdings").delete().eq("id", String(formData.get("id")));
  revalidatePath("/settings");
}
