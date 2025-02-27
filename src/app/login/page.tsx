import React from 'react';
import styles from './login.module.css'; // Importiere die CSS-Datei

const Login = () => {
  return (
    <div className={styles.loginContainer}>
      {/* Linker Container für das Bild */}
      <div className={styles.leftContainer}>
        <img src="/images/signup.jpg" alt="Login Image" className={styles.image} />
      </div>

      {/* Rechter Container für das Login-Formular */}
      <div className={styles.rightContainer}>
        <form className={styles.loginForm}>
          <h2>Login</h2>

          <div className={styles.inputContainer}>
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="Email" />
          </div>

          <div className={styles.inputContainer}>
            <label htmlFor="password">Password</label>
            <input type="password" id="password" placeholder="Password" />
          </div>

          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
