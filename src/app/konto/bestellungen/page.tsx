// /src/app/konto/bestellungen/page.tsx
'use client';  // Markiert diese Datei als Client Component

import { FC, useState } from 'react';
import Navbar from '../../components/navbar/Navbar';
import styles from './bestellungen.module.css';  // Relativer Import für styles

const Bestellungen: FC = () => {
  // Dummy-Daten für Bestellungen
  const [bestellungen] = useState([
    { id: 1, name: 'Artikel A', price: 120, status: 'In Bearbeitung' },
    { id: 2, name: 'Artikel B', price: 180, status: 'Versendet' },
    { id: 3, name: 'Artikel C', price: 90, status: 'Storniert' },
    { id: 4, name: 'Artikel D', price: 200, status: 'In Bearbeitung' },
  ]);

  return (
    <>
      <Navbar />
      <div className={styles.wrapper}>
        <h2>Bestellungen</h2>
        <div className={styles.kontoContainer}>
          <p>Hier kannst du alle deine Bestellungen einsehen und den Status überwachen.</p>

          <div className={styles.articleList}>
            {bestellungen.map((item) => (
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

export default Bestellungen;
