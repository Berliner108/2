export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const USERNAME_RE = /^[a-z0-9_-]{3,24}$/;
const RESERVED = new Set(["admin", "root", "support", "system", "owner", "moderator"]);

export async function POST(req: Request) {
  try {
    const { username } = (await req.json()) as { username?: string };
    const usernameNorm = (username ?? "").trim();

    if (!usernameNorm) {
      return NextResponse.json({ error: "USERNAME_REQUIRED" }, { status: 400 });
    }
    if (!USERNAME_RE.test(usernameNorm)) {
      return NextResponse.json({ error: "INVALID_USERNAME" }, { status: 400 });
    }
    if (RESERVED.has(usernameNorm.toLowerCase())) {
      return NextResponse.json({ usernameTaken: true, reason: "reserved" });
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin.rpc("is_username_available", { name: usernameNorm });
    if (error) {
      return NextResponse.json(
        { error: "DB_ERROR", details: error.message },
        { status: 500 }
      );
    }

    // data === true  -> verfügbar | data === false -> vergeben
    return NextResponse.json({ usernameTaken: data === false });
  } catch (e: any) {
    return NextResponse.json(
      { error: "BAD_REQUEST", details: e?.message },
      { status: 400 }
    );
  }
}
