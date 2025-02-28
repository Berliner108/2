import React from 'react';
import Link from 'next/link';
import styles from './login.module.css'; // Importiere die CSS-Datei
import Image from "next/image";


const Login = () => {
  return (
    <div className={styles.loginContainer}>
      {/* Linker Container für das Bild */}
      <div className={styles.leftContainer}>
      <Image
        src="/images/signup.jpg"
        alt="Beschreibung"
        layout="fill"
        objectFit="cover"/>
      </div>
      
      {/* Rechter Container für das Login-Formular */}
      <div className={styles.rightContainer}>
        <form className={styles.loginForm}>
          <h1>Willkommen zurück!</h1>
          <h2>Login</h2>

          <div className={styles.inputContainer}>
            <label htmlFor="email">Benutzername oder E-Mail</label>
            <input type="email" id="email" placeholder="Benutzername oder E-Mail eingeben" />
          </div>

          <div className={styles.inputContainer}>
            <label htmlFor="password">Passwort</label>
            <input type="password" id="password" placeholder="Passwort eingeben" />
          </div>

          {/* Passwort vergessen Link */}
          <div className={styles.forgotPassword}>
            <Link href="/reset-password">Passwort vergessen?</Link>
          </div>

          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
