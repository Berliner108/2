"use server";

import { headers, cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientIp, hashIp } from "@/lib/ip-hash";

type Result = { ok: true; duplicate: boolean } | { ok: false; error: string };

function safeRedirectPath(input: string | null | undefined): string {
  if (!input) return "/";
  try {
    const url = new URL(input, "https://dummy.local");
    // nur Pfad+Query+Hash zulassen
    return url.pathname + url.search + url.hash || "/";
  } catch {
    return input.startsWith("/") ? input : "/";
  }
}

/** Liest Proto/Host aus Request-Headern (Headers sind bereits übergeben). */
function getOriginFromHeaders(h: Headers | Readonly<Headers> | { get(name: string): string | null }): string {
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    "localhost:3000";

  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    `${proto}://${host}`
  );
}

export async function registerAction(formData: FormData): Promise<Result> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const usernameRaw = String(formData.get("username") ?? "").trim();
  const redirectParam = safeRedirectPath(String(formData.get("redirect") ?? "/"));

  // username serverseitig normalisieren + validieren
  const username = usernameRaw.replace(/[^a-z0-9_-]/gi, "").toLowerCase().slice(0, 24);
  if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
    return { ok: false, error: "INVALID_USERNAME" };
  }

  try {
    // 1) Request-Header einmalig holen (kompatibel, falls headers() Promise zurückgibt)
    const h = await headers();

    // 2) IP-Hash berechnen
    const ipHash = hashIp(getClientIp(h));

    // 3) Duplikate zählen (nur Flag)
    const admin = supabaseAdmin();
    const { count: dupCountPre } = await admin
      .from("user_ip_hashes")
      .select("user_id", { count: "exact", head: true })
      .eq("ip_hash", ipHash);

    const duplicate = (dupCountPre ?? 0) >= 1;

    // 4) Supabase-Serverclient
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }); } catch {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: "", ...options }); } catch {}
          },
        },
      }
    );

    // 5) Username-Verfügbarkeit prüfen (RPC, case-insensitiv)
    const { data: available, error: availErr } = await supabase
      .rpc("is_username_available", { name: username });
    if (availErr) {
      return { ok: false, error: "USERNAME_CHECK_FAILED" };
    }
    if (available === false) {
      return { ok: false, error: "USERNAME_TAKEN" };
    }

    // 6) User registrieren (Bestätigungslink inkl. redirect-Param)
    const origin = getOriginFromHeaders(h);
    const emailRedirectTo = `${origin}/auth/callback?redirect=${encodeURIComponent(redirectParam)}`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },           // lowercase speichern
        emailRedirectTo,              // Bestätigungslink-Ziel
      },
    });

    if (error) return { ok: false, error: error.message || "SIGNUP_FAILED" };
    const user = data.user;
    if (!user) return { ok: false, error: "USER_CREATE_FAILED" };

    // 7) IP-Hash persistieren (idempotent)
    const { error: insErr } = await admin
      .from("user_ip_hashes")
      .upsert(
        { ip_hash: ipHash, user_id: user.id },
        { onConflict: "user_id,ip_hash", ignoreDuplicates: true }
      );
    if (insErr) {
      return { ok: false, error: insErr.message };
    }

    return { ok: true, duplicate };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "UNKNOWN" };
  }
}
