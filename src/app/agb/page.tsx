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
          Diese AGB gelten für die Nutzung der Plattform Beschichter Scout (nachfolgend „Plattform“) durch registrierte und nicht
          registrierte Nutzer:innen. Über die Plattform können Anbieter:innen Leistungen und/oder Waren anbieten und Nutzer:innen
          (Käufer:innen) diese beauftragen bzw. kaufen.
        </p>
        <p>Die Plattform richtet sich an Nutzer:innen in Deutschland (DE), Österreich (AT), der Schweiz (CH) und Liechtenstein (FL).</p>
      </section>

      <h2 className={styles.subheading}>2. Rolle der Plattform</h2>
      <section className={styles.section}>
        <p>
          Die Plattform stellt ausschließlich die technische Infrastruktur für Anzeige, Kommunikation und Zahlungsabwicklung bereit. Kauf-
          bzw. Dienstleistungsverträge kommen ausschließlich zwischen Käufer:in und Anbieter:in zustande. Die Plattform ist nicht
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

      <h2 className={styles.subheading}>4. Registrierung, Zugangsdaten und Kontosicherheit</h2>
      <section className={styles.section}>
        <p>
          Bestimmte Funktionen (insbesondere Zahlungsabwicklung und Auszahlungen) setzen eine Registrierung voraus. Nutzer:innen haben bei
          der Registrierung vollständige und wahrheitsgemäße Angaben zu machen und diese bei Änderungen unverzüglich zu aktualisieren.
        </p>
        <p>
          Jede Person bzw. jedes Unternehmen darf grundsätzlich nur ein Nutzerkonto führen. Mehrfachregistrierungen, die Umgehung von
          Beschränkungen oder die Nutzung fremder Konten sind untersagt.
        </p>
        <p>
          Zugangsdaten (insbesondere Passwort) sind geheim zu halten und dürfen nicht an Dritte weitergegeben werden. Nutzer:innen sind
          verpflichtet, missbräuchliche Nutzung oder Sicherheitsvorfälle (z. B. unbefugter Zugriff) unverzüglich zu melden und geeignete
          Maßnahmen (z. B. Passwortänderung) zu setzen.
        </p>
      </section>

      {/* NEU: Account-Übertragung verboten */}
      <h2 className={styles.subheading}>5. Nichtübertragbarkeit von Nutzerkonten</h2>
      <section className={styles.section}>
        <p>
          Nutzerkonten sind personenbezogen und dürfen ohne ausdrückliche Zustimmung der Plattform nicht verkauft, übertragen, abgetreten
          oder Dritten zur dauerhaften Nutzung überlassen werden. Dies gilt auch für die Überlassung von Zugangsdaten.
        </p>
        <p>Bei Verstößen kann die Plattform das Konto vorübergehend oder dauerhaft sperren und weitere Maßnahmen vorbehalten.</p>
      </section>

      <h2 className={styles.subheading}>6. Nutzerkonten, Sicherheit und Sperren</h2>
      <section className={styles.section}>
        <p>
          Die Plattform behält sich vor, Nutzerkonten und Inhalte jederzeit bei Missbrauch, Rechtsverstößen, Sicherheitsrisiken,
          Betrugsverdacht oder sonstigen wichtigen Gründen zu sperren oder zu löschen (temporär oder dauerhaft) sowie Inhalte zu entfernen.
        </p>
        <p>Auffällige oder gesetzeswidrige Aktivitäten können an zuständige Behörden gemeldet werden.</p>
      </section>

      <h2 className={styles.subheading}>7. Kündigung, Löschung und Inaktivität</h2>
      <section className={styles.section}>
        <p>
          Nutzer:innen können ihr Nutzerkonto grundsätzlich jederzeit beenden, indem sie die Registrierung löschen bzw. die Kündigung über
          die Plattformfunktionen veranlassen. Mit Beendigung des Kontos können Funktionen (z. B. Einstellen von Angeboten, Kommunikation)
          ganz oder teilweise entfallen.
        </p>
        <p>
          Die Plattform kann die Nutzung der Services ordentlich kündigen (z. B. mit angemessener Frist) sowie aus wichtigem Grund
          außerordentlich sperren oder beenden, insbesondere bei wiederholten Verstößen, Missbrauch, Betrug oder Rechtsverstößen.
        </p>
        <p>
          Die Plattform kann Registrierungen löschen, wenn sich Nutzer:innen über einen längeren Zeitraum (z. B. 12 Monate) nicht anmelden,
          soweit dem keine gesetzlichen Aufbewahrungspflichten oder berechtigten Interessen entgegenstehen.
        </p>
      </section>

      {/* NEU: Datenaufbewahrung & Löschung */}
      <h2 className={styles.subheading}>8. Datenaufbewahrung und Löschung</h2>
      <section className={styles.section}>
        <p>
          Bei Kündigung, Löschung oder Sperre eines Nutzerkontos können Inhalte und Daten gemäß den Funktionen der Plattform entfernt oder
          anonymisiert werden. Technisch bedingte Sicherungskopien können zeitverzögert überschrieben werden.
        </p>
        <p>
          Daten, die zur Erfüllung gesetzlicher Pflichten oder zur Durchsetzung/Abwehr von Ansprüchen erforderlich sind (z. B. Transaktions-
          und Buchungsdaten, Abrechnungsdaten, sicherheitsrelevante Protokolle), können im gesetzlich zulässigen Umfang auch nach Beendigung
          des Kontos gespeichert bleiben.
        </p>
      </section>

      <h2 className={styles.subheading}>9. Verfügbarkeit, Wartung und Änderungen</h2>
      <section className={styles.section}>
        <p>
          Die Plattform wird im Rahmen der technischen und betrieblichen Möglichkeiten bereitgestellt. Ein Anspruch auf ununterbrochene,
          jederzeit fehlerfreie Verfügbarkeit besteht nicht. Wartungsarbeiten, Sicherheitsupdates, technische Störungen oder
          Weiterentwicklungen können zu vorübergehenden Einschränkungen führen.
        </p>
        <p>
          Die Plattform kann Funktionen anpassen, weiterentwickeln oder einschränken, soweit hierfür ein triftiger Grund besteht (z. B.
          rechtliche Vorgaben, Sicherheit, technische Weiterentwicklung) und Nutzer:innen dadurch nicht unangemessen benachteiligt werden.
        </p>
      </section>

      {/* NEU: Support/Antwortzeiten */}
      <h2 className={styles.subheading}>10. Support und Reaktionszeiten</h2>
      <section className={styles.section}>
        <p>
          Die Plattform kann Support- und Hilfestellungen anbieten (z. B. per E-Mail oder über Kontaktformulare). Ein Anspruch auf Support,
          bestimmte Reaktionszeiten, Erreichbarkeit oder eine konkrete Lösung besteht nicht. Support erfolgt nach Möglichkeit („best
          effort“).
        </p>
        <p>
          Die Plattform kann Supportleistungen einschränken, priorisieren oder vorübergehend einstellen, insbesondere bei Wartung,
          Sicherheitsvorfällen, hoher Auslastung oder Missbrauch.
        </p>
      </section>

      <h2 className={styles.subheading}>11. Verbotene Inhalte und Angebote</h2>
      <section className={styles.section}>
        <p>
          Es ist untersagt, über die Plattform rechtswidrige, irreführende, beleidigende oder diskriminierende Inhalte zu veröffentlichen
          oder Angebote einzustellen, die gegen geltendes Recht oder Rechte Dritter (z. B. Urheber-, Marken-, Persönlichkeitsrechte)
          verstoßen. Unzulässige Inhalte/Angebote können ohne Vorankündigung entfernt werden. Bei Verstößen kann die Plattform Nutzerkonten
          sperren oder dauerhaft schließen.
        </p>
      </section>

      <h2 className={styles.subheading}>12. Anbieterstatus, Preise und Pflichten</h2>
      <section className={styles.section}>
        <p>
          Anbieter:innen sind verpflichtet, ihren Status (privat/gewerblich) korrekt anzugeben. Anbieter:innen sind für die Einhaltung ihrer
          gesetzlichen Pflichten verantwortlich (insbesondere Informationspflichten, Gewährleistung/Widerruf soweit anwendbar, Steuern,
          Rechnungslegung). Preise sind als Bruttopreise anzugeben, soweit gesetzlich erforderlich.
        </p>
      </section>

      {/* NEU: Steuern/Rechnungen/Preisangaben (Ergänzung/Absicherung) */}
      <h2 className={styles.subheading}>13. Steuern, Rechnungen und Preisangaben</h2>
      <section className={styles.section}>
        <p>
          Anbieter:innen sind allein verantwortlich für die korrekte steuerliche Behandlung ihrer Umsätze, die Erfüllung von
          Informationspflichten sowie – soweit erforderlich – die Ausstellung von Rechnungen und sonstigen Belegen gegenüber Käufer:innen.
        </p>
        <p>
          Preisangaben und Leistungsbeschreibungen müssen vollständig, richtig und nachvollziehbar sein. Die Plattform übernimmt keine
          Prüfungspflicht und keine Haftung für steuerliche oder rechtliche Richtigkeit von Angaben der Nutzer:innen.
        </p>
      </section>

      <h2 className={styles.subheading}>14. Pflichten von Käufer:innen und Anbieter:innen</h2>
      <section className={styles.section}>
        <p>
          Käufer:innen verpflichten sich, nur ernsthafte und verbindliche Beauftragungen/Käufe vorzunehmen, vereinbarte Zahlungen fristgerecht
          zu leisten und im Rahmen der gesetzlichen Möglichkeiten an einer ordnungsgemäßen Abwicklung mitzuwirken (z. B. Erreichbarkeit,
          Bereitstellung erforderlicher Informationen).
        </p>
        <p>
          Anbieter:innen verpflichten sich, vollständige und wahrheitsgemäße Angaben zu ihren Angeboten zu machen, Anfragen und Aufträge im
          zumutbaren Rahmen zu bearbeiten, vereinbarte Leistungen/Waren ordnungsgemäß zu erbringen bzw. zu liefern und gesetzliche Pflichten
          einzuhalten.
        </p>
      </section>

      <h2 className={styles.subheading}>15. Vertragsabschluss und Verbindlichkeit</h2>
      <section className={styles.section}>
        <p>
          Ein Vertrag zwischen Käufer:in und Anbieter:in kommt zustande, sobald die Parteien über die Plattform eine verbindliche Bestellung/
          Beauftragung auslösen und die Zahlung erfolgreich verarbeitet wurde bzw. die Plattform den Abschluss als bestätigt anzeigt.
        </p>
        <p>
          Stornierungen, Rücktritte oder sonstige Vertragsänderungen richten sich nach den Vereinbarungen der Parteien sowie den gesetzlichen
          Bestimmungen. Die Plattform kann technische Möglichkeiten zur Stornierung bereitstellen, ist hierzu jedoch nicht verpflichtet.
        </p>
      </section>

      <h2 className={styles.subheading}>16. Definition: Lieferdatum</h2>
      <section className={styles.section}>
        <p>
          <strong>Lieferdatum</strong> ist das vom Anbieter/von der Anbieterin im Auftrag gesetzte und dem/der Käufer:in sichtbar angezeigte
          Datum, an dem die Ware bzw. Leistung als geliefert/übergeben gekennzeichnet wird. Ab diesem Lieferdatum beginnen sämtliche in
          diesen AGB genannten Fristen (insbesondere Reklamationsfrist und 28-Tage-Regeln).
        </p>
        <p>
          <strong>Das Lieferdatum ist nach dem Setzen nicht nachträglich änderbar.</strong>
        </p>
        <p>
          Das Lieferdatum ist von Anbieter:innen korrekt zu setzen und darf nicht missbräuchlich verwendet werden. Missbrauch kann zur Sperre
          des Kontos und zu weiteren Maßnahmen führen.
        </p>
      </section>

      <h2 className={styles.subheading}>17. Versand, Übergabe und Transport</h2>
      <section className={styles.section}>
        <p>
          Versand, Übergabe, Transport, Verpackung, Versicherung sowie Risiko- und Gefahrenübergang sind – soweit anwendbar – ausschließlich
          Angelegenheit zwischen Käufer:in und Anbieter:in. Die Plattform übernimmt hierfür keine Verantwortung und haftet nicht für Schäden,
          Verzögerungen oder Verlust im Zusammenhang mit Transport/Übergabe, soweit gesetzlich zulässig.
        </p>
      </section>

      <h2 className={styles.subheading}>18. Nutzungsrechte an Inhalten</h2>
      <section className={styles.section}>
        <p>
          Durch das Einstellen von Inhalten (z. B. Texte, Bilder, Dateien) räumt der/die Nutzer:in der Plattform ein nicht-exklusives,
          räumlich unbeschränktes Recht ein, diese Inhalte zum Betrieb der Plattform zu speichern, zu vervielfältigen, anzuzeigen und
          öffentlich zugänglich zu machen. Dies umfasst auch die Darstellung innerhalb der Plattform und die Bewerbung von Inseraten/Angeboten
          (z. B. auf Plattformseiten, Vorschauen). Rechte der Nutzer:innen an ihren Inhalten bleiben unberührt.
        </p>
      </section>

      <h2 className={styles.subheading}>19. Schutzrechte an Plattform, Marke und Design</h2>
      <section className={styles.section}>
        <p>
          Sämtliche Rechte an der Plattform (insbesondere Software, Quellcode, Datenbankstruktur, Layout/Design, Texte der Plattform, Marken,
          Logos und Kennzeichen) verbleiben bei dem Plattformbetreiber bzw. den jeweiligen Rechteinhabern. Nutzer:innen dürfen Inhalte oder
          Elemente der Plattform nicht ohne ausdrückliche Zustimmung kopieren, nachbilden, fram(en), automatisiert auslesen oder für eigene
          Dienste verwenden, soweit gesetzlich zulässig.
        </p>
      </section>

      <h2 className={styles.subheading}>20. Melden von Inhalten und Moderation</h2>
      <section className={styles.section}>
        <p>
          Die Plattform kann Möglichkeiten bereitstellen, Inhalte zu melden, die Nutzer:innen oder Dritte als rechtswidrig oder unzulässig
          ansehen. Die Plattform kann gemeldete Inhalte prüfen und angemessene Maßnahmen ergreifen.
        </p>
        <p>
          Angemessene Maßnahmen können insbesondere sein: Entfernen von Inhalten, Sperrung des Zugriffs, Verzögern der Veröffentlichung,
          Einschränkung der Sichtbarkeit, Verwarnung, vorübergehende oder dauerhafte Einschränkung von Funktionen (z. B. Einstellen von
          Angeboten) sowie vorübergehende oder dauerhafte Sperrung von Nutzerkonten.
        </p>
        <p>
          Bei der Auswahl von Maßnahmen können Schwere und Art des Verstoßes, ein etwaiges Verschulden sowie wiederholte Verstöße
          berücksichtigt werden. Betroffene können über wesentliche Maßnahmen in geeigneter Weise informiert werden.
        </p>
      </section>

      <h2 className={styles.subheading}>21. Ranking, Sortierung und „Sponsored“</h2>
      <section className={styles.section}>
        <p>
          Suchergebnisse und Listenansichten können nach Relevanzkriterien sortiert werden (z. B. Kategorie, Standort, Preis, Verfügbarkeit,
          Qualität der Angaben, bisheriges Nutzerverhalten). Nutzer:innen können je nach verfügbarer Funktionalität Sortierungen und Filter
          anpassen.
        </p>
        <p>
          Abweichend davon können einzelne Inserate/Angebote als „Sponsored“ oder durch kostenpflichtige Zusatzleistungen eine erhöhte
          Sichtbarkeit erhalten und dadurch höher platziert angezeigt werden.
        </p>
      </section>

      <h2 className={styles.subheading}>22. Beweissicherung, Protokolle und Logfiles</h2>
      <section className={styles.section}>
        <p>
          Die Plattform ist berechtigt, zur Gewährleistung der Sicherheit, zur Betrugsprävention, zur Missbrauchsaufklärung sowie zur
          technischen Fehleranalyse Protokolle (Logfiles) zu führen und technische Nutzungsdaten zu speichern. Dies kann insbesondere
          Zeitpunkte, Geräte-/Browserinformationen, Systemereignisse und sicherheitsrelevante Vorgänge umfassen.
        </p>
        <p>
          Soweit Kommunikationsfunktionen bereitgestellt werden, kann die Plattform zur Sicherstellung des Betriebs und zur Missbrauchsabwehr
          auch Kommunikations-Metadaten (z. B. Zeitpunkte, beteiligte Konten, Dateigrößen) verarbeiten. Eine Verpflichtung zur Herausgabe von
          Protokollen oder Kommunikationsinhalten besteht nicht, sofern keine gesetzliche Pflicht besteht.
        </p>
      </section>

      <h2 className={styles.subheading}>23. Zahlungsabwicklung über Stripe</h2>
      <section className={styles.section}>
        <p>
          Zahlungen erfolgen über den externen Zahlungsdienstleister Stripe. Die Zahlungsabwicklung (inkl. Rückerstattungen/Disputes) erfolgt
          ausschließlich gemäß den Bedingungen von Stripe. Die Plattform verwaltet keine Gelder im eigenen Namen und trifft keine
          Ermessensentscheidungen über den Geldfluss. Es besteht <strong>kein Treuhandverhältnis</strong> im rechtlichen Sinne.
        </p>
      </section>

      <h2 className={styles.subheading}>24. Auszahlung an Anbieter:innen</h2>
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

      <h2 className={styles.subheading}>25. Reklamationen, Rückerstattungen und Streitfälle</h2>
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

      <h2 className={styles.subheading}>26. Missbrauch von Reklamationen</h2>
      <section className={styles.section}>
        <p>
          Offensichtlich unbegründete Reklamationen oder ein missbräuchliches Ausnutzen der Reklamationsfunktion sind untersagt. Bei
          wiederholtem oder schwerwiegendem Missbrauch kann die Plattform die Reklamationsfunktion einschränken oder sperren sowie weitere
          Maßnahmen (bis hin zur temporären oder dauerhaften Kontosperre) setzen.
        </p>
      </section>

      <h2 className={styles.subheading}>27. Nachbesserung</h2>
      <section className={styles.section}>
        <p>
          Anbieter:innen erhalten grundsätzlich die Möglichkeit, beanstandete Leistungen/Lieferungen innerhalb von <strong>28 Tagen</strong> nach
          Reklamation im Rahmen der gesetzlichen Vorgaben nachzubessern. Unberührt bleiben zwingende gesetzliche Rechte der Vertragspartner:innen.
        </p>
      </section>

      <h2 className={styles.subheading}>28. Widerruf und Gewährleistung</h2>
      <section className={styles.section}>
        <p>
          Etwaige Widerrufsrechte, Gewährleistungsrechte und sonstige zwingende Verbraucherrechte richten sich nach den gesetzlichen Bestimmungen
          und sind – soweit anwendbar – ausschließlich im Verhältnis zwischen Käufer:in und Anbieter:in zu erfüllen. Die Plattform ist nicht
          Vertragspartner und übernimmt hierfür keine Verantwortung.
        </p>
      </section>

      <h2 className={styles.subheading}>29. Offensichtliche Irrtümer und Korrekturen</h2>
      <section className={styles.section}>
        <p>
          Offensichtliche Eingabe- oder Übermittlungsfehler (insbesondere offensichtliche Preis- oder Inhaltsirrtümer) können von der jeweils
          verantwortlichen Partei berichtigt werden. Soweit dadurch eine Durchführung des Vertrags nicht zumutbar oder fair möglich ist, kann
          eine Rückabwicklung nach den gesetzlichen Bestimmungen erfolgen.
        </p>
      </section>

      <h2 className={styles.subheading}>30. Rückbuchungen (Chargebacks) und Schäden</h2>
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

      <h2 className={styles.subheading}>31. Umgehungsverbot, Vertragsstrafe und Schadenersatz</h2>
      <section className={styles.section}>
        <p>
          Nutzer:innen dürfen keine Geschäfte unter Umgehung der Plattform abwickeln. Es ist insbesondere untersagt, nach Kontaktaufnahme über
          die Plattform einen Kauf, Verkauf oder eine Beauftragung außerhalb der Plattform abzuschließen, um Gebühren oder Provisionen zu
          umgehen.
        </p>
        <p>
          Bei Verstößen kann die Plattform Nutzerkonten sperren oder löschen und – soweit gesetzlich zulässig – eine angemessene
          pauschalierte Vertragsstrafe bzw. Schadenersatz geltend machen. Unberührt bleibt der Nachweis eines höheren Schadens sowie der
          Nachweis, dass kein oder ein geringerer Schaden entstanden ist.
        </p>
      </section>

      <h2 className={styles.subheading}>32. Bewertungen und Rezensionen</h2>
      <section className={styles.section}>
        <p>
          Bewertungen sollen wahrheitsgemäß und sachlich sein. Manipulationen, Fake-Bewertungen oder Druckausübung (z. B. „Bewertung gegen
          Geld“) sind untersagt. Die Plattform kann Bewertungen bei Missbrauch, Rechtsverstoß oder Verstoß gegen diese AGB moderieren,
          ausblenden oder entfernen.
        </p>
      </section>

      <h2 className={styles.subheading}>33. Automatisierte Nutzung, Scraping und Angriffe</h2>
      <section className={styles.section}>
        <p>
          Automatisierte Zugriffe, das Auslesen der Plattform (Scraping), Bots, das Umgehen von Sicherheitsmechanismen, Reverse Engineering
          sowie Angriffe auf Systeme der Plattform sind untersagt. Bei Verstößen kann die Plattform Inhalte entfernen sowie Nutzerkonten
          temporär oder dauerhaft sperren und weitere Schritte vorbehalten.
        </p>
      </section>

      <h2 className={styles.subheading}>34. Freistellung</h2>
      <section className={styles.section}>
        <p>
          Nutzer:innen stellen die Plattform von sämtlichen Ansprüchen Dritter (einschließlich angemessener Kosten der Rechtsverteidigung)
          frei, die aufgrund von von Nutzer:innen eingestellten Inhalten, Angeboten oder der sonstigen Nutzung der Plattform unter Verletzung
          von Rechten Dritter oder gesetzlichen Vorschriften geltend gemacht werden, soweit gesetzlich zulässig.
        </p>
      </section>

      <h2 className={styles.subheading}>35. Höhere Gewalt</h2>
      <section className={styles.section}>
        <p>
          Soweit und solange Ereignisse höherer Gewalt (z. B. Naturkatastrophen, Krieg, Streik, behördliche Maßnahmen, Ausfälle von
          Telekommunikations- oder Stromversorgung, Ausfälle von Drittanbietern) die Plattform oder einzelne Funktionen beeinträchtigen,
          besteht keine Haftung der Plattform für hieraus resultierende Verzögerungen oder Ausfälle, soweit gesetzlich zulässig.
        </p>
      </section>

      <h2 className={styles.subheading}>36. Gebühren</h2>
      <section className={styles.section}>
        <p>
          Für erfolgreiche Abschlüsse über die Plattform fällt eine Provision von <strong>7%</strong> vom{' '}
          <strong>Brutto-Auftrags- bzw. Warenwert</strong> an. Gebühren werden transparent im Buchungsprozess ausgewiesen und können im Rahmen
          der Stripe-Zahlungsabwicklung berücksichtigt werden.
        </p>
      </section>

      <h2 className={styles.subheading}>37. Rangfolge und Zusatzbedingungen</h2>
      <section className={styles.section}>
        <p>
          Ergänzend zu diesen AGB können für einzelne Funktionen oder Leistungen zusätzliche Bedingungen gelten (z. B. Gebührenordnung,
          Sponsored-/Promo-Regeln, Produkt- oder Kategoriebedingungen). Soweit solche Bedingungen spezieller sind, gehen sie diesen AGB im
          jeweiligen Anwendungsbereich vor; im Übrigen gelten die AGB ergänzend fort.
        </p>
      </section>

      <h2 className={styles.subheading}>38. Haftung</h2>
      <section className={styles.section}>
        <p>
          Die Plattform haftet nicht für Schäden, die aus der Nichterfüllung oder mangelhaften Erfüllung von Verträgen zwischen Käufer:innen
          und Anbieter:innen resultieren. Etwaige Ansprüche sind ausschließlich zwischen den Vertragspartner:innen zu klären.
        </p>
        <p>
          Die Haftung der Plattform ist im gesetzlich zulässigen Umfang ausgeschlossen; die Haftung für Vorsatz und grobe Fahrlässigkeit bleibt
          unberührt.
        </p>
      </section>

      <h2 className={styles.subheading}>39. Zustellungen und Kommunikation</h2>
      <section className={styles.section}>
        <p>
          Mitteilungen der Plattform an Nutzer:innen können per E-Mail an die im Nutzerkonto hinterlegte Adresse erfolgen und gelten als
          zugegangen, sobald sie unter gewöhnlichen Umständen abrufbar sind. Nutzer:innen sind verpflichtet, ihre Kontaktdaten (insbesondere
          E-Mail-Adresse) aktuell zu halten.
        </p>
      </section>

      {/* NEU: Vertragssprache Deutsch maßgeblich */}
      <h2 className={styles.subheading}>40. Vertragssprache</h2>
      <section className={styles.section}>
        <p>
          Vertragssprache ist Deutsch. Sofern Übersetzungen bereitgestellt werden, ist ausschließlich die deutsche Fassung maßgeblich, soweit
          gesetzlich zulässig.
        </p>
      </section>

      {/* NEU: Übertragung/Abtretung durch Plattform */}
      <h2 className={styles.subheading}>41. Übertragung der Plattform und Vertragsverhältnisse</h2>
      <section className={styles.section}>
        <p>
          Die Plattform ist berechtigt, Rechte und Pflichten aus diesen AGB sowie den Betrieb der Plattform insgesamt auf ein anderes
          Unternehmen zu übertragen (z. B. im Rahmen einer Umstrukturierung, eines Betriebsübergangs oder einer Veräußerung), soweit gesetzlich
          zulässig und Nutzer:innen dadurch nicht unangemessen benachteiligt werden.
        </p>
      </section>

      <h2 className={styles.subheading}>42. Änderungen der AGB</h2>
      <section className={styles.section}>
        <p>
          Die Plattform behält sich das Recht vor, diese AGB zu ändern, soweit dies erforderlich ist und Nutzer:innen dadurch nicht
          unangemessen benachteiligt werden. Wesentliche Änderungen werden in geeigneter Weise mitgeteilt. Widerspricht ein:e Nutzer:in nicht
          innerhalb von 14 Tagen oder nutzt die Plattform weiter, gelten die Änderungen als akzeptiert.
        </p>
      </section>

      <h2 className={styles.subheading}>43. Salvatorische Klausel</h2>
      <section className={styles.section}>
        <p>
          Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit
          der übrigen Bestimmungen unberührt. Anstelle der unwirksamen/undurchführbaren Bestimmung gilt eine wirksame Regelung als vereinbart,
          die dem wirtschaftlichen Zweck am nächsten kommt, soweit gesetzlich zulässig.
        </p>
      </section>

      <h2 className={styles.subheading}>44. Anwendbares Recht und Gerichtsstand</h2>
      <section className={styles.section}>
        <p>
          Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist Feldkirch, soweit gesetzlich zulässig. Für
          Verbraucher:innen gilt diese Gerichtsstandsvereinbarung nur, soweit zwingende gesetzliche Bestimmungen dem nicht entgegenstehen.
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
