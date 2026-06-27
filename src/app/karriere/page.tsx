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

        <h1>Gestalte mit uns die digitale Plattform für Beschichtungstechnik.</h1>

        <p>
          Beschichter Scout bringt Beschichter, Auftraggeber, Lackhersteller,
          Lieferanten und verfügbare Restmengen an einen zentralen digitalen Ort.
          Unser Ziel: Abläufe in der Beschichtungstechnik einfacher, schneller und
          transparenter machen.
        </p>

        <p>
          Wir bauen keine Plattform für irgendeinen Markt, sondern für eine spezialisierte
          Branche mit echten Anforderungen. Genau deshalb suchen wir Menschen, die mitdenken,
          Verantwortung übernehmen und etwas mit aufbauen wollen.
        </p>
      </section>

      <section className={styles.infoGrid}>
        <article className={styles.infoCard}>
          <h2>Was wir bauen</h2>
          <p>
            Eine Plattform für Lackanfragen, Beschichtungsaufträge, Angebote und Restmengen.
            Statt verstreuter E-Mails, Telefonate und manueller Abstimmung entstehen klare
            digitale Prozesse für die tägliche Praxis.
          </p>
        </article>

        
        <article className={styles.infoCard}>
  <h2>Wen wir suchen</h2>
  <p>
    Wir suchen Leute, die anpacken, mitdenken und Dinge besser machen wollen.
    Ob in der Entwicklung, in der IT oder im Kundenservice: Wichtig ist, dass du
    zuverlässig arbeitest, Verantwortung übernimmst und Lust hast, etwas Neues
    mit aufzubauen.
  </p>
</article>

        <article className={styles.infoCard}>
          <h2>Was dich erwartet</h2>
          <p>
            Ein kleines Team, kurze Wege und viel Gestaltungsspielraum. Du arbeitest nah am
            Produkt, nah an echten Nutzern und an technischen Herausforderungen, die direkt
            aus der Praxis kommen.
          </p>
        </article>
      </section>

      <div className={styles.highlight}>
        Wir suchen keine Mitläufer. Wir suchen Menschen, die Beschichter Scout mit uns
        weiterentwickeln und eine traditionelle Branche digital voranbringen möchten.
      </div>

      <p className={styles.ceo}>Martin Zajac, Inhaber</p>

      <section className={styles.jobs}>
        <h2>Offene Stellen</h2>

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
        <h2>Keine passende Stelle dabei?</h2>

        <p>
          Dann bewirb dich trotzdem. Wenn du glaubst, dass du zu Beschichter Scout passt
          und uns beim Aufbau der Plattform weiterbringen kannst, freuen wir uns über
          deine Initiativbewerbung.
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