"use client";

import { useParams } from "next/navigation";
import styles from "./jobDetail.module.css";

const jobDetails = {
  "frontend-entwickler": {
    title: "Frontend Entwickler (m/w/d) 80-100%",
    location: "Remote / Berlin",
    type: "Vollzeit und Teilzeit möglich",
    description: "Entwickle moderne Webanwendungen mit React und Next.js.",
    requirements: [
      "Erfahrung mit React, Next.js und TypeScript",
      "Kenntnisse in CSS (Tailwind, Styled Components)",
      "Verständnis für UX/UI Design",
    ],
  },
  "backend-entwickler": {
    title: "Backend Entwickler (m/w/d)",
    location: "Remote / München",
    type: "Teilzeit",
    description: "Arbeite mit Node.js und MongoDB für skalierbare APIs.",
    requirements: [
      "Erfahrung mit Node.js, Express und MongoDB",
      "Kenntnisse in REST- und GraphQL-APIs",
      "Verständnis für Microservices",
    ],
  },
  "kundenservice": {
    title: "Kundenservice (m/w/d)",
    location: "Remote / Wien / Bregenz",
    type: "Teilzeit",
    description: "Kümmere dich mit Begeisterung um die Anliegen unserer Kunden.",
    requirements: [
      "Erfahrung im Kundenservice nötig",
      "Abgeschlossene Lehre erforderlich",
      "Erfahrung im Umgang mit Microsoft Office",
    ],
  },
  "projektmanager": {
    title: "Projektmanager (m/w/d)",
    location: "Wien",
    type: "Vollzeit",
    description: "Koordiniere IT-Projekte und agile Teams.",
    requirements: [
      "Erfahrung mit SCRUM und agilen Methoden",
      "Kommunikationsstärke und Führungsqualitäten",
      "Verständnis für Softwareentwicklung",
    ],
  },
};

const JobDetailPage = () => {
  const { slug } = useParams();
  const job = jobDetails[slug as keyof typeof jobDetails];

  if (!job) {
    return <p>Stelle nicht gefunden</p>;
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>{job.title}</h1>
      <p><strong>Ort:</strong> {job.location}</p>
      <p><strong>Typ:</strong> {job.type}</p>
      <p>{job.description}</p>
      
      <h2 className={styles.subtitle}>Anforderungen:</h2>
      <ul className={styles.list}>
        {job.requirements.map((req, index) => (
          <li key={index}>{req}</li>
        ))}
      </ul>

      <button className={styles.applyButton}>Jetzt bewerben</button>
    </main>
  );
};

export default JobDetailPage;
