
'use client';

import React from 'react';
import Link from 'next/link';
import styles from './datenschutz.module.css';

const DatenschutzPage = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Datenschutzerklärung</h1>

      <section className={styles.section}>
        <h2 className={styles.subheading}>Verantwortlicher für die Datenverarbeitung ist:</h2>
        <p>
          BeschichterScout GmbH</p> 
          <p>Seestraße 1</p>
          <p>A-6900 Bregenz</p>
          <p>info@beschichterscout.at</p>
          <p>Wir freuen uns über Ihr Interesse an unserem Online-Portal. Der Schutz Ihrer Privatsphäre ist für uns sehr wichtig. 
              Wir behandeln Ihre personenbezogenen Daten
              vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.Nachstehend informieren wir Sie ausführlich über den Umgang mit Ihren Daten. 
        </p>
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.subheading}>1. Zugriffsdaten und Hosting</h2>
        <p>
        Sie können unsere Webseiten besuchen, ohne Angaben zu Ihrer Person zu machen. Bei jedem Aufruf einer Webseite speichert der Webserver 
        lediglich automatisch ein sogenanntes Server-Logfile, das z.B. den Namen der angeforderten Datei, Ihre IP-Adresse, Datum und Uhrzeit des Abrufs, 
        übertragene Datenmenge und den anfragenden Provider (Zugriffsdaten) enthält und den Abruf dokumentiert.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>2. Datenerhebung und -verwendung zur Vertragsabwicklung</h2>
        <p>
         Wir erheben personenbezogene Daten, wenn Sie uns diese im Rahmen Ihrer Bestellung oder bei einer Kontaktaufnahme mit uns 
         (z.B. per Kontaktformular oder E-Mail) mitteilen. Pflichtfelder werden als solche gekennzeichnet, da wir in diesen Fällen die 
         Daten zwingend zur Vertragsabwicklung, bzw. zur Bearbeitung Ihrer Kontaktaufnahme benötigen und Sie ohne deren Angabe die Bestellung nicht abschließen, 
         bzw. die Kontaktaufnahme nicht versenden können. Welche Daten erhoben werden, ist aus den jeweiligen Eingabeformularen ersichtlich. Wir verwenden die von 
         ihnen mitgeteilten Daten gemäß Art. 6 Abs. 1
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>3. Datenweitergabe</h2>
        <p>
        Zur Vertragserfüllung gemäß Art. 6 Abs. 1 S. 1 lit. b DSGVO geben wir Ihre Daten an das mit der Lieferung beauftragte Versandunternehmen weiter, 
        soweit dies zur Lieferung bestellter Waren erforderlich ist. Je nach dem, welchen Zahlungsdienstleister Sie im Bestellprozess auswählen, 
        geben wir zur Abwicklung von Zahlungen die hierfür erhobenen Zahlungsdaten an das mit der Zahlung beauftragte Kreditinstitut und ggf. von uns 
        beauftragte Zahlungsdienstleister weiter.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>4. E-mail-Newsletter</h2>
        <p>
        Wenn Sie sich zu unserem Newsletter anmelden, verwenden wir die hierfür erforderlichen oder gesondert von Ihnen mitgeteilten Daten, um Ihnen 
        regelmäßig unseren E-Mail-Newsletter aufgrund Ihrer Einwilligung gemäß Art. 6 Abs. 1 S. 1 lit. a DSGVO zuzusenden.
        Die Abmeldung vom Newsletter ist jederzeit möglich und kann entweder durch eine Nachricht an die unten beschriebene Kontaktmöglichkeit oder 
        über einen dafür vorgesehenen Link im Newsletter erfolgen.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>5. Cookies und Webanalyse</h2>
        <p>
        Um den Besuch unserer Website attraktiv zu gestalten und die Nutzung bestimmter Funktionen zu ermöglichen, um passende Produkte anzuzeigen oder zur 
        Marktforschung verwenden wir auf verschiedenen Seiten sogenannte Cookies. Dies dient der Wahrung unserer im Rahmen einer Interessensabwägung 
        überwiegenden berechtigten Interessen an einer optimierten Darstellung unseres Angebots gemäß Art. 6 Abs. 1 S. 1 lit. f DSGVO. Cookies sind kleine 
        Textdateien, die automatisch auf Ihrem Endgerät gespeichert werden. Einige der von uns verwendeten Cookies werden nach Ende der Browser-Sitzung, 
        also nach Schließen Ihres Browsers, wieder gelöscht (sog. Sitzungs-Cookies). Andere Cookies verbleiben bei uns.

        Einsatz von Google (Universal) Analytics zur Webanalyse
        Soweit Sie hierzu Ihre Einwilligung nach Art. 6 Abs. 1 S. 1 lit. a DSGVO erteilt haben, setzt diese Website zum Zweck der Webseitenanalyse Google (Universal) 
        Analytics ein, einen Webanalysedienst der Google LLC (www.google.de). Google (Universal) Analytics verwendet Methoden, die eine Analyse der Benutzung 
        der Website durch Sie ermöglichen, wie zum Beispiel Cookies. Die automatisch erhobenen Informationen über Ihre Benutzung dieser Website werden in der 
        Regel an einen Server von Google in den USA übertragen.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>6. Online-Marketing</h2>
        <p>
        Unsere Website vermarktet über Google AdSense Platz für Anzeigen von Drittanbietern und Werbenetzwerken. Diese Anzeigen werden Ihnen an verschiedenen 
        Stellen auf dieser Website angezeigt. Soweit Sie uns hierzu Ihre Einwilligung gemäß Art. 6 Abs. 1 S. 1 lit. a DSGVO erteilt haben, wird im Rahmen 
        der Einbindung von Google AdSense das sog. DoubleClick-Cookie von Google gesetzt.
        Dieses ermöglicht die Anzeige interessengerechter Werbung durch automatische Zuordnung einer pseudonymen UserID, mit deren Hilfe die Interessen anhand 
        von Besuchen dieser eingeblendet werden.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>7. Social Media PlugIns</h2>
        <p>
        Auf unserer Website werden sogenannte Social Plugins („Plugins“) von sozialen Netzwerken verwendet.
        Wenn Sie eine Seite unseres Webauftritts aufrufen, die ein solches Plugin enthält, stellt Ihr Browser eine direkte Verbindung zu den Servern von Facebook, 
        Google, Twitter oder Instagram her. Der Inhalt des Plugins wird vom jeweiligen Anbieter direkt an Ihren Browser übermittelt und in die Seite eingebunden. 
        Durch die Einbindung der Plugins erhalten die Anbieter die Information, dass Ihr Browser die entsprechende Seite unseres Webauftritts aufgerufen hat, 
        auch wenn Sie kein Profil besitzen oder gerade nicht eingeloggt sind. Diese Information (einschließlich Ihrer IP-Adresse) wird von Ihrem Browser direkt 
        an einen Server des jeweiligen Anbieters verarbeitet.
        Unsere Präsenz auf sozialen Netzwerken und Plattformen dient einer besseren, aktiven Kommunikation mit unseren Kunden und Interessenten. Wir informieren 
        dort über unsere Produkte und laufende Sonderaktionen.
        Bei dem Besuch unserer Onlinepräsenzen in sozialen Medien können Ihre Daten für Marktforschungs- und Werbezwecke verwendet werden.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>8. Kontaktmöglichkeiten und Ihre Rechte</h2>
        <p>
          Als Betroffener haben Sie folgende Rechte:

          gemäß Art. 15 DSGVO das Recht, in dem dort bezeichneten Umfang Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten zu verlangen;
          gemäß Art. 16 DSGVO das Recht, unverzüglich die Berichtigung unrichtiger oder Vervollständigung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen;
          gemäß Art. 17 DSGVO das Recht, die Löschung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen, soweit nicht die weitere Verarbeitung
          - zur Ausübung des Rechts auf freie Meinungsäußerung und Information;
          - zur Erfüllung einer rechtlichen

          Einwilligung oder Widerspruch gegen eine bestimmte Datenverwendung wenden Sie sich bitte direkt an uns über die Kontaktdaten in unserem Impressum.</p>

          <p>Datenschutzbeauftragter:</p>
          <p>Martin Zajac</p>
          <p>Seestraße 1</p>
          <p>6900 Bregenz</p>

          <p>martin@beschichterscout.at
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>Widerspruchsrecht</h2>
        <p>
           Soweit wir zur Wahrung unserer im Rahmen einer Interessensabwägung überwiegenden berechtigten Interessen personenbezogene Daten wie oben erläutert 
           verarbeiten, können Sie dieser Verarbeitung mit Wirkung für die Zukunft widersprechen. Erfolgt die Verarbeitung zu Zwecken des Direktmarketings, 
           können Sie dies auf eigenen Wunsch verweigern.
        </p>
      </section>

      <div className={styles.buttonContainer}>
        <Link href="/">
          <button className={styles.backButton}>Zurück zur Startseite</button>
        </Link>
      </div>
    </div>
  );
};

export default DatenschutzPage;
