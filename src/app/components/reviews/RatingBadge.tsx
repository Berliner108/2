'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Stats = {
  userId: string;
  username: string | null;
  totalReviews: number;
  goodCount: number;
  neutralCount: number;
  goodRatio: number;   // 0..1
  avgStars: number | null; // 4.00..5.00 (null bei 0 Bewertungen)
  lastReviewAt: string | null;
};

type Props = {
  /** Mindestens eines von beidem angeben */
  userId?: string;
  username?: string;

  /** Wenn true, wird bei 0 Bewertungen "· neu" angezeigt (default: true) */
  showNewLabel?: boolean;

  /** Zusätzliche Klassen (z. B. für spacing) */
  className?: string;

  /** Wenn true: zeigt auch den Text "Bewertungen" als Tooltip-Title */
  titleHint?: boolean;
};

export default function RatingBadge({
  userId,
  username,
  showNewLabel = true,
  className = '',
  titleHint = true,
}: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (userId) p.set('userId', userId);
    else if (username) p.set('username', username);
    return p.toString();
  }, [userId, username]);

  useEffect(() => {
    if (!qs) return;
    const ctl = new AbortController();
    setLoading(true);
    setErr(null);

    fetch(`/api/reviews/stats?${qs}`, { signal: ctl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'fetch failed');
        setStats(j as Stats);
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setErr(e?.message || 'fetch failed');
      })
      .finally(() => setLoading(false));

    return () => ctl.abort();
  }, [qs]);

  if (!userId && !username) return null;

  // Loading-Skelett (sehr dezent)
  if (loading && !stats) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[12px] text-gray-500 ${className}`}
        aria-busy="true"
      >
        <span
          style={{
            display: 'inline-block',
            width: 36,
            height: 12,
            background: 'rgba(0,0,0,0.08)',
            borderRadius: 6,
          }}
        />
      </span>
    );
  }

  if (err) {
    // Leise degradieren (keine harte Fehlermeldung im UI)
    return null;
  }

  const total = stats?.totalReviews ?? 0;
  const avg = stats?.avgStars ?? null;

  // Nichts anzeigen, wenn keine Bewertungen und Label nicht gewünscht
  if (!total && !showNewLabel) return null;

  const title =
    titleHint
      ? total
        ? `Bewertungen: ${avg?.toFixed(2)} (${total})`
        : 'Noch keine Bewertungen'
      : undefined;

  return (
    <span
      className={`inline-flex items-center gap-1 align-middle text-[12px] text-gray-600 ${className}`}
      title={title}
      aria-label={
        total
          ? `Durchschnitt ${avg?.toFixed(2)} von 5 Sternen bei ${total} Bewertungen`
          : 'Noch keine Bewertungen'
      }
    >
      {total ? (
        <>
          <span aria-hidden>·</span>
          <span aria-hidden>★</span>
          <span>{avg?.toFixed(2)}</span>
          <span className="text-gray-400">({total})</span>
        </>
      ) : (
        <>
          <span aria-hidden>·</span>
          <span>neu</span>
        </>
      )}
    </span>
  );
}
