'use client'; // Client-only Hook
import React, { useState, useEffect, useMemo } from 'react'; // useMemo importiert
import { FaFacebook, FaLinkedin, FaTwitter, FaXing, FaPinterest } from 'react-icons/fa'; // Importiere Icons von react-icons
import '../styles/layout.css'; // Importiere die bestehende layout.css-Datei
import Link from 'next/link'; // Hier importierst du Link von Next.js
import Image from 'next/image';


const Footer = () => {
  // Verwende useMemo, um das 'comments' Array nur einmal zu erstellen
  const comments = useMemo(() => [
    "Endlich alle Arbeitsmittel für Beschichter aus einer Hand - Erstklassig!",
    "Tolles Portal! Endlich kann ich mühelos Angebote einholen und vergleichen.",
    "Unsere Aufträge konnten wir mit Beschichter Scout fast verdoppeln.",
    "Sehr zufrieden mit dem Service und der intuitiven Gestaltung der Plattform.",
    "Mit Beschichter Scout sind wir bei Reklamationen nicht mehr auf uns alleine gestellt.",
    "Für meine wöchentlichen Serienaufträge konnte ich nun ein passendes Angebot finden.",
    "Ab jetzt bekommen wir Geld für unser Altpulver, statt es kostenpflichtig entsorgen zu müssen.",
    "Mit Beschichter Scout können wir unser Restpulver endlich revitalisieren!",
  ], []); // Das Array wird nur einmal erstellt und nicht bei jedem Rendern neu erzeugt

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
  }, [comments]); // Da comments jetzt stabil ist, brauchst du hier keine Veränderung

  return (
    <footer className="footer">
      {/* Linke Spalte: Kommentare */}
      <div className="column">
        <h3>Was unsere User sagen:</h3>
        <p className={`comment ${fade ? "fade-in" : "fade-out"}`}>{currentComment}</p>
      </div>
        
      {/* Mittlere Spalte: Links & Social Media */}
      <div className="column2">
        
        <ul>
          <li><Link href="/karriere"><b>Karriere</b></Link></li> {/* Der Link zur Karriere-Seite */}
          <li><Link href="/kontakt"><b>Kontakt</b></Link></li> {/* Der Link zur Kontakt-Seite */}
          <li><Link href="/datenschutz"><b>Datenschutz</b></Link></li> {/* Der Link zur Datenschutz-Seite */}
          <li><Link href="/cookies"><b>Cookie Richtlinie</b></Link></li> {/* Der Link zur Cookies-Seite */}
          <li><Link href="/impressum"><b>Impressum</b></Link></li> {/* Der Link zur Impressum-Seite */}
          <li><Link href="/agb"><b>AGB</b></Link></li> {/* Der Link zur AGB-Seite */}   
          
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
          <a href="https://www.pinterest.com" target="_blank" rel="noopener noreferrer">
            <FaPinterest size={30} />
          </a>          
          <a href="https://www.twitter.com" target="_blank" rel="noopener noreferrer">
            <FaTwitter size={30} />
          </a>
          
          
        </div>
        <p>© Beschichter Scout I Alle Rechte vorbehalten</p> 
      </div>

      <div className="column3">
  <h2>Unsere Zahlungsmöglichkeiten</h2>
  <Image
    src="/images/zahlungsm.png" // Pfad relativ zu /public
    alt="Zahlungsmöglichkeiten"
    width={280}
    height={90}
  />
  <h2>Unsere Partner</h2>
  <Image
    src="/images/Startup.png" // Pfad relativ zu /public
    alt="Zahlungsmöglichkeiten"
    width={160}
    height={50}
  />
  
  <Image
    src="/images/Logoweiss.png" // Pfad relativ zu /public
    alt="Zahlungsmöglichkeiten"
    width={150}
    height={55}
    style={{ marginLeft: '20px', marginTop: '10px' }}
    
  />
</div>

      
    </footer>
  );
};

export default Footer;
