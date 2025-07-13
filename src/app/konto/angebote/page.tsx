import { FC } from 'react';
import Pager from './../navbar/pager';
import styles from './angebote.module.css';

const Angebote: FC = () => {
  return (
    <>
      <Pager />
      <div className={styles.wrapper}>
        <h2 className={styles.heading}>Erhaltene Angebote</h2>
        <div className={styles.kontoContainer}>
          <p>Hier findest du eine Liste der Angebote, die du eingeholt hast. Hier nur die aktiven ausgeschriebenen aufträge</p>
          <ul>
            <li>Angebot 1: 100€</li>
            <li>Angebot 2: 150€</li>
            <li>Angebot 3: 200€</li>
          </ul>
        </div>

        <hr className={styles.divider} />

        <h2 className={styles.heading}>Abgegebene Angebote</h2>
        <div className={styles.kontoContainer}>
          <p>Hier findest du eine Liste der Angebote, die du anderen Nutzern gemacht hast.Hier nur die aktiven ausgeschriebenen aufträge wenn ein auftrag keinen beschichter findet wird er gelöscht</p>
          <ul>
            <li>Angebot A: 120€</li>
            <li>Angebot B: 180€</li>
            <li>Angebot C: 210€</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Angebote;
