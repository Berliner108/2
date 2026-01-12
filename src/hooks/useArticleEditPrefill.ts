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
  // wir lassen es bewusst flexibel, weil dein API-Shape evtl. noch angepasst wird
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
    () => pick(article, ['image_urls', 'imageUrls'], [] as string[]),
    [article]
  );

  const existingFileUrls = useMemo<string[]>(
    () => pick(article, ['file_urls', 'fileUrls'], [] as string[]),
    [article]
  );

  const reload = useCallback(async () => {
    if (!editId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/konto/articles/${editId}`, {
        cache: 'no-store',
        credentials: 'include',
      });

      const json = (await res.json().catch(() => ({}))) as AnyObj;
      if (!res.ok) throw new Error(json?.error || 'LOAD_FAILED');

      // API kann { article: {...} } oder direkt das Objekt liefern
      const a = (json?.article ?? json) as EditArticle;
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

  // Helper, damit du im Formular *nur 1 Zeile* brauchst
  const getPrefill = useCallback(() => {
    if (!article) return null;

    const cat = String(pick(article, ['category', 'kategorie'], '')).toLowerCase();
    const stock = String(pick(article, ['stock_status', 'mengeStatus'], ''));

    return {
      kategorie:
        cat === 'nasslack' || cat === 'pulverlack' || cat === 'arbeitsmittel' ? (cat as any) : null,

      titel: pick(article, ['title', 'titel'], ''),
      beschreibung: pick(article, ['description', 'beschreibung'], ''),

      verkaufAn: pick(article, ['sell_to', 'verkaufAn'], ''),

      hersteller: pick(article, ['manufacturer', 'hersteller'], ''),
      zustand: mapConditionToState(String(pick(article, ['condition', 'zustand'], ''))),

      aufLager: stock === 'auf_lager',
      mengeKg: Number(pick(article, ['qty_kg', 'mengeKg'], 0)) || 0,
      mengeStueck: Number(pick(article, ['qty_piece', 'mengeStueck'], 0)) || 0,

      lieferWerktage: pick(article, ['delivery_days', 'lieferWerktage'], ''),

      // Lack-Felder
      farbpalette: pick(article, ['color_palette', 'farbpalette'], ''),
      glanzgrad: pick(article, ['gloss_level', 'glanzgrad'], ''),
      oberflaeche: pick(article, ['surface', 'oberflaeche'], ''),
      anwendung: pick(article, ['application', 'anwendung'], ''),
      farbton: pick(article, ['color_tone', 'farbton'], ''),
      farbcode: pick(article, ['color_code', 'farbcode'], ''),
      qualitaet: pick(article, ['quality', 'qualitaet'], ''),

      effekt: pick(article, ['effect', 'effekt'], []) as string[],
      sondereffekte: pick(article, ['special_effects', 'sondereffekte'], []) as string[],
      zertifizierungen: pick(article, ['certifications', 'zertifizierungen'], []) as string[],
      aufladung: pick(article, ['charge', 'aufladung'], []) as string[],
    };
  }, [article]);

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
