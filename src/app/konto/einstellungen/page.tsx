// /src/app/konto/einstellungen/page.tsx
'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import Navbar from '../../components/navbar/Navbar';
import styles from './einstellungen.module.css'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

type ToastType = 'success' | 'error' | 'info'
type ToastState = { type: ToastType; message: string } | null

/* ---------- Validation ---------- */
const CITY_MAX = 24
const STREET_MAX = 48
const COMPANY_MAX = 80
const ZIP_MAX = 5
const COUNTRY_MAX = 56

const ONLY_LETTERS_SANITIZE = /[^A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß ]/g
const ONLY_LETTERS_VALIDATE = /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+(?: [A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+)*$/
const HNR_RE = /^\d{1,3}[a-z]?$/
const ZIP_RE = /^\d{1,5}$/
const VAT_RE = /^[A-Z0-9-]{8,14}$/
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/

/* ---------- Country dropdown ---------- */
const COUNTRY_OPTIONS = [
  'Deutschland',
  'Österreich',
  'Schweiz',
  'Liechtenstein',
] as const

/* ---------- Types ---------- */
type DbAccountType = 'private' | 'business'

type ApiGetResponse = {
  id: string
  email: string
  profile: {
    username: string
    account_type: '' | DbAccountType
    company: string
    vatNumber: string
    address: { street: string; houseNumber: string; zip: string; city: string; country?: string }
  }
}

/* ---------- Toast ---------- */
const Toast: FC<{ toast: ToastState; onClose: () => void }> = ({ toast, onClose }) => {
  const palette = useMemo(() => {
    if (!toast) return { bg: '#333', color: '#fff', border: '#444' }
    if (toast.type === 'success') return { bg: '#10b981', color: '#fff', border: '#059669' }
    if (toast.type === 'error') return { bg: '#ef4444', color: '#fff', border: '#dc2626' }
    return { bg: '#3b82f6', color: '#fff', border: '#2563eb' }
  }, [toast])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 3200)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 1000,
        maxWidth: 420,
        padding: '12px 14px',
        borderRadius: 12,
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: palette.bg,
        color: palette.color,
        border: `1px solid ${palette.border}`,
      }}
    >
      <span style={{ lineHeight: 1.35 }}>{toast.message}</span>
      <button
        onClick={onClose}
        aria-label="Toast schließen"
        style={{
          marginLeft: 'auto',
          border: 0,
          background: 'transparent',
          color: 'inherit',
          fontSize: 18,
          cursor: 'pointer',
          opacity: 0.9,
        }}
      >
        ×
      </button>
    </div>
  )
}

