"use client";

import React from "react";
import styles from "./wissenswertes.module.css";
import Image from "next/image";
import Link from "next/link"; // Für den Button zur Startseite

const Wissenswertes = () => {
  return (
    <div className={styles.container}>
      <h1>Über Uns</h1>
      
      <div className={styles.textContent}>
        
        <p>
          Wir sind die erste Plattform für reine Oberflächentechnik. Eine Plattform:</p>
          <p>Die es Kunden ermöglicht innerhalb kürzester Zeit ihren passenden Oberflächentechniker zu finden</p>
          <p>Die es Oberflächentechnikern ermöglicht ihren Absatz zu steigern</p>
          <p>Die es Kunden durch eigenständige Materialbeschaffung ermöglicht, bares Geld zu sparen</p>          
          <p>Die es Oberflächentechnikern ermöglicht den passendsten Lieferanten für ihre Verbrauchsartikel zu finden</p>
          <p>Die es Kunden durch eigenständige Materialbeschaffung ermöglicht, bares Geld zu sparen</p><br></br>
          <p>Alles, was wir machen, machen wir mit dem Glauben, den Status Quo in der Oberflächentechnik herauszufordern.
          Wir glauben daran, dass wir anders denken. Wir machen das, indem wir auf Nachhaltigkeit, Nutzerfreundlichkeit und Wirtschaftlichkeit setzen.
          Wir freuen uns, besondere Lösungen anzubieten. Wollen Sie auch Teil davon sein?
        </p>
      </div>
      <h1>So funktionierts</h1>

      <div className={styles.imageGallery}>
        
        
        <div className={styles.imageContainer}>
          <Image
            src="/images/sofunktionierts.jpg" // Ersetze mit deinem Bildpfad
            alt="Bild 3"
            width={400}
            height={300}
            className={styles.image}
          />
        </div>
      </div>
      <h1>Die Oberflächentechnik</h1>
      <div className={styles.textContent}>
        
        <p>
        Oberflächentechnik ist ein Bereich der Materialwissenschaften, der sich mit der Veränderung und Verbesserung der Eigenschaften von Oberflächen befasst.</p>
          <p>Ziel ist es, die Funktionalität, Haltbarkeit, Ästhetik und andere spezifische Eigenschaften von Werkstoffen oder Bauteilen zu optimieren.</p>
          <p>Die es Oberflächentechnikern ermöglicht ihren Absatz zu steigern</p>
          <p>Die es Kunden durch eigenständige Materialbeschaffung ermöglicht, bares Geld zu sparen</p>          
          <p>Die es Oberflächentechnikern ermöglicht den passendsten Lieferanten für ihre Verbrauchsartikel zu finden</p>
          <p>Die es Kunden durch eigenständige Materialbeschaffung ermöglicht, bares Geld zu sparen</p><br></br>
          <p>Die Anwendungen der Oberflächentechnik reichen von der Verhinderung von Korrosion und Verschleiß bis hin zur Verbesserung von chemischen, elektrischen und 
            mechanischen Eigenschaften sowie der optischen Gestaltung. In der Oberflächentechnik wird die Oberfläche eines Materials behandelt, 
            ohne das gesamte Material zu verändern. Dies ermöglicht eine gezielte Anpassung an die Bedürfnisse des jeweiligen Einsatzes. Diese Verfahren sind 
            in vielen Industrien von großer Bedeutung, z. B. in der Automobilindustrie, Luft- und Raumfahrt, Maschinenbau, Medizintechnik und Elektronik.
        </p>
      </div>

      <div className={styles.backButton}>
        <Link href="/">
          <button className={styles.button}>Zurück zur Startseite</button>
        </Link>
      </div>
    </div>
  );
};

export default Wissenswertes;
