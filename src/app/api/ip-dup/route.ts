export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientIp, hashIp } from "@/lib/ip-hash";

// GET: nur zählen
export async function GET(request: Request) {
  const admin = supabaseAdmin();
  const ip = getClientIp(request.headers);
  const ipHash = hashIp(ip);

  const { count, error } = await admin
    .from("user_ip_hashes")
    .select("user_id", { count: "exact", head: true })
    .eq("ip_hash", ipHash);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ipHash, count: count ?? 0 });
}

// POST: speichern (idempotent)
export async function POST(request: Request) {
  try {
    const { userId } = (await request.json()) as { userId?: string };
    if (!userId) {
      return NextResponse.json({ ok: false, error: "USER_ID_REQUIRED" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const ipHash = hashIp(getClientIp(request.headers));

    const { error } = await admin
      .from("user_ip_hashes")
      .upsert(
        { user_id: userId, ip_hash: ipHash },
        { onConflict: "user_id,ip_hash", ignoreDuplicates: true }
      );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ipHash });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "BAD_REQUEST" }, { status: 400 });
  }
}

