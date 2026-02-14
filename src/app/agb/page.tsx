'use client';

import Link from 'next/link';
import styles from './agb.module.css';

const AgbPage = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Allgemeine Geschäftsbedingungen (AGB)</h1>

      <h2 className={styles.subheading}>1. Geltungsbereich</h2>
      <section className={styles.section}>
        <p>
          Diese AGB gelten für die Nutzung der Plattform Beschichter Scout (nachfolgend „Plattform“) durch registrierte und
          nicht registrierte Nutzer:innen. Über die Plattform können Anbieter:innen Leistungen und/oder Waren anbieten und
          Nutzer:innen (Käufer:innen) diese beauftragen bzw. kaufen.
        </p>
      </section>

      <h2 className={styles.subheading}>2. Rolle der Plattform</h2>
      <section className={styles.section}>
        <p>
          Die Plattform stellt ausschließlich die technische Infrastruktur für Anzeige, Kommunikation und Zahlungsabwicklung bereit.
          Kauf- bzw. Dienstleistungsverträge kommen ausschließlich zwischen Käufer:in und Anbieter:in zustande. Die Plattform ist nicht
          Vertragspartei und übernimmt keine Verantwortung für Inhalt, Umfang oder Durchführung der vereinbarten Leistung.
        </p>
        <p>
          Die Plattform kann auf Wunsch zwischen den Vertragspartner:innen vermittelnd bzw. streitschlichtend unterstützen, trifft jedoch
          keine bindende Entscheidung über die materielle Rechtslage.
        </p>
      </section>

      <h2 className={styles.subheading}>3. Mindestalter</h2>
      <section className={styles.section}>
        <p>
          Die Nutzung der Plattform ist ausschließlich Personen gestattet, die mindestens <strong>18 Jahre</strong> alt sind.
        </p>
      </section>

      <h2 className={styles.subheading}>4. Nutzerkonten, Sicherheit und Sperren</h2>
      <section className={styles.section}>
        <p>
          Für bestimmte Funktionen (insbesondere Zahlungsabwicklung und Auszahlungen) ist ein Nutzerkonto erforderlich. Die Plattform
          behält sich vor, Nutzerkonten und Inhalte jederzeit bei Missbrauch, Rechtsverstößen, Sicherheitsrisiken, Betrugsverdacht oder
          sonstigen wichtigen Gründen zu sperren oder zu löschen (temporär oder dauerhaft) sowie Inhalte zu entfernen.
        </p>
        <p>Auffällige oder gesetzeswidrige Aktivitäten können an zuständige Behörden gemeldet werden.</p>
      </section>

      <h2 className={styles.subheading}>5. Verfügbarkeit, Wartung und Änderungen</h2>
      <section className={styles.section}>
        <p>
          Die Plattform wird im Rahmen der technischen und betrieblichen Möglichkeiten bereitgestellt. Ein Anspruch auf ununterbrochene,
          jederzeit fehlerfreie Verfügbarkeit besteht nicht. Wartungsarbeiten, Sicherheitsupdates, technische Störungen oder
          Weiterentwicklungen können zu vorübergehenden Einschränkungen führen.
        </p>
        <p>
          Die Plattform kann Funktionen anpassen, weiterentwickeln oder einschränken, soweit dies erforderlich ist und Nutzer:innen dadurch
          nicht unangemessen benachteiligt werden.
        </p>
      </section>

      <h2 className={styles.subheading}>6. Verbotene Inhalte und Angebote</h2>
      <section className={styles.section}>
        <p>
          Es ist untersagt, über die Plattform rechtswidrige, irreführende, beleidigende oder diskriminierende Inhalte zu veröffentlichen
          oder Angebote einzustellen, die gegen geltendes Recht oder Rechte Dritter (z. B. Urheber-, Marken-, Persönlichkeitsrechte)
          verstoßen. Unzulässige Inhalte/Angebote können ohne Vorankündigung entfernt werden. Bei Verstößen kann die Plattform Nutzerkonten
          sperren oder dauerhaft schließen.
        </p>
      </section>

      <h2 className={styles.subheading}>7. Anbieterstatus, Preise und Pflichten</h2>
      <section className={styles.section}>
        <p>
          Anbieter:innen sind verpflichtet, ihren Status (privat/gewerblich) korrekt anzugeben. Anbieter:innen sind für die Einhaltung ihrer
          gesetzlichen Pflichten verantwortlich (insbesondere Informationspflichten, Gewährleistung/Widerruf soweit anwendbar, Steuern,
          Rechnungslegung). Preise sind als Bruttopreise anzugeben, soweit gesetzlich erforderlich.
        </p>
      </section>

      <h2 className={styles.subheading}>8. Definition: Lieferdatum</h2>
      <section className={styles.section}>
        <p>
          <strong>Lieferdatum</strong> ist das vom Anbieter/von der Anbieterin im Auftrag gesetzte und dem/der Käufer:in sichtbar angezeigte
          Datum, an dem die Ware bzw. Leistung als geliefert/übergeben gekennzeichnet wird. Ab diesem Lieferdatum beginnen sämtliche in
          diesen AGB genannten Fristen (insbesondere Reklamationsfrist und 28-Tage-Regeln).
        </p>
        <p>
          Das Lieferdatum ist von Anbieter:innen korrekt zu setzen und darf nicht missbräuchlich verwendet werden. Missbrauch kann zur Sperre
          des Kontos und zu weiteren Maßnahmen führen.
        </p>
      </section>

      <h2 className={styles.subheading}>9. Nutzungsrechte an Inhalten</h2>
      <section className={styles.section}>
        <p>
          Durch das Einstellen von Inhalten (z. B. Texte, Bilder, Dateien) räumt der/die Nutzer:in der Plattform ein nicht-exklusives,
          räumlich unbeschränktes Recht ein, diese Inhalte zum Betrieb der Plattform zu speichern, zu vervielfältigen, anzuzeigen und
          öffentlich zugänglich zu machen. Dies umfasst auch die Darstellung innerhalb der Plattform und die Bewerbung von Inseraten/Angeboten
          (z. B. auf Plattformseiten, Vorschauen). Rechte der Nutzer:innen an ihren Inhalten bleiben unberührt.
        </p>
      </section>

      <h2 className={styles.subheading}>10. Zahlungsabwicklung über Stripe</h2>
      <section className={styles.section}>
        <p>
          Zahlungen erfolgen über den externen Zahlungsdienstleister Stripe. Die Zahlungsabwicklung (inkl. Rückerstattungen/Disputes) erfolgt
          ausschließlich gemäß den Bedingungen von Stripe. Die Plattform verwaltet keine Gelder im eigenen Namen und trifft keine
          Ermessensentscheidungen über den Geldfluss. Es besteht <strong>kein Treuhandverhältnis</strong> im rechtlichen Sinne.
        </p>
      </section>

      <h2 className={styles.subheading}>11. Auszahlung an Anbieter:innen</h2>
      <section className={styles.section}>
        <p>
          Die Auszahlung an Anbieter:innen wird ausgelöst, sobald entweder (a) der/die Käufer:in den Erhalt bzw. die ordnungsgemäße Leistung
          bestätigt oder (b) <strong>28 Tage nach dem Lieferdatum</strong> keine Reklamation eingereicht wurde.
        </p>
        <p>
          Zusätzlich kann der/die Anbieter:in die Auszahlung nach Ablauf von <strong>28 Tagen ab Lieferdatum</strong> anstoßen, sofern bis dahin
          keine Reklamation eingereicht wurde und keine Auszahlung erfolgt ist.
        </p>
      </section>

      <h2 className={styles.subheading}>12. Reklamationen, Rückerstattungen und Streitfälle</h2>
      <section className={styles.section}>
        <p>
          Käufer:innen können innerhalb von <strong>28 Tagen nach dem Lieferdatum</strong> eine Reklamation zum betroffenen Auftrag einreichen.
          Die Reklamation wird über eine Popup-Eingabe (Dialog) ausgelöst, in der der Sachverhalt in einem <strong>Textfeld</strong> beschrieben
          wird. Der Button kann dabei z. B. als „Reklamieren“ oder „Problem melden“ bezeichnet sein.
        </p>
        <p>
          Mit Einreichung einer Reklamation wird eine Rückerstattung über Stripe ausgelöst. Gesetzliche Rechte und Pflichten zwischen Käufer:in
          und Anbieter:in bleiben davon unberührt; insbesondere können Ansprüche (z. B. aus Gewährleistung oder Schadenersatz) ausschließlich
          zwischen den Vertragspartner:innen geltend gemacht werden.
        </p>
        <p>
          Die Plattform kann auf Wunsch zwischen den Vertragspartner:innen vermittelnd bzw. streitschlichtend unterstützen, trifft jedoch keine
          bindende Entscheidung über die materielle Rechtslage.
        </p>
        <p>
          <strong>Empfehlung zum Selbstschutz:</strong> Käufer:innen und Anbieter:innen wird geraten, relevante Nachweise (z. B. Fotos, Chatverläufe,
          Versand-/Übergabenachweise) zu dokumentieren, um eigene Ansprüche gegenüber der jeweils anderen Vertragspartei besser durchsetzen zu
          können.
        </p>
      </section>

      <h2 className={styles.subheading}>13. Nachbesserung</h2>
      <section className={styles.section}>
        <p>
          Anbieter:innen erhalten grundsätzlich die Möglichkeit, beanstandete Leistungen/Lieferungen innerhalb von <strong>28 Tagen</strong> nach
          Reklamation im Rahmen der gesetzlichen Vorgaben nachzubessern. Unberührt bleiben zwingende gesetzliche Rechte der Vertragspartner:innen.
        </p>
      </section>

      <h2 className={styles.subheading}>14. Widerruf und Gewährleistung</h2>
      <section className={styles.section}>
        <p>
          Etwaige Widerrufsrechte, Gewährleistungsrechte und sonstige zwingende Verbraucherrechte richten sich nach den gesetzlichen Bestimmungen
          und sind – soweit anwendbar – ausschließlich im Verhältnis zwischen Käufer:in und Anbieter:in zu erfüllen. Die Plattform ist nicht
          Vertragspartner und übernimmt hierfür keine Verantwortung.
        </p>
      </section>

      <h2 className={styles.subheading}>15. Rückbuchungen (Chargebacks) und Schäden</h2>
      <section className={styles.section}>
        <p>
          Erfolgen Rückbuchungen (z. B. Rücklastschriften, Chargebacks) über Bank oder Kartenanbieter, erfolgt die Bearbeitung ausschließlich
          über Stripe bzw. die jeweils beteiligten Zahlungsdienstleister. Die Plattform entscheidet nicht über den Geldfluss.
        </p>
        <p>
          Entstehen der Plattform oder Dritten dadurch Kosten, Gebühren oder sonstige Schäden (z. B. Stripe-Dispute-Gebühren), können diese dem
          verursachenden Nutzer weiterverrechnet und rechtlich verfolgt werden. Wiederholte Rückbuchungen, missbräuchliches Verhalten oder
          Manipulationsversuche können zur temporären oder dauerhaften Sperre des Nutzerkontos führen.
        </p>
      </section>

      <h2 className={styles.subheading}>16. Umgehungsverbot</h2>
      <section className={styles.section}>
        <p>
          Nutzer:innen dürfen keine Geschäfte unter Umgehung der Plattform abwickeln. Es ist insbesondere untersagt, nach Kontaktaufnahme über die
          Plattform einen Kauf, Verkauf oder eine Beauftragung außerhalb der Plattform abzuschließen, um Gebühren oder Provisionen zu umgehen. Bei
          Verstößen kann die Plattform Nutzerkonten sperren oder löschen und weitere Schritte vorbehalten.
        </p>
      </section>

      <h2 className={styles.subheading}>17. Bewertungen und Rezensionen</h2>
      <section className={styles.section}>
        <p>
          Bewertungen sollen wahrheitsgemäß und sachlich sein. Manipulationen, Fake-Bewertungen oder Druckausübung (z. B. „Bewertung gegen Geld“)
          sind untersagt. Die Plattform kann Bewertungen bei Missbrauch, Rechtsverstoß oder Verstoß gegen diese AGB moderieren, ausblenden oder entfernen.
        </p>
      </section>

      <h2 className={styles.subheading}>18. Automatisierte Nutzung, Scraping und Angriffe</h2>
      <section className={styles.section}>
        <p>
          Automatisierte Zugriffe, das Auslesen der Plattform (Scraping), Bots, das Umgehen von Sicherheitsmechanismen, Reverse Engineering sowie
          Angriffe auf Systeme der Plattform sind untersagt. Bei Verstößen kann die Plattform Inhalte entfernen sowie Nutzerkonten temporär oder dauerhaft
          sperren und weitere Schritte vorbehalten.
        </p>
      </section>

      <h2 className={styles.subheading}>19. Höhere Gewalt</h2>
      <section className={styles.section}>
        <p>
          Soweit und solange Ereignisse höherer Gewalt (z. B. Naturkatastrophen, Krieg, Streik, behördliche Maßnahmen, Ausfälle von
          Telekommunikations- oder Stromversorgung, Ausfälle von Drittanbietern) die Plattform oder einzelne Funktionen beeinträchtigen,
          besteht keine Haftung der Plattform für hieraus resultierende Verzögerungen oder Ausfälle, soweit gesetzlich zulässig.
        </p>
      </section>

      <h2 className={styles.subheading}>20. Gebühren</h2>
      <section className={styles.section}>
        <p>
          Für erfolgreiche Abschlüsse über die Plattform fällt eine Provision von <strong>7%</strong> vom <strong>Brutto-Auftrags- bzw. Warenwert</strong> an.
          Gebühren werden transparent im Buchungsprozess ausgewiesen und können im Rahmen der Stripe-Zahlungsabwicklung berücksichtigt werden.
        </p>
      </section>

      <h2 className={styles.subheading}>21. Haftung</h2>
      <section className={styles.section}>
        <p>
          Die Plattform haftet nicht für Schäden, die aus der Nichterfüllung oder mangelhaften Erfüllung von Verträgen zwischen Käufer:innen und Anbieter:innen
          resultieren. Etwaige Ansprüche sind ausschließlich zwischen den Vertragspartner:innen zu klären.
        </p>
        <p>
          Die Haftung der Plattform ist im gesetzlich zulässigen Umfang ausgeschlossen; die Haftung für Vorsatz und grobe Fahrlässigkeit bleibt unberührt.
        </p>
      </section>

      <h2 className={styles.subheading}>22. Änderungen der AGB</h2>
      <section className={styles.section}>
        <p>
          Die Plattform behält sich das Recht vor, diese AGB zu ändern, soweit dies erforderlich ist und Nutzer:innen dadurch nicht unangemessen benachteiligt werden.
          Wesentliche Änderungen werden in geeigneter Weise mitgeteilt. Widerspricht ein:e Nutzer:in nicht innerhalb von 14 Tagen oder nutzt die Plattform weiter,
          gelten die Änderungen als akzeptiert.
        </p>
      </section>

      <h2 className={styles.subheading}>23. Anwendbares Recht und Gerichtsstand</h2>
      <section className={styles.section}>
        <p>
          Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist Feldkirch, soweit gesetzlich zulässig. Für Verbraucher:innen gilt diese
          Gerichtsstandsvereinbarung nur, soweit zwingende gesetzliche Bestimmungen dem nicht entgegenstehen.
        </p>
      </section>

      <br></br>
      <div className={styles.buttonWrapper}>
        <Link href="/" className={styles.backButton}>
          <b>Zurück zur Startseite</b>
        </Link>
      </div>

    </div>
  );
};

export default AgbPage;
