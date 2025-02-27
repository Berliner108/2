'use client';

import React, { useState } from 'react';
import styles from './register.module.css'; // Importiere die CSS-Datei

const Register = () => {
  const [userType, setUserType] = useState<'private' | 'business'>('private');

  const handleSliderClick = () => {
    setUserType(userType === 'private' ? 'business' : 'private');
  };

  return (
    <div className={styles.registerContainer}>
      {/* Linker Container für das Bild */}
      <div className={styles.leftContainer}>
        <img src="/images/anmelden.jpg" alt="Register Image" className={styles.image} />
      </div>

      {/* Rechter Container für das Registrierungs-Formular */}
      <div className={styles.rightContainer}>
        <form className={styles.registerForm}>
          <h1>Jetzt kostenlos registrieren!</h1>
          <h2>Erstelle dein Konto</h2>

          {/* Schalter für gewerblich oder privat */}
          <div className={styles.inputContainer}>
            <label>Registrierung als</label>
            <div className={styles.sliderContainer} onClick={handleSliderClick}>
              <div
                className={styles.slider}
                style={{
                  left: userType === 'business' ? '50%' : '0', // Position des Sliders abhängig vom Zustand
                }}
              />
              <div className={styles.sliderLabelLeft}>Gewerblich</div>
              <div className={styles.sliderLabelRight}>Privatperson</div>
            </div>
          </div>

          {/* Eingabefelder für Benutzername und E-Mail */}
          <div className={styles.inputContainer}>
            <label htmlFor="username">Benutzername</label>
            <input type="text" id="username" placeholder="Benutzername eingeben" />
          </div>

          <div className={styles.inputContainer}>
            <label htmlFor="email">E-Mail</label>
            <input type="email" id="email" placeholder="E-Mail-Adresse eingeben" />
          </div>

          <div className={styles.inputContainer}>
            <label htmlFor="password">Passwort</label>
            <input type="password" id="password" placeholder="Passwort eingeben" />
          </div>

          <div className={styles.inputContainer}>
            <label htmlFor="confirmPassword">Passwort bestätigen</label>
            <input type="password" id="confirmPassword" placeholder="Passwort bestätigen" />
          </div>

          {/* Zusatzfelder für gewerbliche Nutzer */}
          {userType === 'business' && (
            <div>
              <div className={styles.inputContainer}>
                <label htmlFor="companyName">Firmenname</label>
                <input type="text" id="companyName" placeholder="Firmenname eingeben" />
              </div>

              <div className={styles.inputContainer}>
                <label htmlFor="businessEmail">Geschäfts-E-Mail</label>
                <input type="email" id="businessEmail" placeholder="Geschäfts-E-Mail eingeben" />
              </div>
            </div>
          )}

          <button type="submit">Registrieren</button>

          {/* Link zurück zum Login */}
          <div className={styles.backToLogin}>
            <a href="/login">Bereits ein Konto? Zum Login</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
