'use client';

import React, { useState } from "react";
import styles from "./register.module.css";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

const EyeIcon = ({ visible, onClick }: { visible: boolean; onClick: () => void }) => (
  <div
    onClick={onClick}
    style={{ position: "absolute", right: "0px", top: "38px", cursor: "pointer" }}
  >
    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
  </div>
);

const Register = () => {
  const [isPrivatePerson, setIsPrivatePerson] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    street: "",
    houseNumber: "",
    zip: "",
    city: "",
    country: "",
    companyName: "",
    vatNumber: ""
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [confirmationLink, setConfirmationLink] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Deine vollständige Validierung (unverändert)
  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.firstName.trim()) newErrors.firstName = "Vorname ist erforderlich.";
    if (!formData.lastName.trim()) newErrors.lastName = "Nachname ist erforderlich.";
    if (!formData.username.trim()) {
      newErrors.username = "Benutzername ist erforderlich.";
    } else if (formData.username.toLowerCase() === "admin") {
      newErrors.username = "Benutzername ist bereits vergeben.";
    }
    if (!formData.email.includes("@")) newErrors.email = "Gültige E-Mail-Adresse erforderlich.";
    if (formData.password.length < 6) newErrors.password = "Passwort muss mind. 6 Zeichen haben.";
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwörter stimmen nicht überein.";
    if (!formData.street.trim()) newErrors.street = "Straße ist erforderlich.";
    if (!formData.houseNumber.trim()) newErrors.houseNumber = "Hausnummer ist erforderlich.";
    if (!formData.zip.trim()) newErrors.zip = "PLZ ist erforderlich.";
    if (!formData.city.trim()) newErrors.city = "Ort ist erforderlich.";
    if (!formData.country.trim()) newErrors.country = "Land ist erforderlich.";
    if (!isPrivatePerson) {
      if (!formData.companyName.trim()) newErrors.companyName = "Firmenname ist erforderlich.";
      if (!formData.vatNumber.trim()) newErrors.vatNumber = "Umsatzsteuer-ID ist erforderlich.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({}); // alte Fehler zurücksetzen

    // Registrierung bei Supabase – alle Felder in user_metadata ablegen
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          accountType: isPrivatePerson ? "PRIVATE" : "BUSINESS",
          address: {
            street: formData.street,
            houseNumber: formData.houseNumber,
            zip: formData.zip,
            city: formData.city,
            country: formData.country,
          },
          companyName: isPrivatePerson ? null : formData.companyName,
          vatNumber: isPrivatePerson ? null : formData.vatNumber,
        },
        emailRedirectTo: `${window.location.origin}/registrieren/bestaetigen`,
      },
    });

    setIsLoading(false);

    if (error) {
      // etwas freundlichere Fehlermeldung
      const msg = error.message?.toLowerCase().includes("already registered")
        ? "Diese E-Mail ist bereits registriert."
        : error.message || "Registrierung fehlgeschlagen.";
      setErrors({ email: msg });
      return;
    }

    // Erfolg – Hinweis für Bestätigungs-E-Mail
    setConfirmationLink("Bitte prüfe deine E-Mails und bestätige dein Konto.");
  };

  return (
    <div className={styles.registerContainer}>
      <div className={styles.leftContainer}>
        <Image
          src="/images/anmelden.webp"
          alt="Anmeldung"
          fill
          style={{ objectFit: "cover", objectPosition: "center" }}
          priority
        />
      </div>

      <div className={styles.rightContainer}>
        <form className={styles.registerForm} onSubmit={handleSubmit}>
          <h1>Jetzt kostenlos registrieren</h1>

          <div
            className={styles.sliderContainer}
            onClick={() => setIsPrivatePerson(!isPrivatePerson)}
            role="button"
            aria-label="Account-Typ wechseln"
          >
            <div className={styles.slider} style={{ left: isPrivatePerson ? "50%" : "0%" }} />
            <span className={styles.sliderLabelLeft}>Gewerblich</span>
            <span className={styles.sliderLabelRight}>Privatperson</span>
          </div>

          <div className={styles.inputRow}>
            <div className={styles.inputContainer}>
              <label>Vorname</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} />
              {errors.firstName && <p className={styles.error}>{errors.firstName}</p>}
            </div>
            <div className={styles.inputContainer}>
              <label>Nachname</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} />
              {errors.lastName && <p className={styles.error}>{errors.lastName}</p>}
            </div>
          </div>

          <div className={styles.inputContainer}>
            <label>E-Mail</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} />
            {errors.email && <p className={styles.error}>{errors.email}</p>}
          </div>

          <div className={styles.inputContainer}>
            <label>Benutzername</label>
            <input type="text" name="username" value={formData.username} onChange={handleInputChange} />
            {errors.username && <p className={styles.error}>{errors.username}</p>}
          </div>

          <div className={styles.inputContainer} style={{ position: "relative" }}>
            <label>Passwort</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
            />
            <EyeIcon visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
            {errors.password && <p className={styles.error}>{errors.password}</p>}
          </div>

          <div className={styles.inputContainer} style={{ position: "relative" }}>
            <label>Passwort bestätigen</label>
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
            />
            <EyeIcon visible={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)} />
            {errors.confirmPassword && <p className={styles.error}>{errors.confirmPassword}</p>}
          </div>

          <div className={styles.inputRow}>
            <div className={styles.inputContainer}>
              <label>Straße</label>
              <input type="text" name="street" value={formData.street} onChange={handleInputChange} />
              {errors.street && <p className={styles.error}>{errors.street}</p>}
            </div>
            <div className={`${styles.inputContainer} ${styles.smallInput}`}>
              <label>Hausnr.</label>
              <input type="text" name="houseNumber" value={formData.houseNumber} onChange={handleInputChange} />
              {errors.houseNumber && <p className={styles.error}>{errors.houseNumber}</p>}
            </div>
          </div>

          {isPrivatePerson ? (
            <>
              <div className={styles.inputContainer}>
                <label>PLZ</label>
                <input type="text" name="zip" value={formData.zip} onChange={handleInputChange} />
                {errors.zip && <p className={styles.error}>{errors.zip}</p>}
              </div>
              <div className={styles.inputContainer}>
                <label>Ort</label>
                <input type="text" name="city" value={formData.city} onChange={handleInputChange} />
                {errors.city && <p className={styles.error}>{errors.city}</p>}
              </div>
            </>
          ) : (
            <div className={styles.inputRow}>
              <div className={styles.inputContainer}>
                <label>PLZ</label>
                <input type="text" name="zip" value={formData.zip} onChange={handleInputChange} />
                {errors.zip && <p className={styles.error}>{errors.zip}</p>}
              </div>
              <div className={styles.inputContainer}>
                <label>Ort</label>
                <input type="text" name="city" value={formData.city} onChange={handleInputChange} />
                {errors.city && <p className={styles.error}>{errors.city}</p>}
              </div>
            </div>
          )}

          <div className={styles.inputContainer}>
            <label>Land</label>
            <input type="text" name="country" value={formData.country} onChange={handleInputChange} />
            {errors.country && <p className={styles.error}>{errors.country}</p>}
          </div>

          {!isPrivatePerson && (
            <div className={styles.inputRow}>
              <div className={styles.inputContainer}>
                <label>Firmenname</label>
                <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} />
                {errors.companyName && <p className={styles.error}>{errors.companyName}</p>}
              </div>
              <div className={styles.inputContainer}>
                <label>Umsatzsteuer-ID</label>
                <input type="text" name="vatNumber" value={formData.vatNumber} onChange={handleInputChange} />
                {errors.vatNumber && <p className={styles.error}>{errors.vatNumber}</p>}
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? <span className={styles.spinner}></span> : "Registrieren"}
          </button>
        </form>

        {confirmationLink && (
          <div className={styles.confirmBox}>
            <p>Registrierung erfolgreich! {confirmationLink}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
