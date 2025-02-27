import React from 'react';
import Link from 'next/link';
import styles from './resetpassword.module.css'; // Importiere die CSS-Datei

const ResetPassword = () => {
  return (
    <div className={styles.resetPasswordContainer}>
      {/* Linker Container für das Bild */}
      <div className={styles.leftContainer}>
        <img src="/images/solution.jpg" alt="Reset Password Image" className={styles.image} />
      </div>

      {/* Rechter Container für das Reset-Formular */}
      <div className={styles.rightContainer}>
        <form className={styles.resetForm}>
          <h1>Passwort zurücksetzen</h1>
          <h2>Gib deine E-Mail-Adresse ein</h2>

          <div className={styles.inputContainer}>
            <label htmlFor="email">E-Mail</label>
            <input type="email" id="email" placeholder="E-Mail-Adresse eingeben" />
          </div>

          <button type="submit">Passwort zurücksetzen</button>

          {/* Link zurück zum Login */}
          <div className={styles.backToLogin}>
            <Link href="/login">Zurück zum Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
