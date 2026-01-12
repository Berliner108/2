export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase-route";

type PatchBody = {
  published?: boolean;
  archived?: boolean;
};

function isBool(v: any): v is boolean {
  return typeof v === "boolean";
}

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseRouteClient();

    const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 401 });

    const user = sessionRes?.session?.user;
    if (!user) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });

    // id aus URL: .../api/konto/articles/{id}
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1];
    if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    // RLS schützt: nur Owner darf lesen
    const { data, error } = await supabase
      .from("articles")
      .select(`
        id,
        category,
        title,
        description,
        sell_to,
        manufacturer,
        condition,
        sale_type,
        delivery_days,
        stock_status,
        qty_kg,
        qty_piece,
        size,
        pieces_per_unit,
        image_urls,
        file_urls,
        color_palette,
        gloss_level,
        surface,
        application,
        color_tone,
        color_code,
        quality,
        effect,
        special_effects,
        certifications,
        charge,
        published,
        archived,
        sold_out,
        created_at
      `)
      .eq("id", id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "NOT_FOUND_OR_FORBIDDEN" }, { status: 404 });

    return NextResponse.json({ article: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}


export async function PATCH(req: Request) {
  try {
    const supabase = await createSupabaseRouteClient();

    const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 401 });

    const user = sessionRes?.session?.user;
    if (!user) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });

    // id aus URL: .../api/konto/articles/{id}
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1];
    if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as PatchBody;

    const patch: Record<string, boolean> = {};
    if (isBool(body.published)) patch.published = body.published;
    if (isBool(body.archived)) patch.archived = body.archived;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "NO_VALID_FIELDS" }, { status: 400 });
    }

    // RLS soll das Owner-Update schützen
    const { data, error } = await supabase
      .from("articles")
      .update(patch)
      .eq("id", id)
      .select("id, published, archived")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "NOT_FOUND_OR_FORBIDDEN" }, { status: 404 });

    return NextResponse.json({ ok: true, article: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
