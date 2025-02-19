'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import '../styles/header.css';

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <header>
      <div className="header-container">
        {/* Logo + Text als Home-Link */}
        <Link href="/" className="home-link">
          <div className="logo-container">
            <svg width="118" height="80" viewBox="0 0 180 80" xmlns="http://www.w3.org/2000/svg">
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

        {/* Desktop Nav Links */}
        <div className="nav-links desktop">
          <ul>
            <li>
              <Link href="/login">Login</Link>
            </li>
            <li>
              <Link href="/register">Registrieren</Link>
            </li>
          </ul>
        </div>

        {/* Hamburger Menu Button */}
        <button className="menu-button" onClick={toggleMenu}>
          <b>☰</b>
        </button>
      </div>

      {/* Hamburger Menu für mobile Ansicht */}
      {menuOpen && (
        <div className="nav-links mobile">
          <ul>
            <li>
              <Link href="/login">Login</Link>
            </li>
            <li>
              <Link href="/register">Registrieren</Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default Header;
