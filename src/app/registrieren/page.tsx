'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './register.module.css'; // Importiere die CSS-Datei

const Register = () => {
  const [userType, setUserType] = useState<'private' | 'business'>('private');

  const handleUserTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserType(event.target.value as 'private' | 'business');
  };

  return (
    <div className={styles.registerContainer}>
      {/* Linker Container für das Bild */}
      <div className={styles.leftContainer}>
        <img src="/images/signup.jpg" alt="Register Image" className={styles.image} />
      </div>

      {/* Rechter Container für das Registrierungs-Formular */}
      <div className={styles.rightContainer}>
        <form className={styles.registerForm}>
          <h1>Registrieren</h1>
          <h2>Erstelle dein Konto</h2>

          {/* Auswahl für gewerblich oder privat */}
          <div className={styles.inputContainer}>
            <label>Registrierung als</label>
            <div>
              <label>
                <input
                  type="radio"
                  name="userType"
                  value="private"
                  checked={userType === 'private'}
                  onChange={handleUserTypeChange}
                />
                Privatperson
              </label>
              <label>
                <input
                  type="radio"
                  name="userType"
                  value="business"
                  checked={userType === 'business'}
                  onChange={handleUserTypeChange}
                />
                Gewerblich
              </label>
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
            <Link href="/login">Bereits ein Konto? Zum Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
