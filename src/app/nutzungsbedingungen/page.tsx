import React from "react";
import Link from "next/link";
import styles from "./nutzungsbedingungen.module.css";

export default function Nutzungsbedingungen() {
  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Nutzungsbedingungen</h1>
      <p className={styles.text} style={{ textAlign: "center", fontStyle: "italic" }}>
        Letzte Aktualisierung: 06. August 2025
      </p>

     <div className={styles.section}>
  <h2 className={styles.sectionTitle}>1. Geltungsbereich</h2>
  <p className={styles.text}>
    Diese Nutzungsbedingungen regeln die Nutzung der Plattform{" "}
    <strong>BeschichterScout GmbH</strong> durch registrierte und nicht
    registrierte Nutzer. Mit der Nutzung der Plattform erkennen Sie diese
    Bedingungen als verbindlich an.
  </p>
</div>

<div className={styles.section}>
  <h2 className={styles.sectionTitle}>2. Registrierung und Konto</h2>
  <p className={styles.text}>
    Um bestimmte Funktionen nutzen zu können, müssen Sie ein Konto erstellen.
    Sie sind verpflichtet, korrekte und vollständige Angaben zu machen und
    Ihre Zugangsdaten vertraulich zu behandeln. Falsche, unvollständige oder
    irreführende Angaben können zum temporären oder dauerhaften Ausschluss von
    der Plattform führen. Betrügerische Handlungen, der Versuch solcher
    Handlungen oder bereits der begründete Verdacht darauf werden umgehend den
    zuständigen Strafverfolgungsbehörden gemeldet.
  </p>
</div>

<div className={styles.section}>
  <h2 className={styles.sectionTitle}>3. Nutzung der Plattform</h2>
  <p className={styles.text}>
    Die Plattform darf ausschließlich für rechtmäßige Zwecke und im Rahmen der
    geltenden Gesetze genutzt werden. Es ist untersagt, Inhalte hochzuladen,
    die gegen gesetzliche Vorschriften, Rechte Dritter oder die guten Sitten
    verstoßen. Der Plattformbetreiber behält sich das Recht vor, Nutzer
    temporär oder dauerhaft – auch ohne Angabe von Gründen – von der Teilnahme
    an der Plattform auszuschließen.
  </p>
</div>

<div className={styles.section}>
  <h2 className={styles.sectionTitle}>4. Sperrung und Kündigung</h2>
  <p className={styles.text}>
    Die Betreiber behalten sich vor, Nutzerkonten bei Verstößen gegen diese
    Nutzungsbedingungen zu sperren oder zu löschen. Eine Sperrung kann temporär
    oder dauerhaft erfolgen. Dies gilt insbesondere bei Falschangaben,
    betrügerischem Verhalten oder begründetem Verdacht darauf. In solchen
    Fällen kann der Plattformbetreiber zusätzlich rechtliche Schritte
    einleiten.
  </p>
</div>

<div className={styles.section}>
  <h2 className={styles.sectionTitle}>5. Änderungen der Nutzungsbedingungen</h2>
  <p className={styles.text}>
    Die Betreiber können diese Bedingungen jederzeit ändern. Nutzer werden
    hierüber in geeigneter Weise informiert. Die weitere Nutzung nach
    Inkrafttreten der Änderungen gilt als Zustimmung zu den geänderten
    Bedingungen.
  </p>
</div>

<div className={styles.section}>
  <h2 className={styles.sectionTitle}>6. Anwendbares Recht</h2>
  <p className={styles.text}>
    Es gilt ausschließlich österreichisches Recht unter Ausschluss des
    UN-Kaufrechts. Gerichtsstand ist Wien, soweit gesetzlich zulässig.
  </p>
</div>

<p className={styles.text}>
  Der Plattformbetreiber behält sich vor, diese Nutzungsbedingungen jederzeit zu
  ändern, soweit dies erforderlich erscheint und den Nutzer nicht unangemessen
  benachteiligt. Über wesentliche Änderungen wird der Nutzer in geeigneter Weise
  informiert. Die Änderungen gelten als angenommen, wenn der Nutzer die Plattform
  nach Inkrafttreten der geänderten Bedingungen weiter nutzt.
</p>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>7. Kontakt</h2>
        <p className={styles.text}>
          BeschichterScout GmbH<br />
          Musterstraße 1<br />
          1010 Wien, Österreich<br />
          E-Mail: kontakt@beschichterscout.com
        </p>
      </div>

      <div className={styles.buttonWrapper}>
        <Link href="/" className={styles.backButton}>
          Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}
