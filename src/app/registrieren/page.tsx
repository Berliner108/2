'use client';

import React, { useState } from "react";
import styles from "./register.module.css";
import Image from "next/image";
import { Eye, EyeOff, Check } from "lucide-react";
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useSearchParams, useRouter } from 'next/navigation';

const EyeIcon = ({ visible, onClick }: { visible: boolean; onClick: () => void }) => (
  <div onClick={onClick} style={{ position: "absolute", right: "0px", top: "38px", cursor: "pointer" }}>
    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
  </div>
);

/** Fixe Länderauswahl (Dropdown) */
const COUNTRY_OPTIONS = [
  { value: "Deutschland", label: "Deutschland" },
  { value: "Österreich", label: "Österreich" },  
  { value: "Schweiz", label: "Schweiz" },
  { value: "Liechtenstein", label: "Liechtenstein" },
];

/** Regeln / Limits */
const NAME_MAX = 32;                // Vor-/Nachname max. 32
const CITY_MAX = 24;                // Ort max. 24
const USERNAME_MAX = 30;            // Benutzername max. 14
const ZIP_MAX = 5;                  // PLZ max. 5
const COMPANY_MAX = 80;   // Firmenname
const EMAIL_MAX = 70;    // RFC-typische Obergrenze
const STREET_MAX = 48; // oder 32/64 – wie du magst


