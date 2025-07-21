"use client";

import { useState, useEffect } from "react";
import styles from "./Vision.module.css";
import { motion } from 'framer-motion';

// TypingText-Komponente
const TypingText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);
  const speed = 45;

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  useEffect(() => {
    setDisplayedText("");
    let i = 0;
    if (isDesktop) {
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayedText((prev) => prev + text.charAt(i));
          i++;
        } else {
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    } else {
      setDisplayedText(text);
    }
  }, [text, isDesktop]);

  return (
    <motion.p 
      className={styles.typing} 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 1 }}
    >
      {displayedText}
    </motion.p>
  );
};

const Wissenswertes = () => {
  return (
    <>
      <div className={styles.container}>
        {/* 1. Container (Linker Container mit Text) */}
        <div className={styles["container-left"]}>
          <div className={styles["text-container"]}>
            <h2 className={styles["h2-vision"]}>Unsere Vision</h2>
            <TypingText text='"Wir sehen eine Welt, in der die Beschichtungstechnik einfacher, nachhaltiger und für alle zugänglich ist. Unser Ziel ist es, Innovation mit Verantwortung zu verbinden, um eine bessere Zukunft für alle Akteure in der Beschichtungstechnik zu schaffen. Mit Leidenschaft, Kreativität und Technologie wollen wir neue Maßstäbe setzen und die Art und Weise, wie die Prozesse in der Beschichtungstechnik funktionieren, revolutionieren.' />
          </div>
        </div>

        {/* 2. Container (Rechter Container mit Bild) */}
        <div className={styles["container-right"]}>
          <div className={styles["image-container"]}>
            <img src="/images/vision.webp" alt="Vision" className={styles["image"]} />
          </div>
        </div>

        {/* 3. Container (Linker Container mit Bild) */}
        <div className={styles["container-left"]}>
          <div className={styles["image-container"]}>
            <img src="/images/mission.webp" alt="Mission" className={styles["image"]} />
          </div>
        </div>

        {/* 4. Container (Rechter Container mit Text) */}
        <div className={styles["container-right"]}>
          <div className={styles["text-container"]}>
            <h2 className={styles["h2-mission"]}>Unsere Mission</h2>
            <TypingText text='„Wir sind überzeugt: Die Beschichtungstechnik braucht neue Denkweisen. Deshalb setzen wir auf nachhaltige, nutzerfreundliche und wirtschaftliche Lösungen – und hinterfragen den Status quo jeden Tag aufs Neue. Unsere Mission: Besonderes schaffen. Wir entwickeln Prozesse, die Umwelt und Ressourcen schonen, ohne Kompromisse bei Qualität oder Effizienz. Wir denken nicht nur an heute, sondern an morgen – für alle. Bist du dabei?“' />
          </div>
        </div>
      </div>
    </>
  );
};

export default Wissenswertes;
