'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './registrieren.module.css';
import Image from 'next/image'; 

const Registrieren = () => {
  const [message, setMessage] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(message); // Hier kannst du später den Code zum Absenden der E-Mail einfügen
    setMessage('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Registrieren</h1>
      </div>
      
      {/* Bild einfügen */}
      <Image src="/images/signup.jpg" 
        alt="Registrierungsbild" 
        width={400} 
        height={300} 
      />
      
      <div className={styles.content}>
        <h2>So erreichst du uns</h2>
        <p>
          Du kannst uns per E-Mail oder Telefon erreichen. Wir freuen uns auf deine Nachricht.
        </p>
        
        {/* Kontaktformular */}
        <form onSubmit={handleSubmit}>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Schreibe deine Nachricht hier..." 
            className={styles.textarea}
            rows={5}
          />
          <button type="submit" className={styles.submitButton}>Absenden</button>
        </form>

        <Link href="/">Zurück zur Startseite</Link>
      </div>
      
      <footer className={styles.footer}>
        <p>&copy; 2025 Dein Unternehmen</p>
      </footer>
    </div>
  );
};

export default Registrieren;
