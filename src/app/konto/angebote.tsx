// /src/app/konto/angebote.tsx
import { FC } from 'react';
import Pager from './navbar/pager'; // Wenn du eine Pager-Komponente hast
import styles from '../konto.module.css';

const Angebote: FC = () => {
  return (
    <>
      <Pager />
      <div className={styles.wrapper}>
        <h2>Eingeholte Angebote</h2>
        <div className={styles.kontoContainer}>
          <p>Hier findest du eine Liste der Angebote, die du eingeholt hast.</p>
          {/* Beispielhafte Daten für Angebote */}
          <ul>
            <li>Angebot 1: 100€</li>
            <li>Angebot 2: 150€</li>
            <li>Angebot 3: 200€</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Angebote;
