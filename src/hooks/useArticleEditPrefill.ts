'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

type AnyObj = Record<string, any>;

function pick<T = any>(obj: AnyObj | null | undefined, keys: string[], fallback: T): T {
  if (!obj) return fallback;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return fallback;
}

function mapConditionToState(cond: string) {
  const c = (cond || '').toLowerCase();
  if (c.includes('geöffnet')) return 'geöffnet';
  return 'neu';
}

export type EditArticle = {
  [key: string]: any;
};

export function useArticleEditPrefill() {
  const searchParams = useSearchParams();

  const editId = searchParams.get('edit'); // ?edit=ARTICLE_ID
  const isEditMode = !!editId;

  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState<EditArticle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const existingImageUrls = useMemo<string[]>(
    () => pick(article, ['imageUrls', 'image_urls', 'image_urls'], [] as string[]),
    [article]
  );

  const existingFileUrls = useMemo<string[]>(
    () => pick(article, ['fileUrls', 'file_urls', 'file_urls'], [] as string[]),
    [article]
  );

  const reload = useCallback(async () => {
    if (!editId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/verkaufen/prefill?id=${encodeURIComponent(editId)}`, {
        cache: 'no-store',
        credentials: 'include',
      });

      const json = (await res.json().catch(() => ({}))) as AnyObj;
      if (!res.ok) throw new Error(json?.error || 'LOAD_FAILED');

      // ✅ unsere Prefill-Route liefert: { article: {...} }
      const a = (json?.article ?? null) as EditArticle | null;
      setArticle(a);
    } catch (e: any) {
      setError(e?.message || 'Konnte Artikel nicht laden');
      setArticle(null);
    } finally {
      setLoading(false);
    }
  }, [editId]);

  useEffect(() => {
    if (!editId) {
      setArticle(null);
      setError(null);
      setLoading(false);
      return;
    }
    reload();
  }, [editId, reload]);

  const getPrefill = useCallback(() => {
    if (!article) return null;

    // Prefill kommt schon “normalisiert”, aber wir bleiben robust:
    const cat = String(pick(article, ['kategorie', 'category'], '')).toLowerCase();

    const mengeStatus = String(pick(article, ['mengeStatus', 'stock_status', 'menge_status'], ''));
    const aufLager =
    mengeStatus === 'auf_lager' ||
    !!pick<boolean>(article, ['aufLager', 'auf_lager', 'mengeStatus'], false);


    const id = String(pick(article, ['id', 'articleId'], editId ?? ''));

    return {
      // ✅ WICHTIG für Edit
      id,
      articleId: id,

      kategorie:
        cat === 'nasslack' || cat === 'pulverlack' || cat === 'arbeitsmittel'
          ? (cat as any)
          : null,

      titel: pick(article, ['titel', 'title'], ''),
      beschreibung: pick(article, ['beschreibung', 'description'], ''),

      verkaufAn: pick(article, ['verkaufAn', 'sell_to', 'verkauf_an'], ''),
      hersteller: pick(article, ['hersteller', 'manufacturer'], ''),
      zustand: mapConditionToState(String(pick(article, ['zustand', 'condition'], ''))),

      aufLager,
      mengeKg: Number(pick(article, ['mengeKg', 'qty_kg'], 0)) || 0,
      mengeStueck: Number(pick(article, ['mengeStueck', 'qty_piece'], 0)) || 0,

      lieferWerktage: String(pick(article, ['lieferWerktage', 'delivery_days'], '')),

      // ✅ Verkaufslogik (falls du sie prefillen willst)
      verkaufsArt: pick(article, ['verkaufsArt', 'sale_type', 'verkaufs_art'], ''),
      preis: pick(article, ['preis', 'price'], null),
      versandKosten: pick(article, ['versandKosten', 'shipping', 'versand_kosten'], null),
      staffeln: pick(article, ['staffeln'], [
        { minMenge: '1', maxMenge: '', preis: '', versand: '' },
      ]),
      bewerbung: pick(article, ['bewerbung'], []) as string[],

      // Arbeitsmittel extras (wenn du sie gespeichert hast)asdf
      stueckProEinheit: String(pick(article, ['stueckProEinheit'], '')),
      groesse: pick(article, ['groesse'], ''),

      // Lack-Felder
      farbpalette: pick(article, ['farbpalette', 'color_palette'], ''),
      glanzgrad: pick(article, ['glanzgrad', 'gloss_level'], ''),
      oberflaeche: pick(article, ['oberflaeche', 'surface'], ''),
      anwendung: pick(article, ['anwendung', 'application'], ''),
      farbton: pick(article, ['farbton', 'color_tone'], ''),
      farbcode: pick(article, ['farbcode', 'color_code'], ''),
      qualitaet: pick(article, ['qualitaet', 'quality'], ''),

      effekt: pick(article, ['effekt', 'effect'], []) as string[],
      sondereffekte: pick(article, ['sondereffekte', 'special_effects'], []) as string[],
      zertifizierungen: pick(article, ['zertifizierungen', 'certifications'], []) as string[],
      aufladung: pick(article, ['aufladung', 'charge'], []) as string[],

      // URLs extra (falls du lieber über getPrefill gehst)
      imageUrls: pick(article, ['imageUrls', 'image_urls'], []) as string[],
      fileUrls: pick(article, ['fileUrls', 'file_urls'], []) as string[],
    };
  }, [article, editId]);

  return {
    editId,
    isEditMode,
    loading,
    error,
    article,
    reload,
    getPrefill,
    existingImageUrls,
    existingFileUrls,
  };
}
