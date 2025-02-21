'use client';

import { useState } from 'react';
import styles from './kontakt.module.css';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    gdpr: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    // Wenn es sich um ein Checkbox-Element handelt, verwenden wir 'checked', andernfalls 'value'
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement; // explizit Typ auf HTMLInputElement setzen
      setFormData({
        ...formData,
        [name]: checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
    // Hier kannst du die Logik zum Senden des Formulars einfügen
  };

  return (
    <main className={styles.main}>
      <div className={styles.contactInfoContainer}>
        <div className={styles.contactInfo}>
          <h1 className={styles.title}>Kontaktformular</h1>
          <p className={styles.description}>
           Bitte beachten Sie, dass wir nicht der Verkäufer oder Dienstleister der Aufträge sind und daher 
           keine Fragen zu einzelnen Angeboten beantworten können. Bei Fragen zu einem bestimmten Inserat 
           wenden Sie sich bitte direkt an den Verkäufer. Die entsprechenden Kontaktmöglichkeiten finden 
           Sie bei jedem Inserat in der rechten Randspalte.
          </p>
          <h2 className={styles.title2}>Ihre Frage oder Anmerkung</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="subject" className={styles.label}>Betreff / Inserat:</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className={styles.inputField}
              required
            />
            <label htmlFor="email" className={styles.label}>E-Mail:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={styles.inputField}
              required
            />
            
            <label htmlFor="name" className={styles.label}>Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={styles.inputField}
              required
            />
            <label htmlFor="message" className={styles.label}>Nachricht:</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              className={styles.textareaField}
              required
            />
            <div className={styles.checkboxContainer}>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  name="gdpr"
                  checked={formData.gdpr}
                  onChange={handleChange}
                />
                Ja, ich habe die <a href="/datenschutz">Datenschutzerklärung</a> gelesen und bin damit einverstanden.
              </label>
            </div>
            <button type="submit" className={styles.button}>Absenden</button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default ContactPage;
