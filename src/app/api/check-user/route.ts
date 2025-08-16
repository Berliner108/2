export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const emailNorm = (email ?? "").trim().toLowerCase();
    if (!emailNorm) {
      return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin.rpc("email_status", { p_email: emailNorm });

    if (error) {
      return NextResponse.json(
        { error: "DB_ERROR", details: error.message },
        { status: 500 }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    const exists = !!row?.found;
    const confirmed = !!row?.is_confirmed;

    return NextResponse.json({ exists, confirmed });
  } catch (e: any) {
    return NextResponse.json(
      { error: "BAD_REQUEST", details: e?.message },
      { status: 400 }
    );
  }
}
