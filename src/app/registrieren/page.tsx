// src/app/registrieren/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import styles from './register.module.css';
import Image from 'next/image';
import { Eye, EyeOff, Check } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

const EyeIcon = ({ visible, onClick }: { visible: boolean; onClick: () => void }) => (
  <div onClick={onClick} style={{ position: 'absolute', right: '0px', top: '38px', cursor: 'pointer' }}>
    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
  </div>
);

/** ✨ Nur interne Redirects zulassen (verhindert Open-Redirects) */
function safeRedirect(input: string | undefined | null): string {
  if (!input) return '/';
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const url = new URL(input, base);
    if (typeof window !== 'undefined' && url.origin !== window.location.origin) return '/';
    return url.pathname + url.search + url.hash || '/';
  } catch {
    return input.startsWith('/') ? input : '/';
  }
}

/** Query-Param ohne useSearchParams lesen (vermeidet Suspense-Pflicht) */
function useQueryParam(name: string) {
  const [value, setValue] = useState<string | undefined>(undefined);
  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get(name) || undefined;
      setValue(v ?? undefined);
    } catch {
      setValue(undefined);
    }
  }, [name]);
  return value;
}

/** Fixe Länderauswahl (Dropdown) */
const COUNTRY_OPTIONS = [
  { value: 'Deutschland', label: 'Deutschland' },
  { value: 'Österreich', label: 'Österreich' },
  { value: 'Schweiz', label: 'Schweiz' },
  { value: 'Liechtenstein', label: 'Liechtenstein' },
];

/** Regeln / Limits */
const NAME_MAX = 32;
const CITY_MAX = 24;
const USERNAME_MIN = 3;
const USERNAME_MAX = 24;
// Ein String für HTML pattern + eine RegExp für JS:
const USERNAME_PATTERN = `[a-z0-9_-]{${USERNAME_MIN},${USERNAME_MAX}}`;
const USERNAME_RE = new RegExp(`^${USERNAME_PATTERN}$`);

const ZIP_MAX = 5;
const COMPANY_MAX = 80;
const EMAIL_MAX = 70;
const STREET_MAX = 48;

const MIN_PW = 8;
const MAX_PW = 24;

