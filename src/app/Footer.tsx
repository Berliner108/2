'use client'; // Damit useEffect und andere Client-only Hooks verwendet werden können
import React, { useState, useEffect } from 'react';
import { FaFacebook, FaLinkedin, FaInstagram, FaTwitter, FaTiktok, FaYoutube, FaXing } from 'react-icons/fa'; // Importiere Icons von react-icons
import '../styles/layout.css'; // Importiere die bestehende layout.css-Datei

const Footer = () => {
    const comments = [
      "Beste Qualität garantiert!",
      "Kostenloser Versand ab 50€",
      "Kundenzufriedenheit steht an erster Stelle",
      "Sichere Zahlung mit SSL-Verschlüsselung",
      "Über 10.000 zufriedene Kunden!",
    ];
  
    const [currentComment, setCurrentComment] = useState(comments[0]);
    const [fade, setFade] = useState(true); // Steuert die Animation
  
    useEffect(() => {
      const interval = setInterval(() => {
        setFade(false); // Startet das Ausblenden
  
        setTimeout(() => {
          setCurrentComment((prevComment) => {
            const nextIndex = (comments.indexOf(prevComment) + 1) % comments.length;
            return comments[nextIndex];
          });
          setFade(true); // Startet das Einblenden
        }, 500); // Verzögerung vor dem neuen Kommentar
      }, 4000);
  
      return () => clearInterval(interval);
    }, []);
  
    return (
        <footer className="footer">
        {/* Linke Spalte: Kommentare */}
        <div className="column">
          <h3>Kommentare</h3>
          <p className={`comment ${fade ? "fade-in" : "fade-out"}`}>{currentComment}</p>
        </div>
  
        {/* Mittlere Spalte: Links & Social Media */}
        <div className="column1">
          <h3>Informationen</h3>
          <ul>
            <li><a href="/impressum">Impressum</a></li>
            <li><a href="/kontakt">Kontakt</a></li>
            <li><a href="/agb">AGB</a></li>
          </ul>
        
        <div className="socialLinks">
          <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">
            <FaFacebook size={30} />
          </a>
          <a href="https://www.xing.com" target="_blank" rel="noopener noreferrer">
            <FaXing size={30} />
          </a>
          <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer">
            <FaLinkedin size={30} />
          </a>
          <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer">
            <FaTiktok size={30} />
          </a>
          <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer">
            <FaYoutube size={30} />
          </a>
          <a href="https://www.twitter.com" target="_blank" rel="noopener noreferrer">
            <FaTwitter size={30} />
          </a>
          <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
            <FaInstagram size={30} />
          </a>
          
        </div>
      </div>
      <div className="column1">
        <h2>Mehr</h2>
        {/* Hier kannst du zusätzliche Inhalte hinzufügen */}
      </div>
    </footer>
  );
};

export default Footer;
