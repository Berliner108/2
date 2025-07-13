// /src/app/konto/nachrichten/page.tsx
import { FC } from 'react';
import Pager from './../navbar/pager';  // Relativer Import für Pager
import styles from './../konto.module.css';  // Relativer Import für styles

const Nachrichten: FC = () => {
  return (
    <>
      <Pager />
      <div className={styles.wrapper}>
        <h2>Nachrichten</h2>
        <div className={styles.kontoContainer}>
          <p>Hier findest du deine Nachrichten.</p>
          {/* Beispielhafte Nachrichten */}
          <ul>
            <li>Nachricht 1: Anfrage zur Lieferung</li>
            <li>Nachricht 2: Rückmeldung zu deinem Angebot</li>
            <li>Nachricht 3: Zahlung eingegangen</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Nachrichten;