// Nur Buchstaben (inkl. Umlaute) + Leerzeichen
const ONLY_LETTERS_SANITIZE = /[^A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß ]/g;
const ONLY_LETTERS_VALIDATE = /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+(?: [A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+)*$/;
// Hausnummer (nur kleinbuchstaben als Suffix)
const HNR_RE = /^\d{1,3}[a-z]?$/;
// PLZ: nur Ziffern, max. 5
const ZIP_RE = /^\d{1,5}$/;
// USt-ID grob
const VAT_RE = /^[A-Z0-9-]{8,14}$/;

const Register = () => {
  const [isPrivatePerson, setIsPrivatePerson] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    street: '',
    houseNumber: '',
    zip: '',
    city: '',
    country: COUNTRY_OPTIONS[0].value,
    companyName: '',
    vatNumber: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [confirmationLink, setConfirmationLink] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Resend Confirmation
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const invitedByRaw = useQueryParam('invited_by');
  const redirectParam = safeRedirect(useQueryParam('redirect') || '/');

  /** Optional: invited_by nur weitergeben, wenn es wie eine UUID aussieht */
  const invitedBy =
    invitedByRaw && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invitedByRaw)
      ? invitedByRaw
      : undefined;

  /** Sanitizing beim Tippen */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    let value = e.target.value;

    switch (name) {
      case 'firstName':
      case 'lastName':
        value = value.replace(ONLY_LETTERS_SANITIZE, '').slice(0, NAME_MAX);
        break;
      case 'username': {
        value = value
          .replace(/[^a-z0-9_-]/gi, '')
          .toLowerCase()
          .slice(0, USERNAME_MAX);
        break;
      }
      case 'email':
        value = value.slice(0, EMAIL_MAX);
        break;
      case 'street':
        value = value.replace(ONLY_LETTERS_SANITIZE, '').slice(0, STREET_MAX);
        break;
      case 'houseNumber': {
        const digits = value.replace(/\D/g, '').slice(0, 3);
        const letter = value.replace(/[^a-z]/g, '').slice(0, 1);
        value = digits + letter;
        break;
      }
      case 'zip':
        value = value.replace(/\D/g, '').slice(0, ZIP_MAX);
        break;
      case 'city':
        value = value.replace(ONLY_LETTERS_SANITIZE, '').slice(0, CITY_MAX);
        break;
      case 'vatNumber':
        value = value.toUpperCase().replace(/\s+/g, '');
        break;
      default:
        break;
    }
    setFormData((s) => ({ ...s, [name]: value }));
  };

  /** Validierung beim Submit (Passwort nur Länge, Username per Pattern) */
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
      newErrors.email = 'Bitte eine gültige E-Mail eingeben.';
    }
    if (!USERNAME_RE.test(formData.username)) {
      newErrors.username = `Benutzername: nur a–z, 0–9, _-, ${USERNAME_MIN}–${USERNAME_MAX} Zeichen.`;
    }

    // Passwort nur auf Länge prüfen (Option A)
    if (formData.password.length < MIN_PW || formData.password.length > MAX_PW) {
      newErrors.password = `Passwort: ${MIN_PW}–${MAX_PW} Zeichen.`;
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein.';
    }

    if (!HNR_RE.test(formData.houseNumber)) {
      newErrors.houseNumber = 'Hausnr.: max. 3 Ziffern + optional 1 Kleinbuchstabe (z. B. 12a).';
    }
    if (!ZIP_RE.test(formData.zip)) {
      newErrors.zip = 'PLZ: nur Ziffern, max. 5.';
    }
    if (!ONLY_LETTERS_VALIDATE.test(formData.city) || formData.city.length > CITY_MAX) {
      newErrors.city = `Ort: nur Buchstaben, max. ${CITY_MAX} Zeichen.`;
    }
    if (!COUNTRY_OPTIONS.some((c) => c.value === formData.country)) {
      newErrors.country = 'Bitte ein Land auswählen.';
    }
    if (!isPrivatePerson) {
      if (!formData.companyName.trim() || formData.companyName.length > COMPANY_MAX) {
        newErrors.companyName = `Firmenname ist erforderlich (max. ${COMPANY_MAX} Zeichen).`;
      }
      if (!VAT_RE.test(formData.vatNumber.trim().toUpperCase())) {
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
    setConfirmationLink('');

    const supabase = supabaseBrowser();
    const emailNorm = formData.email.trim().toLowerCase();
    const usernameNorm = formData.username.trim().toLowerCase();

    try {
      // 0) E-Mail serverseitig prüfen (optional)
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
      } catch {
        // weiter – Supabase fängt harte Duplikate
      }

      // 1) Username-Check (RPC + klarer Abbruch)
      const { data: available, error: rpcErr } = await supabase.rpc('is_username_available', {
        name: usernameNorm,
      });

      if (rpcErr) {
        console.warn('[is_username_available RPC failed]', rpcErr);
        setErrors({ username: 'Benutzername konnte nicht geprüft werden. Bitte später erneut.' });
        return;
      } else if (available === false) {
        setErrors({ username: 'Benutzername ist bereits vergeben.' });
        return;
      }

      // 2) SignUp – accountType: 'private' | 'business'
      const meta: Record<string, any> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: usernameNorm, // lowercase speichern
        accountType: isPrivatePerson ? 'private' : 'business',
        address: {
          street: formData.street,
          houseNumber: formData.houseNumber,
          zip: formData.zip,
          city: formData.city,
          country: formData.country,
        },
        companyName: isPrivatePerson ? null : formData.companyName,
        vatNumber: isPrivatePerson ? null : formData.vatNumber,
      };
      if (invitedBy) meta.invited_by = invitedBy; // nur setzen, wenn valide UUID

      const { data, error } = await supabase.auth.signUp({
        email: emailNorm,
        password: formData.password,
        options: {
          data: meta,
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectParam)}`,
        },
      });

      if (error) {
        console.error('[signUp error]', { message: error.message, status: (error as any)?.status, code: (error as any)?.code });
        const msg = (error.message || '').trim();
        const alreadyExists =
          /already|exist|registered|duplicate/i.test(msg) ||
          (error as any)?.status === 400 ||
          (error as any)?.code === 'user_already_exists' ||
          (error as any)?.code === 'email_exists';

        setErrors({
          email: alreadyExists
            ? 'Diese E-Mail ist bereits registriert.'
            : (msg || 'Registrierung fehlgeschlagen. Bitte später erneut versuchen.'),
        });
        return;
      }

      // 3) Optional: IP-Hash speichern (kann fehlschlagen, ohne UX zu blocken)
      if (data?.user?.id) {
        try {
          await fetch('/api/ip-dup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id }),
          });
        } catch {
          /* ignorieren */
        }
      }

      setConfirmationLink('Bitte bestätige deine E-Mail, dann kannst du dich einloggen.');
      setResendDone(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Bestätigungsmail erneut senden
  async function handleResend() {
    if (resending) return;
    setResending(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectParam)}`
        }
      });
      setResendDone(!error);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={styles.registerContainer}>
      <div className={styles.leftContainer}>
        <Image
          src="/images/anmelden.webp"
          alt="Anmeldung"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center' }}
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
            <div className={styles.slider} style={{ left: isPrivatePerson ? '50%' : '0%' }} />
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
              minLength={USERNAME_MIN}
              maxLength={USERNAME_MAX}
              pattern={USERNAME_PATTERN}
              title={`Nur a–z, 0–9, _-, ${USERNAME_MIN}–${USERNAME_MAX} Zeichen.`}
              inputMode="text"
              autoCapitalize="none"
              autoComplete="username"
            />
            {errors.username && <p className={styles.error}>{errors.username}</p>}
          </div>

          <div className={styles.inputContainer} style={{ position: 'relative' }}>
            <label>Passwort</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              autoComplete="new-password"
              minLength={MIN_PW}
              maxLength={MAX_PW}
            />
            <EyeIcon visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
              {/* 🔙 Sichtbare Regeln */}
            <p className={styles.hint} style={{ marginTop: 6 }}>
              {MIN_PW}–{MAX_PW} Zeichen. Empfehlung: 12+ Zeichen (Passphrase). Alle Zeichen erlaubt.
            </p>

            {errors.password && <p className={styles.error}>{errors.password}</p>}
          </div>
          

          <div className={styles.inputContainer} style={{ position: 'relative' }}>
            <label>Passwort bestätigen</label>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              minLength={MIN_PW}
              maxLength={MAX_PW}
              autoComplete="new-password"
            />
            <EyeIcon
              visible={showConfirmPassword}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            />
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
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {errors.country && <p className={styles.error}>{errors.country}</p>}
              </div>
            </>
          ) : (
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
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
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
                  maxLength={14}
                  title="8–14 Zeichen (A–Z, 0–9, '-')"
                />
                {errors.vatNumber && <p className={styles.error}>{errors.vatNumber}</p>}
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? <span className={styles.spinner}></span> : 'Registrieren'}
          </button>
        </form>

        {confirmationLink && (
          <div className={styles.successBanner} role="status" aria-live="polite">
            <span className={styles.successIcon}><Check size={18} /></span>
            <span>{confirmationLink}</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendDone}
              className={styles.linkButton}
              style={{ marginLeft: 12 }}
            >
              {resending ? 'Sende…' : resendDone ? 'Erneut gesendet ✓' : 'E-Mail erneut senden'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Register;
