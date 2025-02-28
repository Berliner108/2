"use client";

import React, { useState } from "react";
import styles from "./register.module.css";
import Image from "next/image";

const Register = () => {
  const [isPrivatePerson, setIsPrivatePerson] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    vatNumber: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Eingabe-Handler für alle Felder
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Validierungsfunktion
  const validate = () => {
    const newErrors: { [key: string]: string } = {}; // Ändere von let zu const

    // Überprüfe, ob die Felder ausgefüllt sind und ob sie gültig sind
    if (!formData.fullName.trim()) newErrors.fullName = "Name ist erforderlich.";
    if (!formData.email.includes("@")) newErrors.email = "Gültige E-Mail-Adresse erforderlich.";
    if (formData.password.length < 6) newErrors.password = "Passwort muss mind. 6 Zeichen haben.";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwörter stimmen nicht überein.";

    // Zusätzliche Validierung für gewerbliche Nutzer
    if (!isPrivatePerson) {
      if (!formData.companyName.trim()) newErrors.companyName = "Firmenname ist erforderlich.";
      if (!formData.vatNumber.trim()) newErrors.vatNumber = "Umsatzsteuer-ID ist erforderlich.";
    }

    setErrors(newErrors); // Fehler setzen
    return Object.keys(newErrors).length === 0; // Rückgabe, ob es Fehler gibt
  };

  // Formular-Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      alert("Formular erfolgreich abgeschickt!");
      // Hier kannst du das Formular an einen Server senden oder eine andere Aktion durchführen
    }
  };

  return (
    <div className={styles.registerContainer}>
      {/* Linke Bildhälfte */}
      <div className={styles.leftContainer}>
        <Image
          src="/images/anmelden.jpg"
          alt="Beschreibung"
          layout="fill"
          objectFit="cover"
        />
      </div>

      {/* Rechte Formularhälfte */}
      <div className={styles.rightContainer}>
        <form className={styles.registerForm} onSubmit={handleSubmit}>
          <h1>Registrierung</h1>

          {/* Slider */}
          <div
            className={styles.sliderContainer}
            onClick={() => setIsPrivatePerson(!isPrivatePerson)}
          >
            <div
              className={styles.slider}
              style={{ left: isPrivatePerson ? "50%" : "0%" }}
            ></div>
            <span className={styles.sliderLabelLeft}>Gewerblich</span>
            <span className={styles.sliderLabelRight}>Privatperson</span>
          </div>

          {/* Allgemeine Felder */}
          <div className={styles.inputContainer}>
            <label>Vollständiger Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
            />
            {errors.fullName && <p className={styles.error}>{errors.fullName}</p>}
          </div>

          <div className={styles.inputContainer}>
            <label>E-Mail</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            {errors.email && <p className={styles.error}>{errors.email}</p>}
          </div>

          <div className={styles.inputContainer}>
            <label>Passwort</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
            />
            {errors.password && <p className={styles.error}>{errors.password}</p>}
          </div>

          <div className={styles.inputContainer}>
            <label>Passwort bestätigen</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
            />
            {errors.confirmPassword && (
              <p className={styles.error}>{errors.confirmPassword}</p>
            )}
          </div>

          {/* Zusätzliche Felder für Gewerbliche Nutzer */}
          {!isPrivatePerson && (
            <>
              <div className={styles.inputContainer}>
                <label>Firmenname</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                />
                {errors.companyName && (
                  <p className={styles.error}>{errors.companyName}</p>
                )}
              </div>

              <div className={styles.inputContainer}>
                <label>Umsatzsteuer-ID</label>
                <input
                  type="text"
                  name="vatNumber"
                  value={formData.vatNumber}
                  onChange={handleInputChange}
                />
                {errors.vatNumber && (
                  <p className={styles.error}>{errors.vatNumber}</p>
                )}
              </div>
            </>
          )}

          <button type="submit">Registrieren</button>
        </form>
      </div>
    </div>
  );
};

export default Register;
