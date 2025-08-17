// src/app/api/artikel/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { artikelDaten as artikelDatenShop } from '@/data/ArtikelimShop';

type ShopArtikel = {
  id: string | number;
  titel: string;
  bilder: string[];
  menge: number;
  lieferdatum: string | Date;
  hersteller: string;
  zustand: string;
  kategorie: string;
  preis: number;
  gesponsert?: boolean;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '12', 10)));

  // ?gesponsert=true oder ?sponsored=true
  const sponsoredParam = (searchParams.get('gesponsert') || searchParams.get('sponsored') || '').toLowerCase();
  const wantSponsored = sponsoredParam === 'true' || sponsoredParam === '1';

  let list = [...artikelDatenShop] as ShopArtikel[];
  if (wantSponsored) list = list.filter(a => !!a.gesponsert);

  const result = list.slice(0, limit).map(a => ({
    id: a.id,
    titel: a.titel,
    bilder: a.bilder || [],
    menge: a.menge ?? 0,
    lieferdatum: new Date(a.lieferdatum as any).toISOString(),
    hersteller: a.hersteller ?? '',
    zustand: a.zustand ?? '',
    kategorie: a.kategorie ?? '',
    preis: Number(a.preis ?? 0),
  }));

  return NextResponse.json(result);
}
