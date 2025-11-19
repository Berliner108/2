"use client";

import { useEffect, useState } from "react";
import styles from "./cookieBanner.module.css";

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [marketingAllowed, setMarketingAllowed] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) setShowBanner(true);
  }, []);

  const acceptAll = () => {
    localStorage.setItem(
      "cookieConsent",
      JSON.stringify({ necessary: true, marketing: true })
    );
    setShowBanner(false);
  };

  const acceptNecessary = () => {
    localStorage.setItem(
      "cookieConsent",
      JSON.stringify({ necessary: true, marketing: false })
    );
    setShowBanner(false);
  };

  const saveSettings = () => {
    localStorage.setItem(
      "cookieConsent",
      JSON.stringify({ necessary: true, marketing: marketingAllowed })
    );
    setShowBanner(false);
  };

  return (
    showBanner && (
      <div className={styles.banner}>
        <div className={styles.text}>
          <strong>Wir verwenden Cookies</strong>
          <p>
            Um unsere Plattform stabil, sicher und benutzerfreundlich betreiben zu können,
            setzen wir Cookies und ähnliche Technologien ein. Einige sind technisch notwendig,
            andere helfen uns, unser Angebot zu analysieren und zu verbessern.
          </p>
          <p>
            Notwendige Cookies sorgen z.&nbsp;B. dafür, dass du eingeloggt bleibst, dein Warenkorb
            funktioniert und Zahlungen <strong>sicher über unseren Zahlungsdienstleister</strong>{" "}
            (z.&nbsp;B. Stripe) abgewickelt werden.
          </p>
          <p>
            Optionale Cookies für <strong>Marketing &amp; Analyse</strong> nutzen wir, um
            anonyme Statistiken zu erstellen, Reichweiten zu messen und unsere Inhalte besser
            an die Interessen unserer Nutzer anzupassen.
          </p>
          <p>
            Wir verkaufen deine Daten <strong>nicht</strong> an Dritte. Eine Weitergabe erfolgt
            nur, wenn dies technisch erforderlich ist (z.&nbsp;B. Hosting, Zahlungsabwicklung,
            Sicherheitsdienste) oder du ausdrücklich eingewilligt hast.
          </p>
          <p>
            Deine Einwilligung in optionale Cookies speichern wir in der Regel für{" "}
            <strong>12&nbsp;Monate</strong>. Du kannst sie jederzeit in den
            Cookie-Einstellungen oder über deine Browsereinstellungen widerrufen. Weitere
            Informationen findest du in unserer{" "}
            <a href="/datenschutz" className={styles.link}>
              Datenschutzerklärung
            </a>
            .
          </p>
        </div>

        {showSettings && (
          <div className={styles.settingsBox}>
            <label>
              <input type="checkbox" checked disabled />{" "}
              Notwendige Cookies (immer aktiv)
            </label>
            <label>
              <input
                type="checkbox"
                checked={marketingAllowed}
                onChange={(e) => setMarketingAllowed(e.target.checked)}
              />
              Marketing &amp; Analyse-Cookies (z.&nbsp;B. Besuchsstatistiken,
              Performance-Messung)
            </label>
            <button className={styles.btnPrimary} onClick={saveSettings}>
              Auswahl speichern
            </button>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.btnSecondary}
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? "Einstellungen verbergen" : "Cookie-Einstellungen"}
          </button>
          <button className={styles.btnSecondary} onClick={acceptNecessary}>
            Nur notwendige Cookies
          </button>
          <button className={styles.btnPrimary} onClick={acceptAll}>
            Alle akzeptieren
          </button>
        </div>
      </div>
    )
  );
};

export default CookieBanner;