// Nur Buchstaben (inkl. Umlaute) + Leerzeichen
const ONLY_LETTERS_SANITIZE = /[^A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß ]/g;
const ONLY_LETTERS_VALIDATE = /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+(?: [A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+)*$/;

// Passwort: mind. 8, mind. 1 Groß-, 1 Kleinbuchstabe, 1 Sonderzeichen
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

// war: const HNR_RE = /^\d{1,3}[A-Za-z]?$/;
const HNR_RE = /^\d{1,3}[a-z]?$/;  // nur klein


// PLZ: nur Ziffern, max. 5
const ZIP_RE = /^\d{1,5}$/;

// USt-ID grob: Großbuchstaben/Ziffern/Bindestrich, 8–14
const VAT_RE = /^[A-Z0-9-]{8,14}$/;

const Register = () => {
  const [isPrivatePerson, setIsPrivatePerson] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", username: "", email: "",
    password: "", confirmPassword: "",
    street: "", houseNumber: "", zip: "", city: "",
    country: COUNTRY_OPTIONS[0].value,
    companyName: "", vatNumber: ""
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [confirmationLink, setConfirmationLink] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const params = useSearchParams();
  const router = useRouter();
  const invitedBy = params.get('invited_by') || undefined;

  /** Sanitizing beim Tippen */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    let value = e.target.value;

    switch (name) {
      case "firstName":
      case "lastName":
        value = value.replace(ONLY_LETTERS_SANITIZE, "").slice(0, NAME_MAX);
        break;

      case "username":
        // nur Länge begrenzen, Whitespace raus
        value = value.replace(/\s+/g, "").slice(0, USERNAME_MAX);
        break;

      case "street":
        // nur Buchstaben + Leerzeichen
        value = value.replace(ONLY_LETTERS_SANITIZE, "");
        break;
        case "email": // 👈 HIER EINFÜGEN
      value = value.slice(0, EMAIL_MAX);
      break;

      case "houseNumber": {
  const digits = value.replace(/\D/g, "").slice(0, 3);
  const letter = value.replace(/[^a-z]/g, "").slice(0, 1); // nur klein
  value = digits + letter;
  break;
}
case "street":
  // nur Buchstaben + Leerzeichen UND Längenlimit
  value = value.replace(ONLY_LETTERS_SANITIZE, "").slice(0, STREET_MAX);
  break;


      case "zip":
        value = value.replace(/\D/g, "").slice(0, ZIP_MAX);
        break;

      case "city":
        value = value.replace(ONLY_LETTERS_SANITIZE, "").slice(0, CITY_MAX);
        break;

      case "country":
        // kommt aus Dropdown – Wert direkt übernehmen
        break;

      case "vatNumber":
        value = value.toUpperCase().replace(/\s+/g, "");
        break;

      default:
        // email/password/companyName bleiben unverändert
        break;
    }

    setFormData({ ...formData, [name]: value });
  };

  /** Validierung beim Submit */
  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!ONLY_LETTERS_VALIDATE.test(formData.firstName) || formData.firstName.length > NAME_MAX) {
      newErrors.firstName = `Vorname: nur Buchstaben, max. ${NAME_MAX} Zeichen.`;
    }
    if (!ONLY_LETTERS_VALIDATE.test(formData.lastName) || formData.lastName.length > NAME_MAX) {
      newErrors.lastName = `Nachname: nur Buchstaben, max. ${NAME_MAX} Zeichen.`;
    }
    if (!ONLY_LETTERS_VALIDATE.test(formData.street) || formData.street.length > STREET_MAX) {
  newErrors.street = `Straße: nur Buchstaben, max. ${STREET_MAX} Zeichen.`;
}

    if (formData.email.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email)) {
      newErrors.email = "Bitte eine gültige E-Mail eingeben.";
    }


    if (!formData.username || formData.username.length > USERNAME_MAX) {
      newErrors.username = `Benutzername: max. ${USERNAME_MAX} Zeichen.`;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email)) {
      newErrors.email = "Bitte eine gültige E-Mail eingeben.";
    }

    if (!PASSWORD_RE.test(formData.password)) {
      newErrors.password = "Passwort zu schwach: mind. 8 Zeichen, Groß-/Kleinbuchstaben & ein Sonderzeichen.";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwörter stimmen nicht überein.";
    }

    if (!ONLY_LETTERS_VALIDATE.test(formData.street)) {
      newErrors.street = "Straße: nur Buchstaben (und Leerzeichen).";
    }

    if (!HNR_RE.test(formData.houseNumber)) {
      newErrors.houseNumber = "Hausnr.: max. 3 Ziffern + optional 1 Buchstabe (z. B. 12A).";
    }

    if (!ZIP_RE.test(formData.zip)) {
      newErrors.zip = "PLZ: nur Ziffern, max. 5.";
    }

    if (!ONLY_LETTERS_VALIDATE.test(formData.city) || formData.city.length > CITY_MAX) {
      newErrors.city = `Ort: nur Buchstaben, max. ${CITY_MAX} Zeichen.`;
    }

    if (!COUNTRY_OPTIONS.some(c => c.value === formData.country)) {
      newErrors.country = "Bitte ein Land auswählen.";
    }

   if (!isPrivatePerson) {
  if (!formData.companyName.trim() || formData.companyName.length > COMPANY_MAX) {
    newErrors.companyName = `Firmenname ist erforderlich (max. ${COMPANY_MAX} Zeichen).`;
  }
  if (!VAT_RE.test(formData.vatNumber)) {
    newErrors.vatNumber = "USt-ID: 8–14 Zeichen (A–Z, 0–9, '-').";
  }
}


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isLoading) return;

    setIsLoading(true);
    setErrors({});
    setConfirmationLink("");

    const supabase = supabaseBrowser();
    const emailNorm = formData.email.trim().toLowerCase();
    const usernameNorm = formData.username.trim();

    try {
      // 0) E-Mail serverseitig prüfen
      try {
        const res = await fetch('/api/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailNorm }),
        });
        const info = await res.json();
        if (!res.ok) throw new Error(info?.error || 'CHECK_FAILED');
        if (info.exists) {
          setErrors({
            email: info.confirmed
              ? 'Diese E-Mail wird bereits verwendet.'
              : 'Diese E-Mail ist registriert, aber noch nicht bestätigt. Bitte prüfe deine E-Mails.',
          });
          return;
        }
      } catch { /* weiter – Supabase fängt harte Duplikate */ }

      // 1) Username-Check (RPC + Fallback)
      const { data: available, error: rpcErr } =
        await supabase.rpc('is_username_available', { name: usernameNorm });

      if (rpcErr) {
        try {
          const res2 = await fetch('/api/check-availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameNorm }),
          });
          const json = await res2.json();
          if (!res2.ok) throw new Error(json?.error || 'CHECK_FAILED');
          if (json.usernameTaken) {
            setErrors({ username: 'Benutzername ist bereits vergeben.' });
            return;
          }
        } catch {
          setErrors({ username: 'Benutzername-Prüfung derzeit nicht möglich. Bitte später erneut versuchen.' });
          return;
        }
      } else if (!available) {
        setErrors({ username: 'Benutzername ist bereits vergeben.' });
        return;
      }

      // 2) SignUp
      const { data, error } = await supabase.auth.signUp({
        email: emailNorm,
        password: formData.password,
        options: {
          data: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            username: usernameNorm,
            accountType: isPrivatePerson ? 'PRIVATE' : 'COMPANY',
            invited_by: invitedBy, // <— WICHTIG
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
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(params.get('redirect') ?? '/')}`,
        },
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        const alreadyExists =
          /already|exist|registered|duplicate/.test(msg) ||
          (error as any).status === 400 ||
          (error as any).code === 'user_already_exists' ||
          (error as any).code === 'email_exists';

        setErrors({
          email: alreadyExists
            ? 'Diese E-Mail ist bereits registriert.'
            : 'Registrierung fehlgeschlagen. Bitte später erneut versuchen.',
        });
        return;
      }

      // 3) IP-Hash speichern (Duplikaterkennung)
      if (data?.user?.id) {
        try {
          await fetch("/api/ip-dup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: data.user.id }),
          });
        } catch { /* ignorieren */ }
      }

      setConfirmationLink('Bitte bestätige deine E-Mail, dann kannst du dich einloggen.');
      // Optional: Auto-Redirect
      // setTimeout(() => router.push('/login' + (params.get('redirect') ? `?redirect=${encodeURIComponent(params.get('redirect')!)}` : '')), 1200);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.registerContainer}>
      <div className={styles.leftContainer}>
        <Image src="/images/anmelden.webp" alt="Anmeldung" fill style={{ objectFit: "cover", objectPosition: "center" }} priority />
      </div>

      <div className={styles.rightContainer}>
        <form className={styles.registerForm} onSubmit={handleSubmit}>
          <h1>Jetzt kostenlos registrieren</h1>

          <div className={styles.sliderContainer} onClick={() => setIsPrivatePerson(!isPrivatePerson)} role="button" aria-label="Account-Typ wechseln">
            <div className={styles.slider} style={{ left: isPrivatePerson ? "50%" : "0%" }} />
            <span className={styles.sliderLabelLeft}>Gewerblich</span>
            <span className={styles.sliderLabelRight}>Privatperson</span>
          </div>

          <div className={styles.inputRow}>
            <div className={styles.inputContainer}>
              <label>Vorname</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                maxLength={NAME_MAX}
                inputMode="text"
                autoComplete="given-name"
              />
              {errors.firstName && <p className={styles.error}>{errors.firstName}</p>}
            </div>
            <div className={styles.inputContainer}>
              <label>Nachname</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                maxLength={NAME_MAX}
                inputMode="text"
                autoComplete="family-name"
              />
              {errors.lastName && <p className={styles.error}>{errors.lastName}</p>}
            </div>
          </div>

          <div className={styles.inputContainer}>
            <label>E-Mail</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              autoComplete="email"
              maxLength={EMAIL_MAX}
            />

            {errors.email && <p className={styles.error}>{errors.email}</p>}
          </div>

          <div className={styles.inputContainer}>
            <label>Benutzername</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              maxLength={USERNAME_MAX}
              inputMode="text"
              autoCapitalize="none"
              autoComplete="username"
            />
            {errors.username && <p className={styles.error}>{errors.username}</p>}
          </div>

          <div className={styles.inputContainer} style={{ position: "relative" }}>
            <label>Passwort</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              autoComplete="new-password"
              minLength={8}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
              title="Mind. 8 Zeichen, Groß- und Kleinbuchstaben sowie ein Sonderzeichen."
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
              required
              minLength={8}
              autoComplete="new-password"
            />
            <EyeIcon visible={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)} />
            {errors.confirmPassword && <p className={styles.error}>{errors.confirmPassword}</p>}
          </div>

          <div className={styles.inputRow}>
            <div className={styles.inputContainer}>
              <label>Straße</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                required
                maxLength={STREET_MAX}
                inputMode="text"
                autoComplete="address-line1"
              />

              {errors.street && <p className={styles.error}>{errors.street}</p>}
            </div>
            <div className={`${styles.inputContainer} ${styles.smallInput}`}>
              <label>Hausnr.</label>
              <input
                type="text"
                name="houseNumber"
                value={formData.houseNumber}
                onChange={handleInputChange}
                required
                inputMode="text"
                pattern="\d{1,3}[a-z]?"
                title="z. B. 12a (max. 3 Ziffern + optional 1 Kleinbuchstabe)"
                autoComplete="address-line2"
              />

              {errors.houseNumber && <p className={styles.error}>{errors.houseNumber}</p>}
            </div>
          </div>

          {/* PLZ / Ort / Land */}
{isPrivatePerson ? (
  // PRIVATPERSON: alles untereinander
  <>
    <div className={styles.inputContainer}>
      <label>PLZ</label>
      <input
        type="text"
        name="zip"
        value={formData.zip}
        onChange={handleInputChange}
        required
        inputMode="numeric"
        pattern="\d{1,5}"
        maxLength={5}
      />
      {errors.zip && <p className={styles.error}>{errors.zip}</p>}
    </div>

    <div className={styles.inputContainer}>
      <label>Ort</label>
      <input
        type="text"
        name="city"
        value={formData.city}
        onChange={handleInputChange}
        required
        inputMode="text"
        maxLength={24}
        autoComplete="address-level2"
      />
      {errors.city && <p className={styles.error}>{errors.city}</p>}
    </div>

    <div className={styles.inputContainer}>
      <label>Land</label>
      <select
        name="country"
        value={formData.country}
        onChange={handleInputChange}
        required
        className={styles.select}
      >
        {COUNTRY_OPTIONS.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      {errors.country && <p className={styles.error}>{errors.country}</p>}
    </div>
  </>
) : (
  // GEWERBLICH: PLZ & Ort nebeneinander, Land darunter (wie bisher)
  <>
    <div className={styles.inputRow}>
      <div className={styles.inputContainer}>
        <label>PLZ</label>
        <input
          type="text"
          name="zip"
          value={formData.zip}
          onChange={handleInputChange}
          required
          inputMode="numeric"
          pattern="\d{1,5}"
          maxLength={5}
        />
        {errors.zip && <p className={styles.error}>{errors.zip}</p>}
      </div>
      <div className={styles.inputContainer}>
        <label>Ort</label>
        <input
          type="text"
          name="city"
          value={formData.city}
          onChange={handleInputChange}
          required
          inputMode="text"
          maxLength={24}
          autoComplete="address-level2"
        />
        {errors.city && <p className={styles.error}>{errors.city}</p>}
      </div>
    </div>

    <div className={styles.inputContainer}>
      <label>Land</label>
      <select
        name="country"
        value={formData.country}
        onChange={handleInputChange}
        required
        className={styles.select}
      >
        {COUNTRY_OPTIONS.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      {errors.country && <p className={styles.error}>{errors.country}</p>}
    </div>
  </>
)}


          {!isPrivatePerson && (
            <div className={styles.inputRow}>
              <div className={styles.inputContainer}>
                <label>Firmenname</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                  inputMode="text"
                  maxLength={COMPANY_MAX}
                />

                {errors.companyName && <p className={styles.error}>{errors.companyName}</p>}
              </div>
              <div className={styles.inputContainer}>
                <label>Umsatzsteuer-ID</label>
                <input
                  type="text"
                  name="vatNumber"
                  value={formData.vatNumber}
                  onChange={handleInputChange}
                  required
                  inputMode="text"
                  maxLength={14}  // passt zum Regex
                  title="8–14 Zeichen (A–Z, 0–9, '-')"
                />

                {errors.vatNumber && <p className={styles.error}>{errors.vatNumber}</p>}
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? <span className={styles.spinner}></span> : "Registrieren"}
          </button>
        </form>

        {confirmationLink && (
  <div className={styles.successBanner} role="status" aria-live="polite">
    <span className={styles.successIcon}><Check size={18} /></span>
    <span>{confirmationLink}</span>
  </div>
)}

      </div>
    </div>
  );
};

export default Register;
