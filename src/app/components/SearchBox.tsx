'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from '../../styles/Home.module.css';

export default function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [suchbegriff, setSuchbegriff] = useState(
    () => searchParams.get('search') ?? ''
  );

  useEffect(() => {
    setSuchbegriff(searchParams.get('search') ?? '');
  }, [searchParams]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = suchbegriff.trim();
        if (q) router.push(`/kaufen?search=${encodeURIComponent(q)}`);
      }}
      className={styles.shopSearchForm}
    >
      <input
        type="search"
        placeholder="Shop durchsuchen…"
        value={suchbegriff}
        onChange={(e) => setSuchbegriff(e.target.value)}
        className={styles.shopSearchInput}
      />
      <button type="submit" className={styles.shopSearchButton}>
        Finden
      </button>
    </form>
  );
}
