'use client';

import { motion } from 'framer-motion';
import styles from './uspHighlights.module.css';

const highlights = [
  {
    title: 'Angebote in Minuten',
    text: 'Sofort passende Beschichtungsangebote erhalten – ohne langes Warten.',
  },
  {
    title: 'Kosten senken',
    text: 'Mit eigener Lackbeschaffung bares Geld sparen und flexibel bleiben.',
  },
  {
    title: 'Sichere Abwicklung',
    text: 'Reklamationen? Wir lassen dich nicht im Regen stehen.',
  },
  {
    title: 'Alles aus einer Hand',
    text: 'Arbeitsmittel, Tools & Zubehör direkt über die Plattform beziehen.',
  },
  {
    title: 'Mehr Kunden gewinnen',
    text: 'Erhöhe deine Sichtbarkeit und steigere den Absatz – ganz ohne Kaltakquise.',
  },
];

export default function USPHighlights() {
  return (
    <div className={styles.container}>
      {highlights.map((item, i) => (
        <motion.div
  key={i}
  className={styles.card}
  initial={{ opacity: 0, y: 40, rotateY: -90 }}
  whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
  transition={{ duration: 0.6, delay: i * 0.15 }}
  viewport={{ once: true }}
        >
          <div className={styles.icon}>✔</div>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </motion.div>
      ))}
    </div>
  );
}
