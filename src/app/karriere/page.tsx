'use client';

import Link from 'next/link';
import styles from './karriere.module.css';

const KarrierePage = () => {
  const jobs = [
    { title: 'Frontend Entwickler (m/w/d) 100%', slug: 'frontend-entwickler' },
    { title: 'Backend Entwickler (m/w/d) 100%', slug: 'backend-entwickler' },
    { title: 'Kundenservice (m/w/d) 50-100%', slug: 'kundenservice' },
    { title: 'Projektmanager (m/w/d)', slug: 'projektmanager' },
  ];

  return (
    <main className={styles.container}>
      <section className={styles.intro}>
        <h1>Deine Ziele. Unsere Möglichkeiten.</h1>
        <p>
          Seit über 20 Jahren verwandeln wir vielversprechende Ideen in erfolgreiche Produkte. Der Schlüssel zu
          unserem Erfolg? <strong>Gemeinschaft und Teamgeist.</strong> Mit Standorten in der Schweiz, Rumänien und
          Thailand sind wir ein international agierendes Technologieunternehmen – und dennoch steht bei uns der Mensch
          im Mittelpunkt. Unser persönlicher und wertschätzender Umgang prägt sowohl unsere Unternehmenskultur als auch
          die Beziehungen zu unseren Kunden.
        </p>
        <p>
          Unsere vier Grundwerte – <strong>Begeisterung, Teamarbeit, Ehrlichkeit und Unternehmertum</strong> – sind die
          Basis für ein inspirierendes Arbeitsumfeld, in dem du dich entfalten kannst. Wir setzen auf deine individuellen
          Stärken und unterstützen deine persönliche Entwicklung aktiv. Neben einer fairen Vergütung erwarten dich
          attraktive Zusatzleistungen, echte Mitgestaltungsmöglichkeiten und vielfältige Karrierechancen.
        </p>
      </section>
      <div className={styles.highlight}>
  	Wir sind stets auf der Suche nach engagierten Talenten, die mit uns gemeinsam innovative Produkte entwickeln und die Zukunft aktiv gestalten.
      </div>
      <p className={styles.ceo}>Max Mustermann, CEO</p>


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
    </main>
  );
};

export default KarrierePage;
