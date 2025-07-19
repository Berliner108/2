// src/app/api/angebot-einstellen/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Beispiel: Werte sicher extrahieren
    const titel = formData.get('titel');
    const farbton = formData.get('farbton');
    const bilder = formData.getAll('bilder'); // Datei-Uploads
    const bewerbung = formData.get('bewerbung'); // neue Checkbox-Werte

    console.log('✅ Formular-Empfang:');
    console.log('Titel:', titel);
    console.log('Farbton:', farbton);
    console.log('Bilder:', bilder.length);
    console.log('Bewerbung gewünscht:', bewerbung); // z. B. "startseite,suche"

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Fehler beim Verarbeiten:', error);
    return NextResponse.json({ success: false, error: 'Serverfehler' }, { status: 500 });
  }
}

export async function GET() {
  return new Response('GET erfolgreich: API aktiv', { status: 200 });
}
