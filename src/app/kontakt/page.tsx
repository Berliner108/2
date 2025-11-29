'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './kontakt.module.css';

interface FormDataState {
  name: string;
  email: string;
  subject: string;
  message: string;
  gdpr: boolean;
}

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState<FormDataState>({
    name: '',
    email: '',
    subject: '',
    message: '',
    gdpr: false,
  });

  const [shakeGDPR, setShakeGDPR] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!shakeGDPR) return;
    const timer = setTimeout(() => setShakeGDPR(false), 300);
    return () => clearTimeout(timer);
  }, [shakeGDPR]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (name === 'email') {
      setEmailError(false);
      if (emailRef.current) {
        emailRef.current.setCustomValidity('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setSendSuccess(null);
    setSendError(null);

    // E-Mail-TLD-Prüfung
    const allowedTLDs = ['.de', '.com', '.net', '.org', '.at', '.ch', '.info', '.eu', '.io'];
    const emailLower = formData.email.toLowerCase();
    const emailValid = allowedTLDs.some((tld) => emailLower.endsWith(tld));

    if (!emailValid && emailRef.current) {
      setEmailError(true);
      emailRef.current.setCustomValidity(
        'Die E-Mail-Adresse muss auf eine gültige Endung wie .com, .de, .at, .ch etc. enden.'
      );
      emailRef.current.reportValidity();
      return;
    } else if (emailRef.current) {
      emailRef.current.setCustomValidity('');
      setEmailError(false);
    }

    // DSGVO-Checkbox prüfen
    if (!formData.gdpr) {
      setShakeGDPR(true);
      return;
    }

    try {
      setIsSending(true);

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          gdpr: formData.gdpr,   // <-- diese Zeile ergänzen
        }),
      });

      if (res.status === 429) {
        setSendError(
          'Das Kontaktlimit für heute wurde erreicht. Bitte versuche es später erneut.'
        );
        return;
      }

      if (!res.ok) {
        setSendError(
          'Es ist ein Fehler beim Senden aufgetreten. Bitte versuche es später erneut.'
        );
        return;
      }

      setSendSuccess('Deine Nachricht wurde erfolgreich versendet.');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        gdpr: false,
      });
    } catch (error) {
      console.error(error);
      setSendError(
        'Es ist ein Fehler beim Senden aufgetreten. Bitte versuche es später erneut.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.contactInfoContainer}>
        <div className={styles.contactInfo}>
          <h1 className={styles.title}>Kontaktformular</h1>
          <p className={styles.requiredHint}>* Alle Felder sind Pflichtfelder.</p>


          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              Betreff / Inserat<span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className={styles.inputField}
              required
            />

            <label className={styles.label}>
              E-Mail<span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              name="email"
              ref={emailRef}
              value={formData.email}
              onChange={handleChange}
              className={`${styles.inputField} ${
                emailError ? styles.inputFieldError : ''
              }`}
              required
              title="Bitte gib eine gültige E-Mail-Adresse ein."
            />

            <label className={styles.label}>
              Name<span className={styles.required}>*</span>
            </label>
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

            <label className={styles.label}>
              Nachricht<span className={styles.required}>*</span>
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              maxLength={800}
              className={styles.textareaField}
              required
              placeholder="Bitte beachte, dass wir weder Verkäufer noch Beschichter sind und somit keine Auskünfte zu bestimmten Artikeln oder Dienstleistungen von Beschichtern geben können. Nutze dafür unsere Möglichkeit direkt mit dem Verkäufer oder Beschichter im Chat zu kommunizieren."
            />
            <small>{formData.message.length}/800 Zeichen</small>

            <div
              id="gdprContainer"
              className={`${styles.checkboxContainer} ${
                !formData.gdpr && shakeGDPR ? styles.shake : ''
              }`}
            >
              <label className={styles.label}>
                <input
                  type="checkbox"
                  name="gdpr"
                  checked={formData.gdpr}
                  onChange={handleChange}
                  className={styles.checkbox}
                  title="Bitte akzeptiere die Datenschutzerklärung."
                />
                Ja, ich habe die{' '}
                <a href="/datenschutz" target="_blank" rel="noopener noreferrer">
                  Datenschutzerklärung
                </a>{' '}
                gelesen und bin damit einverstanden.
                <span className={styles.required}>*</span>
              </label>
            </div>

            <div className={styles.buttonContainer}>
              <button
                type="submit"
                className={styles.button}
                disabled={isSending}
              >
                <b>{isSending ? 'Senden ...' : 'Absenden'}</b>
              </button>
            </div>

            {sendSuccess && <p className={styles.success}>{sendSuccess}</p>}
            {sendError && <p className={styles.error}>{sendError}</p>}
          </form>
        </div>
      </div>
    </main>
  );
};

export default ContactPage;
