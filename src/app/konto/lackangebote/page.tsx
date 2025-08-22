// /src/app/konto/lackanfragen/page.tsx
import { FC } from 'react';
import Pager from './../navbar/pager';  // Relativer Import für Pager
import styles from './../konto.module.css';  // Relativer Import für styles

const Lackanfragen: FC = () => {
  return (
    <>
      <Pager />
      <div className={styles.wrapper}>
        <h2>Offene Lackanfragen</h2>
        <div className={styles.kontoContainer}>
          <p>Hier findest du eine Liste deiner offenen Lackanfragen.</p>
          {/* Beispielhafte Daten für Lackanfragen */}
          <ul>
            <li>Lackanfrage 1: Warten auf Rückmeldung</li>
            <li>Lackanfrage 2: In Bearbeitung</li>
            <li>Lackanfrage 3: Abgeschlossen</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Lackanfragen;
