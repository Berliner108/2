'use client';

import React, { useState } from 'react';
import styles from './kontakt.module.css'; // Korrekte relative Pfad zu kontakt.module.css

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '', // Neues Feld für Betreff/Inhalt
    message: '',
    agreeToPrivacy: false // Checkbox für die Datenschutzerklärung
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value // Checkbox-Logik
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData); // Hier kannst du die Logik für den Submit-Prozess hinzufügen
  };

  return (
    <main className={styles.main}> {/* Das 'main' von kontakt.module.css anwenden */}
      <div className={styles.contactInfoContainer}>
        <div className={styles.contactInfo}>
          <h2 className={styles.title}>Kontakt</h2>
          <p className={styles.description}>Bitte beachten Sie, dass wir nicht der Verkäufer oder Dienstleister der Aufträge sind und daher keine Fragen zu einzelnen Angeboten beantworten können. Bei Fragen zu einem bestimmten Inserat wenden Sie sich bitte direkt an den Verkäufer. Die entsprechenden Kontaktmöglichkeiten finden Sie bei jedem Inserat in der rechten Randspalte.</p>
          <h2 className={styles.title}>Ihre Frage oder Anmerkung</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <label htmlFor="name" className={styles.label}>Name</label>
            <input
              className={styles.inputField}
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            <label htmlFor="email" className={styles.label}>E-Mail</label>
            <input
              className={styles.inputField}
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
            <label htmlFor="subject" className={styles.label}>Betreff / Inserat</label>
            <input
              className={styles.inputField}
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
            />
            <label htmlFor="message" className={styles.label}>Nachricht</label>
            <textarea
              className={styles.textareaField}
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
            />
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                id="agreeToPrivacy"
                name="agreeToPrivacy"
                checked={formData.agreeToPrivacy}
                onChange={handleChange}
              />
              <label htmlFor="agreeToPrivacy" className={styles.label}>
                Ja, ich habe die <a href="/datenschutz">Datenschutzerklärung</a> gelesen und bin damit einverstanden
              </label>
            </div>
            <button className={styles.button} type="submit" disabled={!formData.agreeToPrivacy}>Absenden</button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default ContactPage;
