"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string };

export async function upsertHolding(_prev: FormState, formData: FormData): Promise<FormState> {
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  if (!/^[A-Z.\-]{1,10}$/.test(symbol)) return { error: "종목 코드를 확인하세요 (예: AAPL)." };

  const supabase = await createClient();
  const { count } = await supabase.from("holdings").select("*", { count: "exact", head: true });
  const { data: existing } = await supabase.from("holdings").select("id").eq("symbol", symbol).maybeSingle();
  if (existing) return { error: `${symbol}은(는) 이미 등록되어 있습니다.` };
  // 무료 API 한도(하루 25회)에 맞춰 최대 10종목으로 제한
  if ((count ?? 0) >= 10) return { error: "종목은 최대 10개까지 등록할 수 있습니다." };

  const { error } = await supabase.from("holdings").insert({ symbol });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function deleteHolding(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("holdings").delete().eq("id", String(formData.get("id")));
  revalidatePath("/settings");
}
