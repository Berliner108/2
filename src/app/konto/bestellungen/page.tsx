'use client';

import { FC, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/navbar/Navbar';
import styles from './bestellungen.module.css';

type OrderStatus = 'In Bearbeitung' | 'Bezahlt' | 'Versendet' | 'Zugestellt' | 'Storniert';

type Bestellung = {
  id: number;
  orderNo: string;
  name: string;
  price: number;
  status: OrderStatus;
  date: string; // Anzeige-String
};

const Bestellungen: FC = () => {
  const [bestellungen] = useState<Bestellung[]>([
    { id: 1, orderNo: 'MP-58102', name: 'Artikel A', price: 120, status: 'In Bearbeitung', date: '24.12.2025' },
    { id: 2, orderNo: 'MP-57990', name: 'Artikel B', price: 180, status: 'Versendet', date: '22.12.2025' },
    { id: 3, orderNo: 'MP-57811', name: 'Artikel C', price: 90, status: 'Storniert', date: '20.12.2025' },
    { id: 4, orderNo: 'MP-57701', name: 'Artikel D', price: 200, status: 'Bezahlt', date: '18.12.2025' },
  ]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'Alle'>('Alle');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return bestellungen.filter((b) => {
      const matchSearch =
        !s ||
        b.name.toLowerCase().includes(s) ||
        b.orderNo.toLowerCase().includes(s);
      const matchStatus = statusFilter === 'Alle' || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bestellungen, search, statusFilter]);

  const stats = useMemo(() => {
    const total = bestellungen.length;
    const offen = bestellungen.filter((b) => b.status === 'In Bearbeitung' || b.status === 'Bezahlt').length;
    const geliefert = bestellungen.filter((b) => b.status === 'Zugestellt').length;
    const sum = bestellungen
      .filter((b) => b.status !== 'Storniert')
      .reduce((acc, b) => acc + b.price, 0);
    return { total, offen, geliefert, sum };
  }, [bestellungen]);

  return (
    <>
      <Navbar />

      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Bestellungen</h2>
            <p className={styles.subtitle}>Hier siehst du deine Käufe und den aktuellen Status.</p>
          </div>

          <Link className={styles.primaryAction} href="/konto">
            Zurück zum Konto
          </Link>
        </div>

        <div className={styles.kontoContainer}>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Bestellungen</p>
              <p className={styles.statValue}>{stats.total}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Offen</p>
              <p className={styles.statValue}>{stats.offen}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Zugestellt</p>
              <p className={styles.statValue}>{stats.geliefert}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Summe (Dummy)</p>
              <p className={styles.statValue}>{stats.sum} €</p>
            </div>
          </div>

          <div className={styles.toolbar}>
            <input
              className={styles.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen (Bestellnr. / Artikel)…"
            />

            <select
              className={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="Alle">Alle Status</option>
              <option value="In Bearbeitung">In Bearbeitung</option>
              <option value="Bezahlt">Bezahlt</option>
              <option value="Versendet">Versendet</option>
              <option value="Zugestellt">Zugestellt</option>
              <option value="Storniert">Storniert</option>
            </select>
          </div>

          {/* Desktop “Table”-Look */}
          <div className={styles.table}>
            <div className={styles.thead}>
              <span>Bestellung</span>
              <span>Datum</span>
              <span>Status</span>
              <span className={styles.right}>Betrag</span>
              <span className={styles.right}>Aktion</span>
            </div>

            <div className={styles.tbody}>
              {filtered.map((b) => (
                <div key={b.id} className={styles.row}>
                  <div className={styles.orderCell}>
                    <div className={styles.orderNo}>{b.orderNo}</div>
                    <div className={styles.orderName}>{b.name}</div>
                  </div>

                  <div className={styles.muted}>{b.date}</div>

                  <div>
                    <span className={`${styles.badge} ${styles[`badge_${b.status.replace(/\s/g, '')}`]}`}>
                      {b.status}
                    </span>
                  </div>

                  <div className={`${styles.right} ${styles.amount}`}>{b.price} €</div>

                  <div className={`${styles.right}`}>
                    <button className={styles.ghostButton} type="button">
                      Details
                    </button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className={styles.empty}>
                  Keine Bestellungen gefunden.
                </div>
              )}
            </div>
          </div>

          {/* Mobile Cards */}
          <div className={styles.mobileList}>
            {filtered.map((b) => (
              <div key={b.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <div className={styles.orderNo}>{b.orderNo}</div>
                    <div className={styles.orderName}>{b.name}</div>
                    <div className={styles.muted}>Datum: {b.date}</div>
                  </div>

                  <div className={styles.amount}>{b.price} €</div>
                </div>

                <div className={styles.cardBottom}>
                  <span className={`${styles.badge} ${styles[`badge_${b.status.replace(/\s/g, '')}`]}`}>
                    {b.status}
                  </span>

                  <button className={styles.ghostButton} type="button">
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Bestellungen;
