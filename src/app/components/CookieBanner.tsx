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
      {/* Blockiert Klicks auf die Seite, aber nicht den Scroll */}
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
              Wir nutzen Cookies, um unsere Website zuverlässig zu betreiben und unser Angebot
              zu verbessern. Technisch notwendige Cookies sind für den Betrieb erforderlich,
              z.&nbsp;B. für Login, Warenkorb und Sicherheitsfunktionen.
            </p>
            <p className={styles.description}>
              Für die Zahlungsabwicklung setzen wir den Dienstleister{" "}
              <strong>Stripe</strong> ein. Dabei können technisch notwendige Cookies von Stripe
              gesetzt werden, um Zahlungen sicher zu verarbeiten.
            </p>
            <p className={styles.description}>
              Optionale Cookies nutzen wir für{" "}
              <strong>Statistik, Reichweitenmessung und Marketing</strong>. Du kannst selbst
              entscheiden, welche Kategorien du zulässt.
            </p>
            <p className={styles.linkLine}>
              Weitere Informationen findest du in unserer{" "}
              <a href="/datenschutz" className={styles.link}>
                Datenschutzerklärung
              </a>
              .
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
                  Diese Cookies sind erforderlich, damit Basisfunktionen wie Anmeldung,
                  Warenkorb, Sicherheitsfunktionen und die Zahlungsabwicklung über Stripe
                  korrekt funktionieren.
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
                  Diese Cookies helfen uns, die Nutzung unserer Seiten zu verstehen und
                  unser Angebot zu verbessern, z.&nbsp;B. durch Statistiken und
                  personalisierte Inhalte.
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
