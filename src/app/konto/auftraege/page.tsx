// /src/app/konto/auftraege/page.tsx
import { FC } from 'react';
import Pager from './../navbar/pager';  // Relativer Import für Pager
import styles from './../konto.module.css';  // Relativer Import für styles

const Auftraege: FC = () => {
  return (
    <>
      <Pager />
      <div className={styles.wrapper}>
        <h2>Meine Aufträge</h2>
        <div className={styles.kontoContainer}>
          <p>Hier findest du eine Liste deiner Aufträge.</p>
          {/* Beispielhafte Daten für Aufträge */}
          <ul>
            <li>Auftrag 1: Fertiggestellt</li>
            <li>Auftrag 2: In Bearbeitung</li>
            <li>Auftrag 3: Warten auf Material</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Auftraege;
