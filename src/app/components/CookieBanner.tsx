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

  // 🔒 Scroll und Interaktion mit dem Body blocken, solange Banner offen ist
  useEffect(() => {
    if (!showBanner) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showBanner]);

  const acceptAll = () => {
    localStorage.setItem(
      "cookieConsent",
      JSON.stringify({ necessary: true, marketing: true }),
    );
    setShowBanner(false);
  };

  const acceptNecessary = () => {
    localStorage.setItem(
      "cookieConsent",
      JSON.stringify({ necessary: true, marketing: false }),
    );
    setShowBanner(false);
  };

  const saveSettings = () => {
    localStorage.setItem(
      "cookieConsent",
      JSON.stringify({ necessary: true, marketing: marketingAllowed }),
    );
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className={styles.backdrop}>
      <div
        className={styles.banner}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-title"
      >
        <div className={styles.text}>
          <strong id="cookie-title">Wir verwenden Cookies</strong>
          <p>
            Um unsere Website für dich optimal zu gestalten und fortlaufend
            verbessern zu können, verwenden wir Cookies. Einige Cookies sind
            technisch notwendig (z. B. für den Warenkorb), während andere uns
            helfen, unser Onlineangebot zu verbessern und wirtschaftlich zu
            betreiben. Du kannst selbst entscheiden, welche Kategorien du
            zulässt.
          </p>
          <p>
            Zahlungsabwicklungen (z.&nbsp;B. über Stripe) und sicherheitsrelevante
            Funktionen können ebenfalls Cookies oder ähnliche Technologien
            einsetzen.
          </p>
        </div>

        {showSettings && (
          <div className={styles.settingsBox}>
            <label>
              <input type="checkbox" checked disabled /> Notwendige Cookies
              (immer aktiv)
            </label>
            <label>
              <input
                type="checkbox"
                checked={marketingAllowed}
                onChange={(e) => setMarketingAllowed(e.target.checked)}
              />
              Marketing &amp; Analyse Cookies
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
    </div>
  );
};

export default CookieBanner;
