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
      <section className={styles.intro}>
        <h1>Deine Ziele. Unsere Möglichkeiten.</h1>
        <p>
          Wir entwickeln innovative Ideen zu marktfähigen Produkten – <strong> mit Gemeinschaft und Teamgeist.</strong> Als international tätiges 
          Technologieunternehmen steht bei uns der Mensch an erster Stelle. Unser respektvoller und persönlicher Umgang miteinander prägt 
          nicht nur unsere Unternehmenskultur, sondern auch die Zusammenarbeit mit unseren Kunden.
        </p>
        <p>
          Unsere Werte – <strong>Leidenschaft, Kooperation, Integrität und unternehmerisches Denken </strong>– schaffen ein motivierendes Umfeld, in dem du deine Talente 
          entfalten kannst. Wir setzen auf individuelle Stärken und begleiten dich aktiv bei deiner Weiterentwicklung. Dich erwarten eine faire Bezahlung, 
          vielfältige Zusatzangebote, echte Gestaltungsspielräume und attraktive Karrierewege.
        </p>
      </section>
      <div className={styles.highlight}>
  	      Engagierte Menschen, die gemeinsam mit uns an zukunftsweisenden Lösungen arbeiten und Innovationen vorantreiben möchten, finden bei uns garantiert den passenden Platz.
      </div>
      <p className={styles.ceo}>Martin Zajac, CEO</p>


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
      <br></br>
      <br></br>
      <section className={styles.intro}>
        <h1>Keine passende Stelle gefunden? Kein Problem! </h1>
        <p>
          Wir sind immer auf der Suche nach engagierten Talenten. Senden Sie uns Ihre <strong>Initiativbewerbung</strong> an: bewerbung@beschichterscout.com – vielleicht passt Ihr Profil perfekt zu einer 
          zukünftigen Gelegenheit. Wir freuen uns auf Ihre Bewerbung!          
        </p>        
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
