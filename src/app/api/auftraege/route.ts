// src/app/api/auftraege/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { dummyAuftraege } from '@/data/dummyAuftraege';

// Roh-Typ: so flexibel wie nötig (optional + alternative Keys)
type RawAuftrag = {
  id: string | number;
  bilder?: string[];
  verfahren?: { name: string; felder?: any }[];
  material?: string;
  length?: number;
  width?: number;
  height?: number;
  masse?: string;
  standort?: string;
  lieferdatum?: string | Date;
  abholDatum?: string | Date;  // Variante 1
  abholdatum?: string | Date;  // Variante 2 (in Dummy-Daten)
  abholArt?: string;
  lieferArt?: string;
  gesponsert?: boolean;
  beschreibung?: string;
};

// API-Ausgabetyp (normalisiert)
type ApiAuftrag = {
  id: string | number;
  bilder: string[];
  verfahren: { name: string; felder: any }[];
  material: string;
  length: number;
  width: number;
  height: number;
  masse: string;
  standort: string;
  lieferdatum: string; // ISO
  abholDatum: string;  // ISO, immer dieser Key!
  abholArt: string;
  lieferArt: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '12', 10)));

  // ?sponsored=true ODER ?gesponsert=true akzeptieren
  const sponsoredParam = (searchParams.get('sponsored') || searchParams.get('gesponsert') || '').toLowerCase();
  const wantSponsored = sponsoredParam === 'true' || sponsoredParam === '1';

  // Wichtig: nicht als Api-Typ casten, sondern als Raw und später normieren
  const rawList = dummyAuftraege as unknown as RawAuftrag[];
  const filtered = wantSponsored ? rawList.filter(a => !!a.gesponsert) : rawList;

  const result: ApiAuftrag[] = filtered.slice(0, limit).map((a) => {
    const abhol = a.abholDatum ?? a.abholdatum ?? new Date(); // beide Varianten unterstützen
    const liefer = a.lieferdatum ?? new Date();

    return {
      id: a.id,
      bilder: a.bilder ?? [],
      verfahren: (a.verfahren ?? []).map(v => ({
        name: v.name,
        felder: v.felder ?? {}, // fehlende Felder abfangen
      })),
      material: a.material ?? '',
      length: a.length ?? 0,
      width: a.width ?? 0,
      height: a.height ?? 0,
      masse: a.masse ?? '',
      standort: a.standort ?? '',
      lieferdatum: new Date(liefer as any).toISOString(),
      abholDatum: new Date(abhol as any).toISOString(),
      abholArt: a.abholArt ?? '',
      lieferArt: a.lieferArt ?? '',
    };
  });

  return NextResponse.json(result);
}
