// /src/app/konto/verkaufte-artikel/page.tsx
'use client';  // Markiert diese Datei als Client Component

import { FC, useState } from 'react';
import Pager from './../navbar/pager';  // Relativer Import für Pager
import styles from './verkaufte-artikel.module.css';  // Relativer Import für styles

const VerkaufteArtikel: FC = () => {
  // Dummy-Daten für verkaufte Artikel
  const [verkaufteArtikel] = useState([
    { id: 1, name: 'Artikel 1', price: 100, status: 'Verkauft' },
    { id: 2, name: 'Artikel 2', price: 150, status: 'Versandbereit' },
    { id: 3, name: 'Artikel 3', price: 200, status: 'Verkauft' },
    { id: 4, name: 'Artikel 4', price: 50, status: 'Verkauft' },
  ]);

  return (
    <>
      <Pager />
      <div className={styles.wrapper}>
        <h2>Verkaufte Artikel</h2>
        <div className={styles.kontoContainer}>
          <p>Hier kannst du alle deine verkauften Artikel einsehen und den Status überwachen.</p>

          <div className={styles.articleList}>
            {verkaufteArtikel.map((item) => (
              <div key={item.id} className={styles.articleItem}>
                <h4>{item.name}</h4>
                <p>Preis: {item.price} €</p>
                <p>Status: {item.status}</p>
                <button className={styles.viewDetailsButton}>Details ansehen</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default VerkaufteArtikel;
