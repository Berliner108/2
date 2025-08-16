import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin'; // Service Role Client

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'E-Mail fehlt' }, { status: 400 });
    }

    // E-Mail normalisieren
    const emailNorm = email.trim().toLowerCase();

    // In Auth-Users prüfen
    const { data, error } = await supabaseAdmin
      .from('auth.users')
      .select('id, email_confirmed_at')
      .eq('email', emailNorm)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Keine E-Mail gefunden
      return NextResponse.json({ exists: false });
    }

    // Falls vorhanden: Status zurückgeben
    return NextResponse.json({
      exists: true,
      confirmed: !!data.email_confirmed_at,
    });

  } catch (err: any) {
    console.error('E-Mail-Check Fehler:', err);
    return NextResponse.json(
      { error: err.message || 'Serverfehler beim E-Mail-Check' },
      { status: 500 }
    );
  }
}
