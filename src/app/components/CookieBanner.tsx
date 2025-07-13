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
    localStorage.setItem("cookieConsent", JSON.stringify({ necessary: true, marketing: true }));
    setShowBanner(false);
  };

  const acceptNecessary = () => {
    localStorage.setItem("cookieConsent", JSON.stringify({ necessary: true, marketing: false }));
    setShowBanner(false);
  };

  const saveSettings = () => {
    localStorage.setItem("cookieConsent", JSON.stringify({ necessary: true, marketing: marketingAllowed }));
    setShowBanner(false);
  };

  return (
    showBanner && (
      <div className={styles.banner}>
        <div className={styles.text}>
          <strong>Wir verwenden Cookies</strong>
          <p>
            Um unsere Website für dich optimal zu gestalten und fortlaufend verbessern zu können,
            verwenden wir Cookies. Einige Cookies sind technisch notwendig (z. B. für den Warenkorb),
            während andere uns helfen, unser Onlineangebot zu verbessern und wirtschaftlich zu betreiben.
            Du kannst selbst entscheiden, welche Kategorien du zulässt.
          </p>
        </div>

        {showSettings && (
          <div className={styles.settingsBox}>
            <label>
              <input type="checkbox" checked disabled /> Notwendige Cookies (immer aktiv)
            </label>
            <label>
              <input
                type="checkbox"
                checked={marketingAllowed}
                onChange={(e) => setMarketingAllowed(e.target.checked)}
              />
              Marketing & Analyse Cookies
            </label>
            <button className={styles.btnPrimary} onClick={saveSettings}>
              Auswahl speichern
            </button>
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={() => setShowSettings(!showSettings)}>
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
