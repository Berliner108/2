import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  const cookieStore = await cookies(); // ✅ Next 15: cookies() ist async

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ✅ Profiladresse als JSON holen
  const { data: prof, error: pErr } = await supabase
    .from("profiles")
    .select("address")
    .eq("id", auth.user.id)
    .single();

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  // address kann als Object ODER (selten) als String kommen → robust parsen
  const addressRaw = (prof as any)?.address;
  const address =
    typeof addressRaw === "string" ? safeJson(addressRaw) : addressRaw;

  const zip = String(address?.zip ?? "");
  const city = String(address?.city ?? "");
  const standort = [zip, city].filter(Boolean).join(" ");

  // ✅ Jobs minimal laden (nur was du willst)
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, material_guete, material_guete_custom, verfahren_1, verfahren_2, published, status, created_at")
    .eq("user_id", auth.user.id)
    .eq("published", true)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ standort, jobs: jobs ?? [] });
}

function safeJson(v: string) {
  try { return JSON.parse(v); } catch { return null; }
}
