"use client";

import { useEffect, useState } from "react";
import styles from "./cookieBanner.module.css";

const CONSENT_KEY = "cookieConsent";
const CONSENT_VERSION = "1.0";

type Consent = {
  necessary: boolean;
  marketing: boolean;
  version: string;
  date: string;
};

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [marketingAllowed, setMarketingAllowed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) {
        setShowBanner(true);
        return;
      }

      const parsed: Consent | null = JSON.parse(stored);
      if (!parsed || parsed.version !== CONSENT_VERSION) {
        // Alte oder ungültige Version → Banner erneut anzeigen
        setShowBanner(true);
      } else {
        setMarketingAllowed(!!parsed.marketing);
      }
    } catch {
      // Im Zweifel neu fragen
      setShowBanner(true);
    }
  }, []);

  const storeConsent = (marketing: boolean) => {
    const consent: Consent = {
      necessary: true,
      marketing,
      version: CONSENT_VERSION,
      date: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  };

  const acceptAll = () => {
    storeConsent(true);
    setShowBanner(false);
  };

  const acceptNecessary = () => {
    storeConsent(false);
    setShowBanner(false);
  };

  const saveSettings = () => {
    storeConsent(marketingAllowed);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Klick-Schutz über der ganzen Seite, Scrollen bleibt möglich */}
      <div className={styles.backdrop} aria-hidden="true" />

      <aside
        className={styles.banner}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-title"
      >
        <div className={styles.inner}>
          <div className={styles.text}>
            <h2 id="cookie-title" className={styles.title}>
              Wir verwenden Cookies
            </h2>

            <p className={styles.description}>
              Wir nutzen Cookies, um unsere Website zuverlässig zu betreiben, die
              Sicherheit der Plattform zu gewährleisten und unser Angebot
              kontinuierlich zu verbessern. Technisch notwendige Cookies sind
              für den Betrieb erforderlich. Optionale Cookies helfen uns z.&nbsp;B.
              bei Reichweitenmessung und Marketing. Wir verkaufen deine Daten
              nicht und setzen keine Drittanbieter-Tracking-Tools ohne deine
              Einwilligung ein.
            </p>

            <ul className={styles.pointsList}>
              <li>✔ Betrieb &amp; Sicherheit der Plattform (Login, Warenkorb, Session)</li>
              <li>✔ Zahlungsabwicklung über Stripe (verschlüsselte &amp; zertifizierte Zahlung)</li>
              <li>✔ Optionale Analyse &amp; Marketing nur mit deiner ausdrücklichen Einwilligung</li>
            </ul>

            <p className={styles.smallNote}>
              Zahlungen werden über unseren Zahlungsdienstleister Stripe
              abgewickelt. Stripe ist nach gängigen Sicherheitsstandards
              (z.&nbsp;B. PCI-DSS) zertifiziert.
            </p>

            <p className={styles.linkLine}>
              Mehr Infos findest du in unserer{" "}
              <a href="/datenschutz" className={styles.link}>
                Datenschutzerklärung
              </a>{" "}
              und unserem{" "}
              <a href="/impressum" className={styles.link}>
                Impressum
              </a>
              .
            </p>

            <p className={styles.metaLine}>
              Rechtsgrundlage: Art. 6 Abs. 1 lit. a und f DSGVO · Stand: 11/2025
            </p>
          </div>

          {showSettings && (
            <div className={styles.settingsBox}>
              <h3 className={styles.settingsTitle}>Individuelle Einstellungen</h3>

              <div className={styles.settingsRow}>
                <div className={styles.settingsLabel}>
                  <span className={styles.settingsName}>Notwendige Cookies</span>
                  <span className={styles.settingsTag}>immer aktiv</span>
                </div>
                <p className={styles.settingsText}>
                  Diese Cookies sind erforderlich, damit Basisfunktionen wie
                  Anmeldung, Warenkorb oder Sicherheitsfunktionen korrekt
                  funktionieren.
                </p>
                <label className={styles.switchRow}>
                  <input type="checkbox" checked disabled />
                  <span className={styles.switchLabel}>Aktiv</span>
                </label>
              </div>

              <div className={styles.settingsRow}>
                <div className={styles.settingsLabel}>
                  <span className={styles.settingsName}>Marketing &amp; Analyse</span>
                </div>
                <p className={styles.settingsText}>
                  Diese Cookies ermöglichen uns z.&nbsp;B. Statistiken zur
                  Seitennutzung und personalisierte Inhalte oder Angebote.
                </p>
                <label className={styles.switchRow}>
                  <input
                    type="checkbox"
                    checked={marketingAllowed}
                    onChange={(e) => setMarketingAllowed(e.target.checked)}
                  />
                  <span className={styles.switchLabel}>
                    {marketingAllowed ? "Aktiv" : "Deaktiviert"}
                  </span>
                </label>
              </div>

              <button className={styles.btnPrimaryFull} onClick={saveSettings}>
                Auswahl speichern
              </button>
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => setShowSettings((v) => !v)}
            >
              {showSettings ? "Einstellungen ausblenden" : "Cookie-Einstellungen"}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={acceptNecessary}
            >
              Nur notwendige Cookies
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={acceptAll}
            >
              Alle akzeptieren
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default CookieBanner;
