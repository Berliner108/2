"use client";

import { useParams } from "next/navigation";
import styles from "./jobDetail.module.css";

const jobDetails = {
  "senior-developer": {
    title: "Senior-Developer (m/w/d) – React & Next.js",
    location: "Remote / Bregenz (AT)",
    type: "100% – Festanstellung",
    description: `
Wir sind ein wachsendes Digitalunternehmen mit Fokus auf smarte B2B-Plattformen und intuitive Benutzeroberflächen. Unser Frontend-Team entwickelt moderne Webanwendungen mit Next.js, React und TypeScript.

Du arbeitest in einem agilen, produktnahen Team mit flachen Hierarchien und hohem Gestaltungsspielraum. Unsere Projekte basieren auf hoher Codequalität, Clean Architecture und enger Zusammenarbeit mit UX-Design und Backend.
    `,
    responsibilities: [
      "Entwicklung von Web-Oberflächen mit React, Next.js und TypeScript",
      "Erstellung und Pflege wiederverwendbarer Komponenten",
      "Optimierung von Performance, SEO und Accessibility",
      "Enge Zusammenarbeit mit Design, Backend und PM",
      "Teilnahme an Sprint-Planung, Reviews und QA-Prozessen",
      "Planung und Entwicklung von REST- und GraphQL-APIs",
    "Pflege und Erweiterung unserer Node.js-Backendservices",
    "Implementierung sicherer Authentifizierungs- und Autorisierungsprozesse",
    "Optimierung von Datenbanken (MongoDB) und Backend-Performance",
    "Zusammenarbeit mit Frontend, QA und DevOps",
    ],
    requirements: [
      "Mehrjährige Erfahrung mit React, Next.js und TypeScript",
      "Sicherer Umgang mit modernen CSS-Technologien (Tailwind CSS, Styled Components, CSS Modules)",
      "Gespür für UX, Accessibility und Responsive Design",
      "Kenntnisse in Testing (Jest, Testing Library) und Performance-Optimierung",
      "Eigenverantwortliches, strukturiertes Arbeiten in agilen Umgebungen",
      "Sehr gute Kenntnisse in Node.js und Express.js",
    "Erfahrung mit MongoDB oder vergleichbaren NoSQL-Datenbanken",
    "Verständnis für API-Design, Microservices und Clean Architecture",
    "Grundkenntnisse in Docker, CI/CD und Testautomatisierung",
    "Analytisches Denken und strukturierte Arbeitsweise",
    ],
    benefits: [
      "100% Remote oder hybrides Arbeiten in Bregenz",
      "Flexible Arbeitszeiten, Gleitzeitmodell & 30 Tage Urlaub",
      "30 Tage Urlaub + 2 zusätzliche freie Tage",
      "Homeoffice-Ausstattung und Weiterbildung",
      "Offene Feedbackkultur und moderne Unternehmenskultur",
           
      "Weiterbildung, Tech-Konferenzen und Pair Programming",
      "MacBook + Dev-Setup nach Wahl",
      "Flache Hierarchien, offene Kommunikation, agiles Team",
    ],
    applyInfo:
      "Bitte sende deinen Lebenslauf mit Link zu GitHub/Portfolio an bewerbung@beschichterscout.com. Wir freuen uns auf dich!",
  },
  
"kundenservice": {
  title: "Kundenservice-Mitarbeiter:in (m/w/d)",
  location: "Remote / Bregenz",
  type: "Teilzeit / Vollzeit (50–100%)",
  description: `
Als erste Anlaufstelle für unsere Kund:innen gestaltest du aktiv das Nutzererlebnis mit. Du beantwortest Anfragen per E-Mail, Chat oder Telefon und arbeitest eng mit Produkt- und Entwicklungsteams zusammen.

Unser Fokus liegt auf wertschätzender, effizienter Kommunikation und echter Problemlösung. Du erhältst eine intensive Einarbeitung und arbeitest nach flexiblen Arbeitszeiten – auch remote.
  `,
  responsibilities: [
    "Beantwortung von Kundenanfragen über Chat, Mail & Telefon",
    "Dokumentation und Nachverfolgung von Supportfällen",
    "Feedbackweitergabe an Produktentwicklung und QA",
    "Pflege von FAQ, Helpdesk-Artikeln und Wissensdatenbank",
    "Teilnahme an internen Service-Meetings und Schulungen",
  ],
  requirements: [
    "Abgeschlossene Lehre oder vergleichbare Ausbildung",
    "Mind. 1 Jahr Erfahrung im Kundenservice (auch remote)",
    "Sehr gute Deutschkenntnisse in Wort und Schrift",
    "Freundliches, lösungsorientiertes Auftreten",
    "Gute IT-Kenntnisse, idealerweise Microsoft 365 / Google Workspace",
  ],
  benefits: [
    "Remote-Arbeit mit flexibler Zeiteinteilung",
    "Kollegiales Team mit offener Feedbackkultur",
    "Fixer Stundenlohn + Leistungsbonus",
    "Digitale Tools & strukturierte Einschulung",
    "Teilnahme an internen Weiterbildungen",
  ],
  applyInfo: `
Sende uns deinen Lebenslauf mit kurzem Anschreiben an bewerbung@beschichterscout.com. Auch Quereinsteiger:innen mit Erfahrung sind willkommen!
  `,
},




};

const JobDetailPage = () => {
  const { slug } = useParams();
  const job = jobDetails[slug as keyof typeof jobDetails];

  if (!job) return <p className={styles.error}>Stelle nicht gefunden.</p>;

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>{job.title}</h1>
      <p><strong>Ort:</strong> {job.location}</p>
      <p><strong>Anstellungsart:</strong> {job.type}</p>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Über die Stelle</h2>
        <p>{job.description}</p>
      </section>

      {job.responsibilities && (
        <section className={styles.section}>
          <h2 className={styles.subtitle}>Deine Aufgaben</h2>
          <ul className={styles.list}>
            {job.responsibilities.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Anforderungen</h2>
        <ul className={styles.list}>
          {job.requirements.map((req, i) => (
            <li key={i}>{req}</li>
          ))}
        </ul>
      </section>

      {job.benefits && (
        <section className={styles.section}>
          <h2 className={styles.subtitle}>Was wir bieten</h2>
          <ul className={styles.list}>
            {job.benefits.map((benefit, i) => (
              <li key={i}>{benefit}</li>
            ))}
          </ul>
        </section>
      )}

      {job.applyInfo && (
        <section className={styles.section}>
          <h2 className={styles.subtitle}>So bewirbst du dich</h2>
          <p>{job.applyInfo}</p>
        </section>
      )}

      <div className={styles.buttonContainer}>
  <a href="mailto:bewerbung@beschichterscout.com" className={styles.applyButton}>
    Jetzt bewerben
  </a>
</div>


    </main>
  );
};

export default JobDetailPage;
