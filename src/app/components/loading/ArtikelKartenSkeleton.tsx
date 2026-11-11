import cardStyles from '../ArtikelKarteShop.module.css';
import styles from './ArtikelKartenSkeleton.module.css';

type ArtikelKartenSkeletonProps = {
  anzahl?: number;
};

/** Nur Kartenplatzhalter: keine Navbar, Sidebar oder Seitenstruktur. */
export default function ArtikelKartenSkeleton({ anzahl = 6 }: ArtikelKartenSkeletonProps) {
  const count = Math.max(1, Math.min(Math.trunc(anzahl) || 6, 12));

  return (
    <div className={styles.liste} role="status" aria-label="Shopartikel werden geladen" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div className={cardStyles.card} key={i} aria-hidden="true">
          <div className={cardStyles.cardBildContainer}>
            <div className={cardStyles.cardBildWrapper}>
              <div className={`${styles.puls} ${styles.bild}`} />
            </div>
          </div>
          <div className={cardStyles.cardTextBlock}>
            <div className={`${styles.puls} ${styles.titel}`} />
            <div className={`${styles.puls} ${styles.zeile} ${styles.lang}`} />
            <div className={`${styles.puls} ${styles.zeile} ${styles.mittel}`} />
            <div className={`${styles.puls} ${styles.zeile} ${styles.kurz}`} />
            <div className={`${styles.puls} ${styles.zeile} ${styles.lang}`} />
            <div className={`${styles.puls} ${styles.zeile} ${styles.mittel}`} />
            <div className={`${styles.puls} ${styles.zeile} ${styles.kurz}`} />
          </div>
        </div>
      ))}
      <span className={styles.nurScreenreader}>Shopartikel werden geladen.</span>
    </div>
  );
}
