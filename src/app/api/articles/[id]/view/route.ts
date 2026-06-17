import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ARTICLE_ID_MISSING" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    const { error } = await supabase.rpc("increment_article_views", {
      p_article_id: id,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}