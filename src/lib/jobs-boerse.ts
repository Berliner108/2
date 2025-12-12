// src/lib/jobs-boerse.ts
import { supabaseServer } from '@/lib/supabase-server';
import type { Auftrag } from '@/lib/types/auftrag';

export async function fetchBoersenJobs(): Promise<Auftrag[]> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      id,
      description,
      materialguete,
      laenge_mm,
      breite_mm,
      hoehe_mm,
      masse_kg,
      liefer_datum_utc,
      rueck_datum_utc,
      liefer_art,
      rueck_art,
      promo_score,
      specs,
      published,
      status
    `)
    .eq('published', true)
    .eq('status', 'open')
    .order('promo_score', { ascending: false })
    .order('rueck_datum_utc', { ascending: true });

  if (error || !data) {
    console.error('fetchBoersenJobs error:', error);
    return [];
  }

  const now = Date.now();

  return data
    .filter((row) => {
      if (!row.rueck_datum_utc) return false;
      const rueck = new Date(row.rueck_datum_utc).getTime();
      return rueck >= now;
    })
    .map((row): Auftrag => {
      const specs = (row as any).specs || {};

      let verfahren: Auftrag['verfahren'] = [];

      if (Array.isArray(specs.verfahren)) {
        verfahren = specs.verfahren;
      } else {
        if (specs.verfahren_1) {
          verfahren.push({
            name: specs.verfahren_1,
            felder: specs.spezifikationen_1 || {},
          });
        }
        if (specs.verfahren_2) {
          verfahren.push({
            name: specs.verfahren_2,
            felder: specs.spezifikationen_2 || {},
          });
        }
      }

      return {
        id: row.id,

        verfahren,

        material: row.materialguete ?? null,
        length: row.laenge_mm ?? 0,
        width: row.breite_mm ?? 0,
        height: row.hoehe_mm ?? 0,
        masse:
          row.masse_kg !== null && row.masse_kg !== undefined
            ? String(row.masse_kg)
            : '0',

        warenausgabeDatum: new Date(row.liefer_datum_utc),
        warenannahmeDatum: new Date(row.rueck_datum_utc),
        warenausgabeArt: row.liefer_art ?? null,
        warenannahmeArt: row.rueck_art ?? null,

        bilder: [],   // füllen wir später aus job_files
        dateien: [],  // dito

        standort: null,         // später aus profiles
        gesponsert: (row.promo_score ?? 0) > 0,
        gewerblich: true,       // später sauber aus Profil
        privat: false,

        beschreibung: row.description ?? null,
        user: null,
      };
    });
}
