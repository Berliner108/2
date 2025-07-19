'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '../styles/header.css';

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const [user, setUser] = useState<{ name: string } | null>(null);
const [firstName, setFirstName] = useState<string | null>(null);

useEffect(() => {
  const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      setUser(parsed);

      // Vorname extrahieren
      const first = parsed.name?.split(' ')[0];
      setFirstName(first);
    } catch {
      setUser(null);
      setFirstName(null);
    }
  }
}, []);
const handleLogout = () => {
  localStorage.removeItem('user');
  sessionStorage.removeItem('user');
  setUser(null);
  setFirstName(null);
  window.location.href = '/';
};


  return (
    <header>
      <div className="header-container">
        {/* Logo + Text als Home-Link */}
        <Link href="/" className="home-link">
          <div className="logo-container">
            <svg width="118" height="70" viewBox="0 0 180 80" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10,40 Q90,60 170,40" 
                fill="none" 
                stroke="url(#turquoiseGradient)" 
                strokeWidth="43" 
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="turquoiseGradient" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" style={{ stopColor: '#00e5ff', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#00b4d8', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
            </svg>

            {/* Text "Mein Shop" */}
            <div className="shop-title">
              <span className="black-text">Beschichter S</span>
              <span className="white-text">cout</span>
            </div>
          </div>

          {/* Mittelpositionierter Text als Teil des Links */}
          <div className="center-text">
            <span>Die Nr.1 Plattform für Oberflächentechnik</span>
          </div>
        </Link>

       <div className="nav-links desktop">
  <ul>
    {firstName ? (
      <>
        <li className="welcome-text">
  Hallo, <span className="name-highlight">{firstName}</span>
</li>


        <li>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </li>
      </>
    ) : (
      <>
        <li><Link href="/login" onClick={() => setMenuOpen(false)}>Login</Link></li>
        <li><Link href="/registrieren" onClick={() => setMenuOpen(false)}>Registrieren</Link></li>


      </>
    )}
  </ul>
</div>


        {/* Hamburger Menu Button */}
        <button className="menu-button" onClick={toggleMenu}>
            <div></div>
            <div></div>
            <div></div>
        </button>

      </div>
      {/* Full Width Bar (Nur Mobil) */}
      <div className="full-width-bar">
        Die Nr.1 Plattform für Oberflächentechnik
      </div>
      
      

      {/* Hamburger Menu für mobile Ansicht */}
      
 {menuOpen && <div className="mobile-overlay" onClick={toggleMenu}></div>}

  <div className={`nav-links mobile ${menuOpen ? 'open' : ''}`}>
  <ul>
    {firstName ? (
      <>
        <li className="welcome-text">Willkommen, {firstName}</li>
        <li>
  <button
    onClick={() => {
      handleLogout();
      setMenuOpen(false);
    }}
    className="logout-btn"
  >
    Logout
  </button>
</li>

      </>
    ) : (
      <>
        <li><Link href="/login">Login</Link></li>
        <li><Link href="/registrieren">Registrieren</Link></li>
      </>
    )}
  </ul>
</div>

)


    </header>
  );
};

export default Header;
