"use server";

import { headers, cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientIp, hashIp } from "@/lib/ip-hash";

type Result = { ok: true; duplicate: boolean } | { ok: false; error: string };

export async function registerAction(formData: FormData): Promise<Result> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();

  // 1) IP-Hash berechnen
  const h = headers();
  const ipHash = hashIp(getClientIp(h));

  // 2) Duplikate zählen (vor dem SignUp – nur Info/Flag)
  const admin = supabaseAdmin();
  const { count: dupCountPre } = await admin
    .from("user_ip_hashes")
    .select("user_id", { count: "exact", head: true })
    .eq("ip_hash", ipHash);

  const duplicate = (dupCountPre ?? 0) >= 1; // es existiert schon mind. 1 Account auf diesem IP-Hash

  // 3) User registrieren
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set() {}, remove() {}
      },
    }
  );

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) return { ok: false, error: error.message };
  const user = data.user;
  if (!user) return { ok: false, error: "USER_CREATE_FAILED" };

  // 4) IP-Hash für den neuen User speichern (idempotent)
  const { error: insErr } = await admin
    .from("user_ip_hashes")
    .insert({ ip_hash: ipHash, user_id: user.id })
    .onConflict("user_id,ip_hash")
    .ignore();
  if (insErr && insErr.code !== "23505") {
    // unique violation ignorieren
    return { ok: false, error: insErr.message };
  }

  return { ok: true, duplicate };
}
