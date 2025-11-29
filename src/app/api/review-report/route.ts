// src/app/api/review-report/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    // 1) Supabase-User holen (gleiches Muster wie in /api/profile)
    const sb = await supabaseServer();
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    // 2) Body lesen
    const { reviewId, reason } = await req.json().catch(() => ({} as any));

    if (!reviewId || !reason || !String(reason).trim()) {
      return NextResponse.json(
        { error: 'reviewId_and_reason_required' },
        { status: 400 }
      );
    }

    // 3) Nodemailer-Transport (Strato)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465, // 465 = true, sonst false
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const text = `
Es wurde eine Bewertung gemeldet.

Bewertungs-ID: ${reviewId}

Gemeldet von:
User-ID: ${user.id}
E-Mail:   ${user.email ?? '(keine E-Mail im Profil)'}

Grund:
${reason}
`.trim();

    await transporter.sendMail({
      from: `"Lackanfragen" <${process.env.REPORT_FROM_EMAIL}>`,
      to: process.env.REPORT_TO_EMAIL,
      subject: `Bewertung gemeldet – ID: ${reviewId}`,
      text,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[review-report POST] fatal:', e);
    return NextResponse.json({ error: 'fatal' }, { status: 500 });
  }
}
