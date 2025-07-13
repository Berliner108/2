// /src/app/konto/einstellungen/page.tsx
'use client';  // Markiert diese Datei als Client Component

import { FC, useState, useEffect } from 'react';
import Pager from './../navbar/pager';  // Relativer Import für Pager
import styles from './einstellungen.module.css';  // Relativer Import für styles

const Einstellungen: FC = () => {
  const [username] = useState('MaxMustermann');  // Benutzername ist jetzt festgelegt und nicht änderbar
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null); // Zustand für das Bild
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false); // Zustand für die Löschbestätigung

  // Dummy-Daten für Bewertungen (mit Benutzer, Titel, Sterne und Kommentar)
  const [reviews, setReviews] = useState([
    { id: 1, username: 'JohnDoe', title: 'Toller Service', rating: 5, comment: 'Sehr zufrieden mit dem Produkt!' },
    { id: 2, username: 'JaneDoe', title: 'Gute Qualität', rating: 4, comment: 'Preis-Leistungs-Verhältnis ist gut.' },
    { id: 3, username: 'MaxMustermann', title: 'Schnelle Lieferung', rating: 5, comment: 'Das Produkt kam super schnell an!' },
  ]);

  // Berechnung des Durchschnitts
  const calculateAverageRating = () => {
    const totalRatings = reviews.reduce((acc, review) => acc + review.rating, 0);
    return reviews.length ? (totalRatings / reviews.length).toFixed(1) : 0;
  };

  // Funktion zum Speichern der Änderungen
  const handleSave = async () => {
    if (newPassword !== confirmPassword) {
      setError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }

    try {
      // Dummy-API-Aufruf für das Speichern der Daten (Benutzerdaten, Adresse und Zahlungsmethode)
      setSuccess('Änderungen erfolgreich gespeichert!');
    } catch (err) {
      setError('Fehler beim Speichern der Änderungen.');
    }
  };

  // Funktion zum Löschen des Kontos
  const handleDeleteAccount = async () => {
    if (deleteConfirm) {
      try {
        // API-Aufruf für das Löschen des Kontos (Dummy-Logik)
        setSuccess('Dein Konto wurde erfolgreich gelöscht.');
      } catch (err) {
        setError('Fehler beim Löschen des Kontos.');
      }
    } else {
      setError('Bitte bestätige, dass du dein Konto löschen möchtest.');
    }
  };

  // Funktion für den Bild-Upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vorschau des hochgeladenen Bildes
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file); // Liest das Bild als DataURL (Base64)
    }
  };

  return (
    <>
      <Pager />
      <div className={styles.wrapper}>
        <h2 className={styles.title}>Kontoeinstellungen</h2>
        <div className={styles.kontoContainer}>
          <p className={styles.description}>Bearbeite hier deine Benutzerdaten, Passwort, Benachrichtigungseinstellungen, dein Profilbild und deine Bewertungen.</p>

          {/* Fehlermeldung */}
          {error && <p className={styles.error}>{error}</p>}
          {/* Erfolgsnachricht */}
          {success && <p className={styles.success}>{success}</p>}

          <form onSubmit={(e) => e.preventDefault()} className={styles.form}>
            {/* Benutzername (nur anzeigen, nicht bearbeiten) */}
            <div className={styles.inputGroup}>
              <label>Benutzername</label>
              <input
                type="text"
                value={username}
                readOnly
                className={styles.inputReadonly}
              />
            </div>

            {/* Profilbild Upload */}
            <div className={styles.separator}></div>
            <h3 className={styles.subSectionTitle}>Profilbild</h3>
            <div className={styles.inputGroup}>
              <label htmlFor="profileImage">Profilbild hochladen</label>
              <input
                id="profileImage"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.input}
              />
              {/* Bildvorschau */}
              {imagePreview && (
                <div className={styles.imagePreview}>
                  <img src={imagePreview} alt="Profilbild Vorschau" className={styles.previewImage} />
                </div>
              )}
            </div>

            {/* E-Mail-Adresse */}
            <div className={styles.inputGroup}>
              <label htmlFor="email">E-Mail-Adresse</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-Mail"
                required
                className={styles.input}
              />
            </div>

            {/* Passwort ändern */}
            <div className={styles.inputGroup}>
              <label htmlFor="password">Aktuelles Passwort</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Aktuelles Passwort"
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="newPassword">Neues Passwort</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Neues Passwort"
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword">Neues Passwort bestätigen</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Bestätige neues Passwort"
                className={styles.input}
              />
            </div>

            {/* Zahlungsdetails */}
            <div className={styles.separator}></div>
            <h3 className={styles.subSectionTitle}>Zahlungsdetails</h3>
            <div className={styles.inputGroup}>
              <label htmlFor="paymentMethod">Zahlungsmethode</label>
              <input
                id="paymentMethod"
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="Kreditkarte / PayPal"
                className={styles.input}
              />
            </div>

            {/* Anschrift */}
            <div className={styles.separator}></div>
            <h3 className={styles.subSectionTitle}>Anschrift</h3>
            <div className={styles.inputGroup}>
              <label htmlFor="address">Straße und Hausnummer</label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Straße und Hausnummer"
                className={styles.input}
              />
            </div>

            {/* Bewertungen des Benutzers */}
            <div className={styles.separator}></div>
            <h3 className={styles.subSectionTitle}>
              Deine Bewertungen ({reviews.length}) - Durchschnitt: {calculateAverageRating()} Sterne
            </h3>
            <div className={styles.reviews}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewItem}>
                  <h4>{review.username} - {review.title} ({review.rating} Sterne)</h4>
                  <p>{review.comment}</p>
                </div>
              ))}
            </div>

            {/* Speichern Button */}
            <button type="button" onClick={handleSave} className={styles.saveButton}>
              Speichern
            </button>

            {/* Konto löschen */}
            <div className={styles.separator}></div>
            <h3 className={styles.subSectionTitle}>Konto löschen</h3>
            <p className={styles.deleteConfirmationText}>
              Wenn du dein Konto löschst, werden alle deine Daten dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.
            </p>
            <label htmlFor="deleteConfirm">
              <input
                id="deleteConfirm"
                type="checkbox"
                checked={deleteConfirm}
                onChange={() => setDeleteConfirm(!deleteConfirm)}
              />
              Ich bestätige, dass ich mein Konto löschen möchte.
            </label>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className={styles.deleteButton}
              disabled={!deleteConfirm}
            >
              Konto löschen
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Einstellungen;
