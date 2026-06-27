'use client';

import Link from 'next/link';
import styles from './karriere.module.css';

const KarrierePage = () => {
  const jobs = [
    { title: 'Senior Developer (m/w/d) 100%', slug: 'senior-developer' },
    { title: 'Kundenservice (m/w/d) 50-100%', slug: 'kundenservice' },
  ];

  return (
    <main className={styles.container}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Karriere bei Beschichter Scout</p>

        <h1>Baue mit uns die Plattform für Beschichtungstechnik.</h1>

        <p>
          Beschichter Scout ist eine digitale Plattform für die Beschichtungstechnik.
          Wir bringen Beschichter, Kunden, Aufträge und Restmengen an einen zentralen Ort —
          einfach, transparent und praxisnah.
        </p>

        <p>
          Wir stehen noch am Anfang und genau das macht es spannend: Du kannst mitgestalten,
          Verantwortung übernehmen und daran mitarbeiten, eine echte Branche digitaler zu machen.
        </p>
      </section>

      <section className={styles.infoGrid}>
        <article className={styles.infoCard}>
          <h2>Was wir bauen</h2>
          <p>
            Eine Plattform, die Prozesse rund um Beschichtung, Lackanfragen, Angebote und Restmengen
            einfacher macht. Weg von verstreuten E-Mails und Telefonaten — hin zu klaren digitalen Abläufen.
          </p>
        </article>

        <article className={styles.infoCard}>
          <h2>Wen wir suchen</h2>
          <p>
            Menschen, die mitdenken, anpacken und Verantwortung übernehmen. Besonders Entwickler,
            IT-Leute und Personen im Kundenservice, die Lust auf Aufbauarbeit haben.
          </p>
        </article>

        <article className={styles.infoCard}>
          <h2>Was dich erwartet</h2>
          <p>
            Ein kleines Team, kurze Wege, viel Eigenverantwortung und technische Herausforderungen.
            Du arbeitest nicht an irgendeinem Produkt, sondern an einer Plattform mit echtem Nutzen.
          </p>
        </article>
      </section>

      <div className={styles.highlight}>
        Engagierte Menschen, die mit uns Beschichter Scout weiterentwickeln und eine spezialisierte
        Branche digital voranbringen möchten, finden bei uns den passenden Platz.
      </div>

      <p className={styles.ceo}>Martin Zajac, Inhaber</p>

      <section className={styles.jobs}>
        <h2>Unsere offenen Stellen</h2>

        <ul>
          {jobs.map((job) => (
            <li key={job.slug}>
              <Link href={`/karriere/${job.slug}`} className={styles.jobLink}>
                {job.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.applicationBox}>
        <h2>Keine passende Stelle gefunden?</h2>

        <p>
          Kein Problem. Wenn du glaubst, dass du zu Beschichter Scout passt und uns beim Aufbau der
          Plattform unterstützen kannst, freuen wir uns über deine Initiativbewerbung.
        </p>

        <a href="mailto:bewerbung@beschichterscout.com" className={styles.mailLink}>
          bewerbung@beschichterscout.com
        </a>
      </section>

      <Link href="/" legacyBehavior>
        <div className={styles.buttonContainer}>
          <button className={styles.backButton}>
            <b>Zurück zur Startseite</b>
          </button>
        </div>
      </Link>
    </main>
  );
};

export default KarrierePage;