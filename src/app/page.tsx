'use client'
// /src/app/components/Navbar.tsx
import { useState } from 'react';
import styles from '../styles/Home.module.css';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toggle-Funktion für das Hamburger-Menü
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContainer}>
        <button className={styles.hamburger} onClick={toggleMobileMenu}>
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
        </button>

        <ul className={`${styles.navList} ${isMobileMenuOpen ? styles.active : ''}`}>
          <li className={styles.navItem}>
            <a href="/" className={styles.navButton}>Home</a>
          </li>
          <li className={styles.navItem}>
            <a href="/about" className={styles.navButton}>About</a>
          </li>
          <li className={styles.navItem}>
            <a href="/services" className={styles.navButton}>Services</a>
          </li>
          <li className={styles.navItem}>
            <a href="/contact" className={styles.navButton}>Contact</a>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
