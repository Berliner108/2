'use client';

import { useState, useEffect } from 'react';
import styles from './kontakt.module.css';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    gdpr: false,
  });

  const [shakeGDPR, setShakeGDPR] = useState(false);

  useEffect(() => {
    if (shakeGDPR) {
      const timer = setTimeout(() => setShakeGDPR(false), 300);
      return () => clearTimeout(timer);
    }
  }, [shakeGDPR]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const allowedTLDs = ['.de', '.com', '.net', '.org', '.at', '.ch', '.info', '.eu', '.io'];
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
    const emailValid = allowedTLDs.some((tld) =>
      formData.email.toLowerCase().endsWith(tld)
    );

    if (!emailValid && emailInput) {
      emailInput.setCustomValidity("Die E-Mail-Adresse muss auf eine gültige Endung wie .com, .de, .at, .ch etc. enden.");
      emailInput.reportValidity();
      return;
    } else {
      emailInput.setCustomValidity('');
    }

    if (!formData.gdpr) {
  const gdprBox = document.getElementById("gdprContainer");
  if (gdprBox) {
    gdprBox.classList.add(styles.shake); // hinzufügen
    setTimeout(() => {
      gdprBox.classList.remove(styles.shake); // nach 300ms wieder entfernen
    }, 300);
  }
  return;
}


    const mailtoLink = `mailto:support@deinefirma.com?subject=${encodeURIComponent(
      formData.subject
    )}&body=${encodeURIComponent(
      `Name: ${formData.name}\nE-Mail: ${formData.email}\n\nNachricht:\n${formData.message}`
    )}`;
    window.location.href = mailtoLink;
  };

  return (
    <main className={styles.main}>
      <div className={styles.contactInfoContainer}>
        <div className={styles.contactInfo}>
          <h1 className={styles.title}>Kontaktformular</h1>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>Betreff / Inserat:</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className={styles.inputField}
              required
            />

            <label className={styles.label}>E-Mail:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={styles.inputField}
              required
              title="Bitte gib eine gültige E-Mail-Adresse ein."
            />

            <label className={styles.label}>Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={styles.inputField}
              required
              pattern="^[^\d]+$"
              title="Der Name darf keine Zahlen enthalten."
            />

            <label className={styles.label}>Nachricht:</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              maxLength={800}
              className={styles.textareaField}
              required
            />
            <small>{formData.message.length}/800 Zeichen</small>

            <div
  className={styles.checkboxContainer}
  id="gdprContainer"
>
  <label className={styles.label}>
    <input
      type="checkbox"
      name="gdpr"
      checked={formData.gdpr}
      onChange={handleChange}
      className={styles.checkbox}
      required
      title="Bitte akzeptiere die Datenschutzerklärung."
    />
    Ja, ich habe die <a href="/datenschutz">Datenschutzerklärung</a> gelesen und bin damit einverstanden.
  </label>
</div>



            <div className={styles.buttonContainer}>
              <button type="submit" className={styles.button}>
                <b>Absenden</b>
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default ContactPage;
