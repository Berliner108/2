"use server";

import { headers, cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientIp, hashIp } from "@/lib/ip-hash";

type Result = { ok: true; duplicate: boolean } | { ok: false; error: string };

export async function registerAction(formData: FormData): Promise<Result> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();

  try {
    // 1) IP-Hash berechnen (Next 15: headers() ist async)
    const h = await headers();
    const ipHash = hashIp(getClientIp(h));

    // 2) Duplikate zählen (nur Flag)
    const admin = supabaseAdmin();
    const { count: dupCountPre } = await admin
      .from("user_ip_hashes")
      .select("user_id", { count: "exact", head: true })
      .eq("ip_hash", ipHash);

    const duplicate = (dupCountPre ?? 0) >= 1;

    // 3) Supabase-Serverclient (Next 15: cookies() ist ggf. async)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Im Server-Action-Kontext absichern
            try {
              cookieStore.set({ name, value, ...options });
            } catch {}
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch {}
          },
        },
      }
    );

    // 4) User registrieren
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) return { ok: false, error: error.message };
    const user = data.user;
    if (!user) return { ok: false, error: "USER_CREATE_FAILED" };

    // statt: .insert(...).onConflict(...).ignore()
const { error: insErr } = await admin
  .from('user_ip_hashes')
  .upsert(
    { ip_hash: ipHash, user_id: user.id },
    { onConflict: 'user_id,ip_hash', ignoreDuplicates: true }
  );

if (insErr) {
  return { ok: false, error: insErr.message };
}


    return { ok: true, duplicate };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "UNKNOWN" };
  }
}
