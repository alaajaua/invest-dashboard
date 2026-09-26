import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// RLS를 우회하는 service role 클라이언트. 서버 코드(크론, Server Action)에서만 사용.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("환경변수 SUPABASE_SERVICE_ROLE_KEY가 비어 있습니다.");
  return createClient(
    SUPABASE_URL,
    key,
    { auth: { persistSession: false } },
  );
}
