// src/app/api/lackanfragen/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { artikelDaten as artikelDatenLackanfragen } from '@/data/ArtikelDatenLackanfragen';

type Lackanfrage = {
  id: string | number;
  titel: string;
  bilder: string[];
  menge: number;
  lieferdatum: string | Date;
  hersteller: string;
  zustand: string;
  kategorie: string;
  ort: string;
  gesponsert?: boolean;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '12', 10)));

  let list = [...artikelDatenLackanfragen] as Lackanfrage[];
  // optional: nur gesponsert, falls du es später willst:
  // const wantSponsored = (searchParams.get('gesponsert') || '').toLowerCase() === 'true';
  // if (wantSponsored) list = list.filter(a => !!a.gesponsert);

  const result = list.slice(0, limit).map(a => ({
    id: a.id,
    titel: a.titel,
    bilder: a.bilder || [],
    menge: a.menge ?? 0,
    lieferdatum: new Date(a.lieferdatum as any).toISOString(),
    hersteller: a.hersteller ?? '',
    zustand: a.zustand ?? '',
    kategorie: a.kategorie ?? '',
    ort: a.ort ?? '',
  }));

  return NextResponse.json(result);
}