/* ---------- Seite ---------- */
const Einstellungen = (): JSX.Element => {
  const router = useRouter()
  const [toast, setToast] = useState<ToastState>(null)

  // Anzeige-Basics
  const [username, setUsername] = useState<string>('') // read-only
  const [email, setEmail] = useState<string>('') // read-only

  // Stammdaten
  const [isPrivatePerson, setIsPrivatePerson] = useState<boolean>(false)
  const [street, setStreet] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [zip, setZip] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState<string>('') // dropdown value (Pflicht)
  const [companyName, setCompanyName] = useState('')
  const [vatNumber, setVatNumber] = useState('')

  // Passwort ändern
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [signOutAll, setSignOutAll] = useState(true)
  const [showPw, setShowPw] = useState(false)

  // Einladungen
  const [inviteLink, setInviteLink] = useState<string>('')
  const [inviteEmails, setInviteEmails] = useState<string>('')
  const [sendingInv, setSendingInv] = useState<boolean>(false)
  const [invMsg, setInvMsg] = useState<string | null>(null)
  const [inviteList, setInviteList] = useState<any[]>([])
  const [listLoading, setListLoading] = useState<boolean>(false)

  // ===== Laden (API: GET /api/profile) =====
  useEffect(() => {
    ;(async () => {
      try {
        const sb = supabaseBrowser()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) {
          setToast({ type: 'info', message: 'Bitte melde dich an.' })
          return
        }

        const res = await fetch('/api/profile', { cache: 'no-store' })
        const j: ApiGetResponse = await res.json()
        if (!res.ok) {
          setToast({ type: 'error', message: 'Profil konnte nicht geladen werden.' })
          return
        }

        setEmail(j.email ?? '')
        setUsername(j.profile.username ?? (j.email?.split('@')[0] ?? ''))

        const acct = (j.profile.account_type || 'private') as DbAccountType
        setIsPrivatePerson(acct === 'private')

        const a = j.profile.address || ({} as ApiGetResponse['profile']['address'])
        setStreet(a.street || '')
        setHouseNumber(a.houseNumber || '')
        setZip(a.zip || '')
        setCity(a.city || '')

        // Country aus Profil übernehmen, nur wenn erlaubt – sonst leer (Pflicht wird unten geprüft)
        setCountry(a.country && (COUNTRY_OPTIONS as readonly string[]).includes(a.country) ? a.country : '')

        setCompanyName(j.profile.company || '')
        setVatNumber(j.profile.vatNumber || '')

        const origin = window.location.origin.replace(/\/$/, '')
        setInviteLink(`${origin}/registrieren?invited_by=${j.id}`)

        loadInvites()
      } catch {
        setToast({ type: 'error', message: 'Fehler beim Laden des Profils.' })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== Helpers =====
  const onChangeStreet = (v: string) => setStreet(v.replace(ONLY_LETTERS_SANITIZE, '').slice(0, STREET_MAX))
  const onChangeCity = (v: string) => setCity(v.replace(ONLY_LETTERS_SANITIZE, '').slice(0, CITY_MAX))
  const onChangeZip = (v: string) => setZip(v.replace(/\D/g, '').slice(0, ZIP_MAX))
  const onChangeHnr = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 3)
    const letter = v.replace(/[^a-z]/g, '').slice(0, 1)
    setHouseNumber(digits + letter)
  }
  const onChangeVat = (v: string) => setVatNumber(v.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 14))

  const loadInvites = async () => {
    try {
      setListLoading(true)
      const res = await fetch('/api/invitations/mine', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Einladungen konnten nicht geladen werden.')
      setInviteList(json.items || [])
    } catch {
      setInviteList([])
    } finally {
      setListLoading(false)
    }
  }

  // ===== Speichern =====
  const handleSave = async () => {
    const sb = supabaseBrowser()
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        setToast({ type: 'error', message: 'Sitzung abgelaufen. Bitte erneut einloggen.' })
        return
      }

      // Validierung
      if (!ONLY_LETTERS_VALIDATE.test(street) || street.length > STREET_MAX) {
        setToast({ type: 'error', message: `Straße: nur Buchstaben/Leerzeichen, max. ${STREET_MAX} Zeichen.` })
        return
      }
      if (!HNR_RE.test(houseNumber)) {
        setToast({ type: 'error', message: 'Hausnr.: max. 3 Ziffern + optional 1 Kleinbuchstabe (z. B. 12a).' })
        return
      }
      if (!ZIP_RE.test(zip)) {
        setToast({ type: 'error', message: 'PLZ: nur Ziffern, max. 5.' })
        return
      }
      if (!ONLY_LETTERS_VALIDATE.test(city) || city.length > CITY_MAX) {
        setToast({ type: 'error', message: `Ort: nur Buchstaben/Leerzeichen, max. ${CITY_MAX} Zeichen.` })
        return
      }

      // >>> Land ist Pflicht (privat & gewerblich) <<<
      if (!country || !(COUNTRY_OPTIONS as readonly string[]).includes(country)) {
        setToast({ type: 'error', message: 'Bitte ein gültiges Land auswählen.' })
        return
      }

      if (!isPrivatePerson) {
        if (!companyName.trim() || companyName.length > COMPANY_MAX) {
          setToast({ type: 'error', message: `Firmenname ist erforderlich (max. ${COMPANY_MAX} Zeichen).` })
          return
        }
        if (!VAT_RE.test(vatNumber.trim().toUpperCase())) {
          setToast({ type: 'error', message: "USt-ID: 8–14 Zeichen (A–Z, 0–9, '-')." })
          return
        }
      }

      const acctTypeDB: DbAccountType = isPrivatePerson ? 'private' : 'business'

      // Metadaten MERGEN (firstName/lastName bleiben erhalten)
      const currentMeta = (user.user_metadata || {}) as any
      const nextMeta = {
        ...currentMeta,
        accountType: acctTypeDB,
        address: {
          ...(currentMeta.address || {}),
          street,
          houseNumber,
          zip,
          city,
          country,
        },
        companyName: isPrivatePerson ? null : companyName.trim(),
        vatNumber: isPrivatePerson ? null : vatNumber.trim().toUpperCase(),
      }

      const { error: metaErr } = await sb.auth.updateUser({ data: nextMeta })
      if (metaErr) {
        setToast({ type: 'error', message: metaErr.message || 'Profil-Metadaten konnten nicht gespeichert werden.' })
        return
      }

      // Profile-API (DB-ENUM erwartet 'private'|'business')
      const profRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_type: acctTypeDB,
          address: { street, houseNumber, zip, city, country },
          company_name: isPrivatePerson ? null : companyName.trim(),
          vat_number: isPrivatePerson ? null : vatNumber.trim().toUpperCase(),
        }),
      })

      let j: any = {}
      try { j = await profRes.json() } catch {}

      if (!profRes.ok) {
        const extra = [j?.message, j?.details, j?.hint, j?.code].filter(Boolean).join(' • ')
        const nicer = /invalid_account_type|invalid input value for enum/i.test(extra)
          ? 'Ungültiger Konto-Typ.'
          : extra
        setToast({ type: 'error', message: `Profil konnte nicht gespeichert werden.${nicer ? ' — ' + nicer : ''}` })
        return
      }

      setToast({ type: 'success', message: 'Änderungen erfolgreich gespeichert.' })
      router.refresh()
    } catch (err) {
      console.error('[handleSave fatal]', err)
      setToast({ type: 'error', message: 'Fehler beim Speichern der Änderungen.' })
    }
  }

  // ===== Passwort ändern =====
  const handleChangePassword = async () => {
    const sb = supabaseBrowser()
    try {
      setToast(null)
      if (!password) return setToast({ type: 'error', message: 'Bitte aktuelles Passwort eingeben.' })
      if (!PASSWORD_RE.test(newPassword))
        return setToast({ type: 'error', message: 'Passwort zu schwach: mind. 8 Zeichen, Groß-/Kleinbuchstaben & ein Sonderzeichen.' })
      if (newPassword !== confirmPassword)
        return setToast({ type: 'error', message: 'Die neuen Passwörter stimmen nicht überein.' })

      setPwSaving(true)

      const { data: { user } } = await sb.auth.getUser()
      if (!user?.email) { setPwSaving(false); return setToast({ type: 'error', message: 'Sitzung abgelaufen. Bitte erneut einloggen.' }) }

      const { error: reauthErr } = await sb.auth.signInWithPassword({ email: user.email, password })
      if (reauthErr) { setPwSaving(false); return setToast({ type: 'error', message: 'Aktuelles Passwort ist falsch.' }) }

      const { error: updErr } = await sb.auth.updateUser({ password: newPassword })
      if (updErr) { setPwSaving(false); return setToast({ type: 'error', message: updErr.message || 'Passwort konnte nicht geändert werden.' }) }

      setPassword(''); setNewPassword(''); setConfirmPassword('')
      setPwSaving(false)

      if (signOutAll) {
        await sb.auth.signOut({ scope: 'global' as any })
        router.replace('/login?changed=1')
        return
      }

      setToast({ type: 'success', message: 'Passwort aktualisiert.' })
    } catch {
      setPwSaving(false)
      setToast({ type: 'error', message: 'Fehler beim Ändern des Passworts.' })
    }
  }

  // ===== Konto löschen =====
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setToast({ type: 'error', message: 'Bitte bestätige die Checkbox vor dem Löschen.' })
      return
    }
    if (!confirm('Willst du dein Konto wirklich dauerhaft löschen? Dies kann nicht rückgängig gemacht werden.')) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setToast({ type: 'error', message: json?.error || 'Löschung fehlgeschlagen.' })
        return
      }
      await supabaseBrowser().auth.signOut()
      router.replace('/?deleted=1')
    } catch {
      setToast({ type: 'error', message: 'Netzwerkfehler bei der Löschung.' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Navbar />
      <h2 className={styles.title}>Kontoeinstellungen</h2>
      <div className={styles.wrapper}>
        
        <div className={styles.kontoContainer}>
          <p className={styles.description}>
            Bearbeite hier deine E-Mail, Passwort und weitere Einstellungen.
          </p>

          <form onSubmit={(e) => e.preventDefault()} className={styles.form} autoComplete="on">
            {/* Benutzername */}
            <div className={styles.inputGroup}>
              <label>Benutzername</label>
              <input type="text" value={username || '—'} readOnly className={styles.inputReadonly} />
            </div>

            {/* E-Mail */}
            <div className={styles.inputGroup}>
              <label htmlFor="email">E-Mail-Adresse</label>
              <input id="email" type="email" value={email} readOnly className={styles.inputReadonly} autoComplete="email" />
            </div>

            {/* Kontoart */}
            <div className={styles.separator}></div>
            <h3 className={styles.subSectionTitle}>Kontoart</h3>
            <div className={styles.inputGroup}>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <input type="radio" name="acct" checked={!isPrivatePerson} onChange={() => setIsPrivatePerson(false)} />
                  Gewerblich
                </label>
                <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <input type="radio" name="acct" checked={isPrivatePerson} onChange={() => setIsPrivatePerson(true)} />
                  Privatperson
                </label>
              </div>
            </div>

            {/* Anschrift */}
            <div className={styles.separator}></div>
            <h3 className={styles.subSectionTitle}>Anschrift</h3>

            <div className={styles.inputGroup}>
              <label>Straße</label>
              <input
                type="text"
                value={street}
                onChange={(e) => onChangeStreet(e.target.value)}
                required
                inputMode="text"
                className={styles.input}
                maxLength={STREET_MAX}
                placeholder="Straßenname"
                autoComplete="address-line1"
              />
            </div>

            <div className={styles.inputRow}>
              <div className={`${styles.inputGroup} ${styles.smallInput}`}>
                <label>Hausnr.</label>
                <input
                  type="text"
                  value={houseNumber}
                  onChange={(e) => onChangeHnr(e.target.value)}
                  required
                  inputMode="text"
                  className={styles.input}
                  pattern="\d{1,3}[a-z]?"
                  title="z. B. 12a (max. 3 Ziffern + 1 Kleinbuchstabe)"
                  placeholder="z. B. 12a"
                  autoComplete="address-line2"
                />
              </div>

              <div className={`${styles.inputGroup} ${styles.smallInput}`}>
                <label>PLZ</label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => onChangeZip(e.target.value)}
                  required
                  inputMode="numeric"
                  className={styles.input}
                  pattern="\d{1,5}"
                  maxLength={ZIP_MAX}
                  placeholder="PLZ"
                />
              </div>

              <div className={styles.inputGroup} style={{ flex: 1 }}>
                <label>Ort</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => onChangeCity(e.target.value)}
                  required
                  inputMode="text"
                  className={styles.input}
                  maxLength={CITY_MAX}
                  placeholder="Ort"
                  autoComplete="address-level2"
                />
              </div>
            </div>

            {/* Land (Dropdown) – Pflicht */}
            <div className={styles.inputGroup}>
              <label>Land</label>
              <select
                value={country || ''}
                onChange={(e) => setCountry(e.target.value)}
                className={styles.input}
                aria-label="Land auswählen"
                required
              >
                <option value="">— Bitte wählen —</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Firmenfelder nur wenn gewerblich */}
            {!isPrivatePerson && (
              <>
                <div className={styles.inputGroup}>
                  <label>Firmenname</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value.slice(0, COMPANY_MAX))}
                    required
                    inputMode="text"
                    className={styles.input}
                    maxLength={COMPANY_MAX}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Umsatzsteuer-ID</label>
                  <input
                    type="text"
                    value={vatNumber}
                    onChange={(e) => onChangeVat(e.target.value)}
                    required
                    inputMode="text"
                    className={styles.input}
                    maxLength={14}
                    pattern="[A-Z0-9-]{8,14}"
                    title="8–14 Zeichen (A–Z, 0–9, '-')"
                    placeholder="z. B. DE123456789"
                  />
                </div>
              </>
            )}

            {/* Änderungen speichern */}
            <div className={styles.inputGroup}>
              <button type="button" onClick={handleSave} className={styles.saveButton}>
                Änderungen speichern
              </button>
            </div>

            {/* Passwort ändern */}
            <div className={styles.separator}></div>
            <h3 className={styles.subSectionTitle}>Passwort ändern</h3>

            <div className={styles.inputGroup}>
              <label htmlFor="password">Aktuelles Passwort</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Aktuelles Passwort"
                  className={styles.input}
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPw(s => !s)} className={styles.saveButton} style={{ whiteSpace: 'nowrap' }}>
                  {showPw ? 'Verbergen' : 'Anzeigen'}
                </button>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="newPassword">Neues Passwort</label>
              <input
                id="newPassword"
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Neues Passwort (min. 8 Zeichen)"
                className={styles.input}
                autoComplete="new-password"
                minLength={8}
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
                title="Mind. 8 Zeichen, Groß- und Kleinbuchstaben sowie ein Sonderzeichen."
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword">Neues Passwort bestätigen</label>
              <input
                id="confirmPassword"
                type={showPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Bestätige neues Passwort"
                className={styles.input}
                autoComplete="new-password"
                minLength={8}
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
                title="Mind. 8 Zeichen, Groß- und Kleinbuchstaben sowie ein Sonderzeichen."
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={signOutAll} onChange={() => setSignOutAll(s => !s)} />
                Nach Änderung auf allen Geräten abmelden (empfohlen)
              </label>
            </div>

            <div className={styles.inputGroup}>
              <button
                type="button"
                onClick={async () => await handleChangePassword()}
                className={styles.saveButton}
                disabled={pwSaving || !PASSWORD_RE.test(newPassword) || newPassword !== confirmPassword}
              >
                {pwSaving ? 'Ändere…' : 'Passwort ändern'}
              </button>
            </div>

            {/* Einladungen */}
            <div className={styles.separator}></div>
            <h3 className={styles.subSectionTitle}>Leute einladen</h3>

            <div className={styles.inputGroup}>
              <label>Dein Einladungslink</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" readOnly value={inviteLink} className={styles.input} />
                <button
                  type="button"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(inviteLink); setInvMsg('Einladungslink kopiert.') }
                    catch { setInvMsg('Konnte nicht kopieren.') }
                    setTimeout(() => setInvMsg(null), 2000)
                  }}
                  className={styles.saveButton}
                >
                  Kopieren
                </button>
              </div>
              <p style={{ color: '#6b7280', marginTop: 6, fontSize: 13 }}>
                Jeder, der sich über diesen Link registriert, wird dir zugeordnet.
              </p>
            </div>

            <div className={styles.inputGroup}>
              <label>E-Mail(s) einladen (optional)</label>
              <textarea
                rows={2}
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="anna@example.com, bob@firma.de"
                className={styles.input}
                style={{ minHeight: 70 }}
              />
              <button
                type="button"
                onClick={async () => {
                  if (!inviteEmails.trim()) return
                  setSendingInv(true); setInvMsg(null)
                  try {
                    const res = await fetch('/api/invitations/send', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ emails: inviteEmails }),
                    })
                    const json = await res.json()
                    if (!res.ok) throw new Error(json?.error || 'Fehler beim Senden')
                    const ok = (json.results || []).filter((r: any) => r.ok).length
                    const fail = (json.results || []).filter((r: any) => !r.ok).length
                    setInvMsg(`${ok} Einladung(en) gesendet${fail ? `, ${fail} fehlgeschlagen` : ''}.`)
                    setInviteEmails('')
                    await loadInvites()
                  } catch (e: any) {
                    setInvMsg(e?.message || 'Fehler beim Senden')
                  } finally {
                    setSendingInv(false)
                  }
                }}
                disabled={sendingInv}
                className={styles.saveButton}
                style={{ width: 'fit-content', marginTop: 8 }}
              >
                {sendingInv ? 'Wird gesendet…' : 'Einladungen senden'}
              </button>

              {invMsg && (
                <div style={{
                  marginTop: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  color: '#111827',
                }}>{invMsg}</div>
              )}
            </div>

            <div className={styles.inputGroup}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', width: '100%' }}>
                <div style={{ padding: 12, background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>
                  Gesendete Einladungen
                </div>
                <div style={{ padding: 12 }}>
                  {listLoading && <div style={{ color: '#6b7280' }}>Lade…</div>}
                  {!listLoading && inviteList.length === 0 && (
                    <div style={{ color: '#6b7280' }}>Noch keine Einladungen.</div>
                  )}
                  {!listLoading && inviteList.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', fontSize: 14, color: '#6b7280' }}>
                          <th style={{ padding: '8px 6px' }}>E-Mail</th>
                          <th style={{ padding: '8px 6px' }}>Status</th>
                          <th style={{ padding: '8px 6px' }}>Gesendet</th>
                          <th style={{ padding: '8px 6px' }}>Akzeptiert</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inviteList.map((r: any) => (
                          <tr key={r.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 6px' }}>{r.invitee_email}</td>
                            <td style={{ padding: '10px 6px' }}>
                              {r.status === 'sent' && <span style={{ color: '#2563eb' }}>versendet</span>}
                              {r.status === 'accepted' && <span style={{ color: '#059669' }}>akzeptiert</span>}
                              {r.status === 'failed' && <span style={{ color: '#b91c1c' }}>fehlgeschlagen</span>}
                              {r.status === 'revoked' && <span>zurückgezogen</span>}
                            </td>
                            <td style={{ padding: '10px 6px' }}>{new Date(r.created_at).toLocaleString()}</td>
                            <td style={{ padding: '10px 6px' }}>{r.accepted_at ? new Date(r.accepted_at).toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Konto löschen */}
            <div className={styles.separator}></div>
            <h3 className={styles.subSectionTitle}>Konto löschen</h3>
            <p className={styles.deleteConfirmationText}>
              Wenn du dein Konto löschst, werden alle deine Daten dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.
            </p>

            <label htmlFor="deleteConfirm" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <input id="deleteConfirm" type="checkbox" checked={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.checked)} />
              Ich bestätige, dass ich mein Konto löschen möchte.
            </label>

            <button
              type="button"
              onClick={handleDeleteAccount}
              className={styles.deleteButton}
              disabled={!deleteConfirm || deleting}
              aria-disabled={!deleteConfirm || deleting}
            >
              {deleting ? 'Lösche…' : 'Konto löschen'}
            </button>
          </form>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  )
}

export default Einstellungen
