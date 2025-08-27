'use client';

import React, { useEffect, useMemo, useState } from 'react';

type ReviewRow = {
  id: string;
  rating: 'good' | 'neutral';
  comment: string;
  createdAt: string; // ISO
  rater: { id: string; username: string | null };
};
type ApiResp = {
  ratee: { userId: string; username: string | null };
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  reviews: ReviewRow[];
};

type Props = {
  /** Mindestens eines angeben */
  userId?: string;
  username?: string;

  /** PageSize (1..50), default 10 */
  pageSize?: number;

  /** optionale Wrapper-Klasse */
  className?: string;
};

export default function UserReviewsList({ userId, username, pageSize = 10, className = '' }: Props) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (userId) p.set('userId', userId);
    else if (username) p.set('username', username!);
    p.set('page', String(page));
    p.set('pageSize', String(Math.min(50, Math.max(1, pageSize))));
    return p.toString();
  }, [userId, username, page, pageSize]);

  useEffect(() => {
    if (!qs) return;
    const ctl = new AbortController();
    setLoading(true);
    setErr(null);
    fetch(`/api/reviews/list?${qs}`, { signal: ctl.signal })
      .then(async (r) => {
        const j = (await r.json()) as ApiResp | { error?: string };
        if (!r.ok) throw new Error((j as any)?.error || 'fetch failed');
        setData(j as ApiResp);
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setErr(e?.message || 'fetch failed');
      })
      .finally(() => setLoading(false));
    return () => ctl.abort();
  }, [qs]);

  // bei Wechsel von userId/username auf Seite 1 springen
  useEffect(() => { setPage(1); }, [userId, username, pageSize]);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    []
  );

  if (!userId && !username) return null;

  return (
    <div className={`w-full max-w-2xl ${className}`}>
      <div className="mb-3 flex items-end justify-between">
        <h3 className="text-lg font-semibold">Bewertungen</h3>
        {data && (
          <div className="text-sm text-gray-500">
            {data.total} Eintrag{data.total === 1 ? '' : 'e'}
          </div>
        )}
      </div>

      {/* Ladezustand */}
      {loading && !data && (
        <div className="rounded-xl border p-4 text-sm text-gray-500">Lade Bewertungen…</div>
      )}

      {/* Fehler */}
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Liste */}
      {data && data.reviews.length === 0 && (
        <div className="rounded-xl border p-4 text-sm text-gray-600">Noch keine Bewertungen.</div>
      )}

      {data && data.reviews.length > 0 && (
        <ul className="space-y-3">
          {data.reviews.map((r) => (
            <li key={r.id} className="rounded-xl border p-4">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                    r.rating === 'good'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                  title={r.rating === 'good' ? 'gut' : 'neutral'}
                >
                  {r.rating === 'good' ? '★ gut' : '≈ neutral'}
                </span>
                <span className="text-xs text-gray-500">
                  {dateFmt.format(new Date(r.createdAt))}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-900">{r.comment}</p>
              <div className="mt-2 text-xs text-gray-500">
                von <span className="font-medium">{r.rater.username ?? 'Unbekannt'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            ‹ Zurück
          </button>
          <div className="text-sm text-gray-600">
            Seite {data.page} / {data.pages}
          </div>
          <button
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages || loading}
          >
            Weiter ›
          </button>
        </div>
      )}
    </div>
  );
}
