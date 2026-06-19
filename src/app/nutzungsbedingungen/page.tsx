import React from "react";
import Link from "next/link";
import styles from "./nutzungsbedingungen.module.css";

export default function Nutzungsbedingungen() {
  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Nutzungsbedingungen</h1>

      <p
        className={styles.text}
        style={{ textAlign: "center", fontStyle: "italic" }}
      >
        Letzte Aktualisierung: 26. März 2026
      </p>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Geltungsbereich</h2>
        <p className={styles.text}>
          Diese Nutzungsbedingungen regeln die Nutzung der Plattform{" "}
          <strong>BeschichterScout</strong>, betrieben durch{" "}
          <strong>Martin Zajac, Einzelunternehmer</strong>, durch
          registrierte und nicht registrierte Nutzer. Mit der Nutzung der
          Plattform erkennen Sie diese Bedingungen als verbindlich an.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Registrierung und Konto</h2>
        <p className={styles.text}>
          Um bestimmte Funktionen der Plattform nutzen zu können, müssen Nutzer
          ein Konto erstellen. Nutzer sind verpflichtet, korrekte, vollständige
          und aktuelle Angaben zu machen und ihre Zugangsdaten vertraulich zu
          behandeln. Falsche, unvollständige oder irreführende Angaben können zum
          temporären oder dauerhaften Ausschluss von der Plattform führen.
          Betrügerische Handlungen, der Versuch solcher Handlungen oder ein
          begründeter Verdacht darauf können den zuständigen Behörden gemeldet
          werden.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Nutzung der Plattform</h2>
        <p className={styles.text}>
          Die Plattform darf ausschließlich für rechtmäßige Zwecke und im Rahmen
          der geltenden Gesetze genutzt werden. Es ist untersagt, Inhalte
          hochzuladen, einzustellen oder zu übermitteln, die gegen gesetzliche
          Vorschriften, Rechte Dritter oder die guten Sitten verstoßen. Der
          Plattformbetreiber behält sich das Recht vor, Inhalte zu entfernen und
          Nutzer bei Verstößen temporär oder dauerhaft von der Nutzung der
          Plattform auszuschließen.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Rolle des Plattformbetreibers</h2>
        <p className={styles.text}>
          BeschichterScout stellt eine digitale Plattform zur Verfügung, über die
          Nutzer Beschichtungsaufträge, Lackanfragen, Angebote und sonstige
          plattformbezogene Inhalte einstellen, suchen und abwickeln können. Der
          Plattformbetreiber wird grundsätzlich nicht selbst Vertragspartner der
          zwischen Nutzern geschlossenen Verträge, sofern nicht ausdrücklich etwas
          anderes vereinbart wird.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Inhalte der Nutzer</h2>
        <p className={styles.text}>
          Nutzer sind für die von ihnen eingestellten Inhalte, Angaben, Dateien,
          Bilder und Angebote selbst verantwortlich. Sie verpflichten sich, keine
          rechtswidrigen, irreführenden, beleidigenden, urheberrechtsverletzenden
          oder sonst unzulässigen Inhalte auf der Plattform zu veröffentlichen.
          Der Plattformbetreiber ist berechtigt, Inhalte zu prüfen, zu entfernen
          oder deren Veröffentlichung abzulehnen.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>6. Sperrung und Kündigung</h2>
        <p className={styles.text}>
          Der Plattformbetreiber behält sich vor, Nutzerkonten bei Verstößen
          gegen diese Nutzungsbedingungen, bei Falschangaben, missbräuchlicher
          Nutzung, betrügerischem Verhalten oder begründetem Verdacht darauf
          temporär oder dauerhaft zu sperren oder zu löschen. Gesetzliche Rechte
          und Ansprüche bleiben davon unberührt.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>7. Verfügbarkeit der Plattform</h2>
        <p className={styles.text}>
          Der Plattformbetreiber ist bemüht, die Plattform möglichst störungsfrei
          zur Verfügung zu stellen. Eine jederzeitige Verfügbarkeit wird jedoch
          nicht garantiert. Wartungsarbeiten, technische Störungen oder externe
          Einflüsse können die Nutzung zeitweise einschränken.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>8. Haftung</h2>
        <p className={styles.text}>
          Der Plattformbetreiber haftet nur für Schäden, die auf vorsätzlichem
          oder grob fahrlässigem Verhalten beruhen, soweit gesetzlich zulässig.
          Für Inhalte, Angaben, Angebote oder Handlungen von Nutzern übernimmt
          der Plattformbetreiber keine Verantwortung. Die Verantwortung für die
          ordnungsgemäße Durchführung von Verträgen zwischen Nutzern liegt bei
          den jeweiligen Vertragspartnern.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>9. Änderungen der Nutzungsbedingungen</h2>
        <p className={styles.text}>
          Der Plattformbetreiber behält sich vor, diese Nutzungsbedingungen zu
          ändern, soweit dies erforderlich erscheint und Nutzer dadurch nicht
          unangemessen benachteiligt werden. Über wesentliche Änderungen werden
          Nutzer in geeigneter Weise informiert. Die weitere Nutzung der
          Plattform nach Inkrafttreten der Änderungen gilt als Zustimmung zu den
          geänderten Nutzungsbedingungen.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>10. Anwendbares Recht</h2>
        <p className={styles.text}>
          Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts.
          Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz des
          Plattformbetreibers.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>11. Kontakt</h2>
        <p className={styles.text}>
          Beschichter Scout
          <br />
          Martin Zajac, Einzelunternehmer
          <br />
          Riedergasse 2
          <br />
          6900 Bregenz, Österreich
          <br />
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