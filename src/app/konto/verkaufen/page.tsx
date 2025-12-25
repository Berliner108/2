'use client';

import { FC, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/navbar/Navbar';
import styles from './verkaufte-artikel.module.css';

type ArtikelStatus = 'Aktiv' | 'Pausiert' | 'Entwurf' | 'Ausverkauft';
type VerkaufStatus = 'Bezahlt' | 'Versandbereit' | 'Versendet' | 'Storniert' | 'Erstattet';

type ShopArtikel = {
  id: number;
  title: string;
  price: number;
  status: ArtikelStatus;
  createdAt: string;
};

type Verkauf = {
  id: number;
  artikelId: number;
  artikelTitle: string;
  price: number;
  status: VerkaufStatus;
  soldAt: string;
  buyer: string;
  orderNo: string;
};

const VerkaufenPage: FC = () => {
  const [tab, setTab] = useState<'artikel' | 'verkaeufe'>('artikel');
  const [search, setSearch] = useState('');
  const [artikelFilter, setArtikelFilter] = useState<ArtikelStatus | 'Alle'>('Alle');
  const [verkaufFilter, setVerkaufFilter] = useState<VerkaufStatus | 'Alle'>('Alle');

  const [meineArtikel, setMeineArtikel] = useState<ShopArtikel[]>([
    { id: 101, title: 'Artikel A', price: 129, status: 'Aktiv', createdAt: '2025-12-10' },
    { id: 102, title: 'Artikel B', price: 59, status: 'Pausiert', createdAt: '2025-12-02' },
    { id: 103, title: 'Artikel C', price: 199, status: 'Entwurf', createdAt: '2025-11-28' },
    { id: 104, title: 'Artikel D', price: 39, status: 'Aktiv', createdAt: '2025-11-14' },
  ]);

  const [verkaeufe] = useState<Verkauf[]>([
    { id: 1, artikelId: 101, artikelTitle: 'Artikel A', price: 129, status: 'Versandbereit', soldAt: '2025-12-24', buyer: 'Max M.', orderNo: 'MP-54821' },
    { id: 2, artikelId: 104, artikelTitle: 'Artikel D', price: 39, status: 'Versendet', soldAt: '2025-12-21', buyer: 'Sarah K.', orderNo: 'MP-54310' },
    { id: 3, artikelId: 102, artikelTitle: 'Artikel B', price: 59, status: 'Bezahlt', soldAt: '2025-12-19', buyer: 'Lukas R.', orderNo: 'MP-54007' },
    { id: 4, artikelId: 101, artikelTitle: 'Artikel A', price: 129, status: 'Storniert', soldAt: '2025-12-12', buyer: 'Nina S.', orderNo: 'MP-53111' },
  ]);

  const stats = useMemo(() => {
    const aktiv = meineArtikel.filter((a) => a.status === 'Aktiv').length;
    const pausi = meineArtikel.filter((a) => a.status === 'Pausiert').length;
    const ent = meineArtikel.filter((a) => a.status === 'Entwurf').length;

    const umsatz = verkaeufe
      .filter((v) => v.status !== 'Storniert' && v.status !== 'Erstattet')
      .reduce((sum, v) => sum + v.price, 0);

    const offen = verkaeufe.filter((v) => v.status === 'Versandbereit' || v.status === 'Bezahlt').length;

    return { aktiv, pausi, ent, umsatz, offen };
  }, [meineArtikel, verkaeufe]);

  const gefilterteArtikel = useMemo(() => {
    const s = search.trim().toLowerCase();
    return meineArtikel.filter((a) => {
      const passtSuche = !s || a.title.toLowerCase().includes(s);
      const passtStatus = artikelFilter === 'Alle' || a.status === artikelFilter;
      return passtSuche && passtStatus;
    });
  }, [meineArtikel, search, artikelFilter]);

  const gefilterteVerkaeufe = useMemo(() => {
    const s = search.trim().toLowerCase();
    return verkaeufe.filter((v) => {
      const passtSuche =
        !s ||
        v.artikelTitle.toLowerCase().includes(s) ||
        v.buyer.toLowerCase().includes(s) ||
        v.orderNo.toLowerCase().includes(s);
      const passtStatus = verkaufFilter === 'Alle' || v.status === verkaufFilter;
      return passtSuche && passtStatus;
    });
  }, [verkaeufe, search, verkaufFilter]);

  const toggleArtikelStatus = (id: number) => {
    setMeineArtikel((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (a.status === 'Aktiv') return { ...a, status: 'Pausiert' };
        if (a.status === 'Pausiert') return { ...a, status: 'Aktiv' };
        return a;
      })
    );
  };

  return (
    <>
      <Navbar />

      <div className={styles.wrapper}>
        <div className={styles.headerRow}>
          <div className={styles.titleWrap}>
            <h2>Mein Shop</h2>
            <p className={styles.subtitle}>Artikel verwalten und Verkäufe verfolgen.</p>
          </div>

          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tabButton} ${tab === 'artikel' ? styles.activeTab : ''}`}
              onClick={() => setTab('artikel')}
            >
              Meine Artikel
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${tab === 'verkaeufe' ? styles.activeTab : ''}`}
              onClick={() => setTab('verkaeufe')}
            >
              Verkäufe
            </button>
          </div>
        </div>

        <div className={styles.kontoContainer}>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Aktiv</p>
              <p className={styles.statValue}>{stats.aktiv}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Pausiert</p>
              <p className={styles.statValue}>{stats.pausi}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Entwürfe</p>
              <p className={styles.statValue}>{stats.ent}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Umsatz (Dummy)</p>
              <p className={styles.statValue}>{stats.umsatz} €</p>
            </div>
          </div>

          <div className={styles.toolbar}>
            <input
              className={styles.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'artikel' ? 'Artikel suchen…' : 'Verkäufe suchen (Name, Bestellnr., Artikel)…'}
            />

            {tab === 'artikel' ? (
              <select className={styles.select} value={artikelFilter} onChange={(e) => setArtikelFilter(e.target.value as any)}>
                <option value="Alle">Alle Status</option>
                <option value="Aktiv">Aktiv</option>
                <option value="Pausiert">Pausiert</option>
                <option value="Entwurf">Entwurf</option>
                <option value="Ausverkauft">Ausverkauft</option>
              </select>
            ) : (
              <select className={styles.select} value={verkaufFilter} onChange={(e) => setVerkaufFilter(e.target.value as any)}>
                <option value="Alle">Alle Status</option>
                <option value="Bezahlt">Bezahlt</option>
                <option value="Versandbereit">Versandbereit</option>
                <option value="Versendet">Versendet</option>
                <option value="Storniert">Storniert</option>
                <option value="Erstattet">Erstattet</option>
              </select>
            )}

            <Link className={styles.primaryLink} href="/konto/artikel/neu">
              + Artikel einstellen
            </Link>
          </div>

          {tab === 'artikel' ? (
            <div className={styles.articleList}>
              {gefilterteArtikel.map((a) => (
                <div key={a.id} className={styles.articleItem}>
                  <h4>{a.title}</h4>
                  <p>Preis: {a.price} €</p>
                  <p>Erstellt: {a.createdAt}</p>

                  <span className={`${styles.badge} ${styles[`badge_${a.status}` as keyof typeof styles] ?? ''}`}>
                    {a.status}
                  </span>

                  <div className={styles.actionsRow}>
                    <Link className={styles.viewDetailsButton} href={`/konto/artikel/${a.id}/bearbeiten`}>
                      Bearbeiten
                    </Link>

                    <button
                      type="button"
                      className={`${styles.viewDetailsButton} ${styles.secondaryButton}`}
                      onClick={() => toggleArtikelStatus(a.id)}
                      disabled={a.status !== 'Aktiv' && a.status !== 'Pausiert'}
                    >
                      {a.status === 'Aktiv' ? 'Pausieren' : a.status === 'Pausiert' ? 'Aktivieren' : 'Status'}
                    </button>

                    <Link className={`${styles.viewDetailsButton} ${styles.ghostLink}`} href={`/artikel/${a.id}`}>
                      Ansehen
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.list}>
              {gefilterteVerkaeufe.map((v) => (
                <div key={v.id} className={styles.saleRow}>
                  <div className={styles.saleLeft}>
                    <h4>{v.artikelTitle}</h4>
                    <p className={styles.saleMeta}>
                      Bestellnr.: <strong>{v.orderNo}</strong> • Käufer: <strong>{v.buyer}</strong> • Datum: {v.soldAt}
                    </p>

                    <span className={`${styles.badge} ${styles[`badge_${v.status}` as keyof typeof styles] ?? ''}`}>
                      {v.status}
                    </span>
                  </div>

                  <div className={styles.saleRight}>
                    <div className={styles.salePrice}>{v.price} €</div>
                    <Link className={styles.viewDetailsButton} href={`/konto/verkaeufe/${v.id}`}>
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default VerkaufenPage;
