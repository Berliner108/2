"use client";

import { useParams } from "next/navigation";
import styles from "./jobDetail.module.css";

const jobDetails = {
  "senior-developer": {
    title: "Senior-Developer (m/w/d) – React & Next.js",
    location: "Remote / Bregenz (AT)",
    type: "100% – Festanstellung",
    description: `
Beschichter Scout ist eine digitale Plattform für Beschichtungstechnik. Wir bringen Beschichter, Auftraggeber, Lackhersteller, Lieferanten und verfügbare Restmengen an einen zentralen digitalen Ort.

Als Senior-Developer arbeitest du direkt an der Weiterentwicklung dieser Plattform. Du entwickelst Funktionen, verbesserst bestehende Abläufe und hilfst dabei, aus einer spezialisierten Branche ein modernes digitales Produkt zu machen.
    `,
    responsibilities: [
      "Entwicklung moderner Web-Oberflächen mit React, Next.js und TypeScript",
      "Aufbau und Pflege wiederverwendbarer Komponenten",
      "Weiterentwicklung von Marktplatz-, Anfrage-, Angebots- und Nutzerfunktionen",
      "Optimierung von Performance, SEO, Usability und Responsive Design",
      "Anbindung und Weiterentwicklung von APIs und Backend-Prozessen",
      "Zusammenarbeit mit Produkt, Kundenservice und Geschäftsführung",
      "Technische Entscheidungen mitgestalten und bestehende Strukturen verbessern",
      "Fehler analysieren, Lösungen finden und die Plattform stabil weiterentwickeln",
    ],
    requirements: [
      "Mehrjährige Erfahrung mit React, Next.js und TypeScript",
      "Gutes Verständnis für saubere Komponentenstruktur und moderne Frontend-Architektur",
      "Erfahrung mit CSS Modules, Responsive Design und nutzerfreundlichen Oberflächen",
      "Sicherer Umgang mit APIs, Authentifizierung und datengetriebenen Anwendungen",
      "Strukturierte Arbeitsweise und ein gutes Auge für Details",
      "Du denkst nicht nur in Tickets, sondern verstehst auch das Produkt dahinter",
      "Du kannst technische Probleme verständlich erklären und pragmatisch lösen",
      "Erfahrung mit Supabase, PostgreSQL, Stripe oder Marktplatz-Systemen ist ein Plus",
    ],
    benefits: [
      "Du arbeitest an einer Plattform mit echtem Branchenbezug",
      "Viel Gestaltungsspielraum statt starrer Konzernprozesse",
      "Kurze Entscheidungswege und direkter Einfluss auf das Produkt",
      "Remote-Arbeit oder hybrides Arbeiten in Bregenz möglich",
      "Flexible Arbeitszeiten nach Absprache",
      "Technische Herausforderungen rund um Marktplatz, Zahlungen, Nutzerrollen und Prozesse",
      "Kleines Team, offene Kommunikation und viel Eigenverantwortung",
    ],
    applyInfo:
      "Sende deinen Lebenslauf und gerne Links zu GitHub, Portfolio oder bisherigen Projekten an bewerbung@beschichterscout.com. Wir freuen uns auf deine Bewerbung.",
  },

  kundenservice: {
    title: "Kundenservice-Mitarbeiter:in (m/w/d)",
    location: "Remote / Bregenz (AT)",
    type: "Teilzeit / Vollzeit (50–100%)",
    description: `
Beschichter Scout ist eine digitale Plattform für Beschichtungstechnik. Als Kundenservice-Mitarbeiter:in bist du eine wichtige Verbindung zwischen unseren Nutzern und dem Produkt.

Du hilfst Beschichtern, Auftraggebern und Lieferanten bei Fragen zur Plattform, erklärst Abläufe verständlich und gibst wertvolles Feedback aus der Praxis an unser Team weiter.
    `,
    responsibilities: [
      "Beantwortung von Nutzeranfragen per E-Mail, Chat oder Telefon",
      "Unterstützung bei Registrierung, Profil, Anfragen, Angeboten und allgemeinen Plattformfragen",
      "Erklärung von Abläufen einfach und verständlich",
      "Dokumentation häufiger Fragen und wiederkehrender Probleme",
      "Weitergabe von Nutzerfeedback an Produkt und Entwicklung",
      "Mithilfe beim Aufbau von FAQ, Hilfetexten und internen Abläufen",
      "Freundliche, zuverlässige und lösungsorientierte Kommunikation mit unseren Nutzern",
    ],
    requirements: [
      "Sehr gute Deutschkenntnisse in Wort und Schrift",
      "Freundliches und professionelles Auftreten",
      "Gute IT-Grundkenntnisse und sicherer Umgang mit digitalen Tools",
      "Geduld, Genauigkeit und Freude daran, Menschen weiterzuhelfen",
      "Du kannst Probleme strukturiert aufnehmen und verständlich weitergeben",
      "Erfahrung im Kundenservice, Support oder Bürobereich ist von Vorteil",
      "Interesse an digitalen Plattformen und praktischen Lösungen",
    ],
    benefits: [
      "Remote-Arbeit oder hybrides Arbeiten in Bregenz möglich",
      "Teilzeit oder Vollzeit je nach Vereinbarung",
      "Strukturierte Einschulung in Plattform und Abläufe",
      "Kurze Wege und direkter Austausch mit dem Team",
      "Du hilfst aktiv mit, den Kundenservice von Anfang an sauber aufzubauen",
      "Abwechslungsreiche Aufgaben statt anonymer Callcenter-Arbeit",
      "Ein Produkt mit konkretem Nutzen für eine echte Branche",
    ],
    applyInfo:
      "Sende deinen Lebenslauf mit kurzem Anschreiben an bewerbung@beschichterscout.com. Auch Quereinsteiger:innen mit passender Erfahrung sind willkommen.",
  },
};

const JobDetailPage = () => {
  const { slug } = useParams();
  const job = jobDetails[slug as keyof typeof jobDetails];

  if (!job) return <p className={styles.error}>Stelle nicht gefunden.</p>;

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>{job.title}</h1>

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <strong>Ort:</strong> {job.location}
        </div>
        <div className={styles.metaItem}>
          <strong>Anstellungsart:</strong> {job.type}
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Über die Stelle</h2>
        <p>{job.description}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Deine Aufgaben</h2>
        <ul className={styles.list}>
          {job.responsibilities.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Anforderungen</h2>
        <ul className={styles.list}>
          {job.requirements.map((req, i) => (
            <li key={i}>{req}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Was wir bieten</h2>
        <ul className={styles.list}>
          {job.benefits.map((benefit, i) => (
            <li key={i}>{benefit}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>So bewirbst du dich</h2>
        <p>{job.applyInfo}</p>
      </section>

      <div className={styles.buttonContainer}>
        <a href="mailto:bewerbung@beschichterscout.com" className={styles.applyButton}>
          Jetzt bewerben
        </a>
      </div>
    </main>
  );
};

export default JobDetailPage;