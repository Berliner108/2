// src/app/Header.tsx
import React from 'react';
import '../styles/header.css'; // CSS-Datei für den Header importieren

const Header = () => {
  return (
    <header className="header">
      {/* Linke Seite: Logo + "Mein Shop" */}
      <div className="header-left">
        <div className="logo-container">
          {/* SVG Logo */}
          <svg width="138" height="80" viewBox="0 0 180 80" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M10,40 Q90,60 170,40" 
              fill="none" 
              stroke="url(#turquoiseGradient)" 
              strokeWidth="50" 
              strokeLinecap="round" />
            <defs>
              <linearGradient id="turquoiseGradient" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" style={{ stopColor: '#00e5ff', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#00b4d8', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>

          {/* Text "Mein Shop" */}
          <span className="shop-title">
            <span className="shop-black">Beschichter S</span> 
            <span className="shop-white">cout</span>
          </span>
        </div>
      </div>

      {/* Mittiger Text */}
      <div className="header-center">
        <span className="header-text">Die Nr.1 Plattform für Oberflächentechnik</span>
      </div>

      {/* Rechte Seite: Login & Registrieren */}
      <div className="header-right">
        <a href="/login" className="header-button">Login</a>
        <a href="/register" className="header-button">Registrieren</a>
      </div>
    </header>
  );
};

export default Header;
