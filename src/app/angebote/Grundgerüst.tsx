'use client'
import type React from 'react'   // ⬅️ NEU
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Star, Search, Crown, Upload, Settings, HelpCircle, Truck } from 'lucide-react'
import { Oswald } from 'next/font/google'
import styles from './Grundgeruest.module.css'
import Navbar from '../components/navbar/Navbar'
import Dropzone from './Dropzone'
import DateiVorschau from './DateiVorschau'
import BeschreibungsBox from './BeschreibungsBox'
import MaterialGuete from './MaterialGuete'
import VerfahrenUndLogistik from './VerfahrenUndLogistik' // Pfad ggf. anpassen
import { specificationsMap } from '../components/SpezifikationenAngeboteEinholen'
import LogistikSection from './LogistikSection'
import beschreibungsStyles from './logistikbox.module.css'

/* ---------------- Fancy Loader Components ---------------- */

function TopLoader() {
  return (
    <div className={styles.topLoader} aria-hidden={true}>
      <div className={styles.topLoaderInner} />
    </div>
  );
}

function FormSkeleton() {
  return (
    <div
      className={styles.skeletonPage}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={styles.skelHeader}>
        <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
        <div className={styles.skelLine} />
      </div>

      <div className={styles.skelBlock} />
      <div className={styles.skelBlockSmall} />

      <div className={styles.skelTwoCols}>
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
      </div>

      <div className={styles.skelDrop} />
      <div className={styles.skelDropSmall} />

      <div className={styles.skelGrid}>
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
      </div>
    </div>
  );
}


const stepIcons = [
  <Upload size={40} />,
  <Settings size={40} />,
  <Truck size={40} />,
]

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '700'],
})
const rhythmusLabel: Record<string, string> = {
  taeglich: 'täglich',
  woechentlich: 'wöchentlich',
  zweiwoechentlich: 'alle zwei Wochen',
  monatlich: 'monatlich',
};

// Fiktive Promo-Pakete (nur Frontend)
const promoPackages = [
  {
    id: 'startseite',
    title: 'Anzeige auf Startseite hervorheben',
    subtitle: 'Startseiten-Hervorhebung',
    priceCents: 6999,
    score: 30,
    icon: <Star size={18} className={styles.iconStar} aria-hidden />,
  },
  {
    id: 'suche',
    title: 'Anzeige in Suche priorisieren',
    subtitle: 'Ranking-Boost in der Suche',
    priceCents: 4999,
    score: 15,
    icon: <Search size={18} className={styles.iconSearch} aria-hidden />,
  },
  {
    id: 'premium',
    title: 'Premium-Anzeige aktivieren',
    subtitle: 'Premium-Badge & Listing',
    priceCents: 3499,
    score: 12,
    icon: <Crown size={18} className={styles.iconCrown} aria-hidden />,
  },
] as const

// ✅ aktualisiertes fadeIn
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
}

export default function Formular() {
  const router = useRouter()
  // ✅ standardmäßig sichtbar
  const [showSteps, setShowSteps] = useState(true)
  const [activeStep, setActiveStep] = useState(0)

  // Bilder
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [warnungBilder, setWarnungBilder] = useState('')

  // Dateien
  const [fileFiles, setFileFiles] = useState<File[]>([])
  const [warnungDateien, setWarnungDateien] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [vorschauOffen, setVorschauOffen] = useState(false)

  const [beschreibung, setBeschreibung] = useState('')
    const [beschreibungError, setBeschreibungError] = useState(false)
  const beschreibungRef = useRef<HTMLDivElement>(null)

  



  const [selectedOption1, setSelectedOption1] = useState('')
  const [selectedOption2, setSelectedOption2] = useState('')



  const [lieferDatum, setLieferDatum] = useState('')
  const [abholDatum, setAbholDatum] = useState('')
  const [lieferArt, setLieferArt] = useState('')
  const [abholArt, setAbholArt] = useState('')
  const [logistikError, setLogistikError] = useState(false)
    const [serienauftrag, setSerienauftrag] = useState(false)
  const [rhythmus, setRhythmus] = useState('')
  const [serienTermine, setSerienTermine] = useState<
    { nr: number; liefer: string; abhol: string }[]
  >([])


  const [verfahrenError, setVerfahrenError] = useState(false)
  const verfahrenRef = useRef<HTMLDivElement>(null)

 const [specSelections, setSpecSelections] = useState<
  Record<string, string | string[]>
>({})

// 🔹 Hilfsfunktion: alle Keys mit bestimmtem Prefix löschen (v1__ / v2__)
const clearSpecsByPrefix = (prefix: 'v1__' | 'v2__') => {
  setSpecSelections((prev) => {
    const entries = Object.entries(prev).filter(
      ([key]) => !key.startsWith(prefix),
    )
    return Object.fromEntries(entries)
  })
}

  const istGueltigDatei = (file: File) => {
    const erlaubteEndungen = ['.pdf', '.zip', '.dxf']
    const name = file.name.toLowerCase()
    return erlaubteEndungen.some((ext) => name.endsWith(ext))
  }
  

  const [agbAccepted, setAgbAccepted] = useState(false)
  const [agbError, setAgbError] = useState(false)
  const agbRef = useRef<HTMLDivElement>(null)
  const bilderRef = useRef<HTMLDivElement>(null)
  const materialRef = useRef<HTMLDivElement>(null)
  const logistikRef = useRef<HTMLDivElement>(null) // 🔁 vorher FieldSet
  const step1Ref = useRef<HTMLDivElement>(null)
const step2Ref = useRef<HTMLDivElement>(null)
const step3Ref = useRef<HTMLDivElement>(null)


  const [materialGuete, setMaterialGuete] = useState('')
  const [customMaterial, setCustomMaterial] = useState('')
  const [materialGueteError, setMaterialGueteError] = useState(false)

  const [laenge, setLaenge] = useState('')
  const [breite, setBreite] = useState('')
  const [hoehe, setHoehe] = useState('')
  const [masse, setMasse] = useState('')
  const [abmessungError, setAbmessungError] = useState(false)

  const [selectedVerfahren, setSelectedVerfahren] = useState<string[]>([]) // oder später aus deinem Verfahren-Block

  const [bewerbungOptionen, setBewerbungOptionen] = useState<string[]>([])
  const toggleBewerbung = (option: string) => {
    setBewerbungOptionen((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option],
    )
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const urls = photoFiles.map((file) => URL.createObjectURL(file))
    setPhotoPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [photoFiles])

// 🔄 Wenn Verfahren 1 wechselt → alle v1__-Spezifikationen löschen
useEffect(() => {
  clearSpecsByPrefix('v1__')
}, [selectedOption1])

// 🔄 Wenn Verfahren 2 wechselt → alle v2__-Spezifikationen löschen
useEffect(() => {
  clearSpecsByPrefix('v2__')
}, [selectedOption2])


const scrollToBlock = (ref: React.RefObject<HTMLElement>) => {
  if (!ref.current) return

  // Falls du eine feste Navbar hast, etwas Abstand nach oben lassen (z. B. 90px)
  const y = ref.current.getBoundingClientRect().top + window.scrollY - 90

  window.scrollTo({
    top: y,
    behavior: 'smooth',
  })
}

// weiter für Validierungs-Scroll benutzen
const scrollToError = scrollToBlock

// 🔹 DAS ist für die Klicks auf die Step-Boxen
const scrollToSection = (step: number) => {
  if (step === 1) scrollToBlock(step1Ref)
  if (step === 2) scrollToBlock(step2Ref)
  if (step === 3) scrollToBlock(step3Ref)
  }
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  let hasError = false

  let firstErrorRef: React.RefObject<HTMLDivElement> | null = null

  // 1️⃣ BILDER
  if (photoFiles.length === 0) {
    setWarnungBilder('Bitte lade mindestens 1 Foto hoch.')
    if (!firstErrorRef) firstErrorRef = bilderRef
    hasError = true
  } else {
    setWarnungBilder('')
  }

  // 2️⃣ VERFAHREN
  if (!selectedOption1) {
    setVerfahrenError(true)
    if (!firstErrorRef) firstErrorRef = verfahrenRef
    hasError = true
  } else {
    setVerfahrenError(false)
  }

  // 3️⃣ MATERIALGÜTE
  if (!materialGuete || (materialGuete === 'Andere' && !customMaterial)) {
    setMaterialGueteError(true)
    if (!firstErrorRef) firstErrorRef = materialRef
    hasError = true
  } else {
    setMaterialGueteError(false)
  }

  // 4️⃣ ABMESSUNGEN
  if (!laenge || !breite || !hoehe || !masse) {
    setAbmessungError(true)
    if (!firstErrorRef) firstErrorRef = materialRef
    hasError = true
  } else {
    setAbmessungError(false)
  }

  // 5️⃣ BESCHREIBUNG
  if (!beschreibung.trim()) {
    setBeschreibungError(true)
    if (!firstErrorRef) firstErrorRef = beschreibungRef
    hasError = true
  } else {
    setBeschreibungError(false)
  }

  // 6️⃣ LOGISTIK
  if (!lieferDatum || !abholDatum || !lieferArt || !abholArt) {
    setLogistikError(true)
    if (!firstErrorRef) firstErrorRef = logistikRef
    hasError = true
  } else if (new Date(lieferDatum) > new Date(abholDatum)) {
    setLogistikError(true)
    if (!firstErrorRef) firstErrorRef = logistikRef
    hasError = true
  } else {
    setLogistikError(false)
  }

  // 7️⃣ AGB
  if (!agbAccepted) {
    setAgbError(true)
    if (!firstErrorRef) firstErrorRef = agbRef
    hasError = true
  } else {
    setAgbError(false)
  }

  if (hasError) {
    if (firstErrorRef) {
      scrollToError(firstErrorRef)
    }
    return
  }

  setIsLoading(true)

  const formData = new FormData()
  formData.append('agbAccepted', agbAccepted ? 'true' : 'false')

  bewerbungOptionen.forEach((option, i) => {
    formData.append(`bewerbungOptionen[${i}]`, option)
  })

  photoFiles.forEach((file, i) => {
    formData.append(`bilder[${i}]`, file)
  })

  fileFiles.forEach((file, i) => {
    formData.append(`dateien[${i}]`, file)
  })

  formData.append('materialguete', materialGuete)
  if (materialGuete === 'Andere') {
    formData.append('andereMaterialguete', customMaterial)
  }

  formData.append('lieferDatum', lieferDatum)
  formData.append('abholDatum', abholDatum)
  formData.append('lieferArt', lieferArt)
  formData.append('abholArt', abholArt)
  formData.append('serienauftragAktiv', serienauftrag ? 'true' : 'false')
  formData.append('serienRhythmus', rhythmus || '')
  formData.append('serienTermine', JSON.stringify(serienTermine))

  try {
    // Spezifikationen
    formData.append('specSelections', JSON.stringify(specSelections))

    // Verfahren
    formData.append('verfahren1', selectedOption1)
    if (selectedOption2) {
      formData.append('verfahren2', selectedOption2)
    }

    // Beschreibung
    formData.append('beschreibung', beschreibung.trim())

    // Abmessungen & Masse
    formData.append('laenge', laenge)
    formData.append('breite', breite)
    formData.append('hoehe', hoehe)
    formData.append('masse', masse)

    // 1️⃣ Immer zuerst: Auftrag in jobs anlegen
    const res = await fetch('/api/auftrag-absenden', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      let payload: any = null
      try {
        payload = await res.json()
      } catch {}

      console.error('API-Fehler /api/auftrag-absenden:', res.status, payload)
      throw new Error(payload?.details || 'Fehler beim Absenden')
    }

    const data = await res.json().catch(() => null as any)
    const jobId = data?.jobId as string | undefined

    if (!jobId) {
      console.error('Kein jobId im Response von /api/auftrag-absenden', data)
      throw new Error('Auftrag konnte nicht eindeutig gespeichert werden.')
    }

    // 2️⃣ Kein Promo-Paket gewählt → fertig wie bisher
    if (bewerbungOptionen.length === 0) {
      setSuccessMessage(
        '✅ Auftrag erfolgreich aufgegeben! Du wirst weitergeleitet …',
      )

      setTimeout(() => {
        router.replace('/konto/angebote')
      }, 2000)

      return
    }

    // 3️⃣ Promo-Pakete gewählt → Stripe Checkout starten
    const promoRes = await fetch('/api/job-promo/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        packageCodes: bewerbungOptionen,
      }),
    })

    if (!promoRes.ok) {
      let payload: any = null
      try {
        payload = await promoRes.json()
      } catch {}

      console.error(
        'API-Fehler /api/job-promo/checkout:',
        promoRes.status,
        payload,
      )
      // Ganz wichtig: der Auftrag EXISTIERT bereits.
      // Nur die Bewerbung hat nicht geklappt.
      alert(
        'Dein Auftrag wurde gespeichert, aber der Bezahlvorgang für die Bewerbung konnte nicht gestartet werden. Du kannst die Bewerbung später in deinem Konto erneut versuchen.',
      )
      router.replace('/konto/angebote')
      return
    }

    const promoData = (await promoRes.json()) as {
      checkoutUrl?: string
    }

    if (promoData.checkoutUrl) {
      // Redirect zu Stripe Checkout
      window.location.href = promoData.checkoutUrl
      return
    } else {
      // Fallback: Auftrag ohne Promo anzeigen
      router.replace('/konto/angebote')
      return
    }
  } catch (err) {
    console.error('❌ Fehler beim Absenden / Promo:', err)
    alert(
      'Fehler beim Absenden. Dein Auftrag wurde möglicherweise nicht korrekt gespeichert oder die Bewerbung ist fehlgeschlagen.',
    )
  } finally {
    setIsLoading(false)
  }
}
    
  // 🔄 selectedVerfahren immer aus Verfahren 1 + 2 ableiten
useEffect(() => {
  const auswahl: string[] = []

  if (selectedOption1) auswahl.push(selectedOption1)
  if (selectedOption2) auswahl.push(selectedOption2)

  setSelectedVerfahren(auswahl)
}, [selectedOption1, selectedOption2])

const lieferArtLabel: Record<string, string> = {
  selbst: 'Ich liefere selbst',
  abholung: 'Abholung an meinem Standort',
};

const abholArtLabel: Record<string, string> = {
  selbst: 'Ich hole selbst ab',
  anlieferung: 'Anlieferung an meinem Standort',
};

const formatLieferArt = (value: string) => lieferArtLabel[value] ?? value;
const formatAbholArt = (value: string) => abholArtLabel[value] ?? value;


  const formatEUR = (cents: number) =>
    (cents / 100).toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR',
    })
 const formatDateDE = (value: string) =>
    new Date(value).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  const selectedPromoScore = promoPackages
    .filter((p) => bewerbungOptionen.includes(p.id))
    .reduce((sum, p) => sum + p.score, 0)

  const selectedTotalCents = promoPackages
    .filter((p) => bewerbungOptionen.includes(p.id))
    .reduce((sum, p) => sum + p.priceCents, 0)

  const calculateProgress = () => {
    let steps = 0
    if (photoFiles.length > 0) steps += 1
    if (beschreibung.trim().length > 0) steps += 1
    if (agbAccepted) steps += 1

    // Materialgüte
    if (materialGuete && (materialGuete !== 'Andere' || customMaterial)) {
      steps += 1
    }

    // Maße
    if (laenge && breite && hoehe && masse) {
      steps += 1
    }
    if (selectedOption1) steps += 1
    if (lieferDatum && abholDatum && lieferArt && abholArt) steps += 1

    const totalSteps = 7
    return Math.round((steps / totalSteps) * 100)
  }
    const handleReset = () => {
    // Dateien & Bilder
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setWarnungBilder('');
    setFileFiles([]);
    setWarnungDateien('');

    // Beschreibung
    setBeschreibung('');
    setBeschreibungError(false);

    // Verfahren / Spezifikationen
    setSelectedOption1('');
    setSelectedOption2('');
    setSpecSelections({});
    setVerfahrenError(false);
    setSelectedVerfahren([]);

    // Logistik
        // Logistik
    setLieferDatum('');
    setAbholDatum('');
    setLieferArt('');
    setAbholArt('');
    setLogistikError(false);
    setSerienauftrag(false);
    setRhythmus('');
    setSerienTermine([]);


    // Materialgüte & Abmessungen
    setMaterialGuete('');
    setCustomMaterial('');
    setMaterialGueteError(false);
    setLaenge('');
    setBreite('');
    setHoehe('');
    setMasse('');
    setAbmessungError(false);

    // Bewerbung / Promo
    setBewerbungOptionen([]);

    // AGB
    setAgbAccepted(false);
    setAgbError(false);

    // Vorschau & Feedback
    setVorschauOffen(false);
    setSuccessMessage('');
    setIsLoading(false);

    // ggf. Warnungen nochmal sicher löschen
    setWarnungBilder('');
    setWarnungDateien('');

    // Nach oben scrollen
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

 
  return (
    <div className={oswald.className}>
      <Navbar />
      <motion.div {...fadeIn} className={styles.progressContainer}>
        <div className={styles.progressBarWrapper}>
          <div
            className={styles.progressBar}
            style={{ width: `${calculateProgress()}%` }}
          >
            <span className={styles.progressValue}>
              {calculateProgress()}%
            </span>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className={styles.wrapper}>
        {/* Hinweisbox */}
        <motion.div {...fadeIn} className={styles.infoBox}>
          💡 Ab sofort ist das Einholen von Angeboten <strong>kostenlos</strong>!
          <a href="/agb" className={styles.infoLink}>
            Mehr erfahren
          </a>
        </motion.div>

        {/* Schrittübersicht */}
        <motion.div {...fadeIn} className={styles.stepsAnimation}>
  <h3 className={styles.stepsTitle}>
    Sag uns in 3 einfachen Schritten, was du{' '}
    <span className={styles.highlight}>erledigt</span> haben möchtest.
    <button
      type="button"
      onClick={() => setShowSteps(!showSteps)}
      className={styles.toggleButton}
    >
      {showSteps ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
  </h3>

          <AnimatePresence initial={false}>
            {showSteps && (
              <motion.div
                className={styles.stepsBoxContainer}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              >
                {[1, 2, 3].map((step, index) => (
  <motion.div
    key={step}
    className={styles.stepBox}
    onClick={() => scrollToSection(step)}   // ✅ scrollt jetzt zu den Kreisen
                    animate={{
                      borderColor:
                        index === activeStep ? '#00b4d8' : '#00e5ff',
                      boxShadow:
                        index === activeStep
                          ? '0 0 6px 2px rgba(0, 229, 255, 0.8)'
                          : '0 0 0 0 rgba(0,0,0,0)',
                      scale: index === activeStep ? 1.03 : 1.02,
                    }}
                    transition={{ duration: 0.7, ease: 'easeInOut' }}
                  >
                    <div
                      className={`${styles.stepNumber} ${
                        step === 2 ? styles.stepNumberMobileMargin : ''
                      }`}
                    >
                      {step}
                    </div>
                    <strong
                      className={`${styles.stepTitle} ${
                        index === 0 || index === 2 ? styles.mbMobile : ''
                      }`}
                    >
                      {
                        [
                          'Dateien hochladen',
                          'Verfahren wählen',
                          'Logistik festlegen',
                        ][index]
                      }
                    </strong>
                    <div className={styles.stepIcon}>{stepIcons[index]}</div>
                    <p>
                      {
                        [
                          'Lade Skizzen, Zeichnungen oder Fotos deiner Teile hoch – ganz einfach per Drag & Drop oder Klick. Je genauer Ihre Daten, desto präziser das Angebot.',
                          'Wähle die gewünschten Bearbeitungsverfahren und was dir wichtig ist: besondere Anforderungen an Schichtdicke, Verpackung, Termine, Rückfragen',
                          'Teile uns mit, ob es ein Serienauftrag werden soll oder, ob dein Material abgeholt & geliefert werden soll, oder du es selbst bringen möchtest.',
                        ][index]
                      }
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Dropzone für Bilder */}
        <motion.div {...fadeIn}>
          {/* Headline + Step-Nummer + Tooltip */}
          <div
          ref={step1Ref}  // 🔹 HIER
            style={{
              
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              marginTop: '0.65rem',
              marginBottom: '0.65rem',
            }}
          >
            <div className={styles.stepNumber}>1</div>
            <h2
              className={styles.headingSection}
              style={{ display: 'flex', alignItems: 'center', margin: 0 }}
            >
              Lade Fotos &amp; Dateien zu deinem Auftrag hoch
              <span className={styles.iconTooltip}>
                <HelpCircle size={18} />
                <span className={styles.tooltipText}>
                  Du kannst bis zu 8 Dateien zu Ihrem Auftrag hinzufügen (alle
                  gängigen Dateitypen).<br />
                  Beschichter möchten alle Details kennen, um alle
                  Anforderungen an den Auftrag erfüllen zu können.<br />
                  Dies gibt dir und dem Beschichter die nötige Sicherheit für
                  die Produktion Ihres Auftrags.
                </span>
              </span>
            </h2>
          </div>
          <div ref={bilderRef}>
            {/* Dropzone für Bilder */}
            <Dropzone
              label="Bilder hierher ziehen oder klicken"
              accept="image/*"
              maxFiles={8}
              files={photoFiles}
              setFiles={setPhotoFiles}
              type="bilder"
              setWarnung={setWarnungBilder}
              id="upload-bilder"
            />
            {warnungBilder && (
              <p className={styles.warnung}>{warnungBilder}</p>
            )}

            {/* Vorschau Bilder */}
            <DateiVorschau
              bilder
              files={photoFiles}
              previews={photoPreviews}
              onRemove={(index) => {
                const neue = [...photoFiles]
                neue.splice(index, 1)
                setPhotoFiles(neue)
              }}
            />
          </div>

          {/* Dropzone für sonstige Dateien */}
          <Dropzone
            label="Dateien (PDF, DXF, ZIP) hierher ziehen oder klicken"
            accept=".pdf,.zip,.dxf"
            maxFiles={8}
            files={fileFiles}
            setFiles={setFileFiles}
            type="dateien"
            setWarnung={setWarnungDateien}
            id="upload-dateien"
            istGueltig={istGueltigDatei}
          />
          {warnungDateien && (
            <p className={styles.warnung}>{warnungDateien}</p>
          )}

          {/* Vorschau Dateien */}
          <DateiVorschau
            bilder={false}
            files={fileFiles}
            onRemove={(index) => {
              const neue = [...fileFiles]
              neue.splice(index, 1)
              setFileFiles(neue)
            }}
          />
        </motion.div>

        <div className={styles.umrandung} ref={materialRef}>
          <div
          ref={step2Ref}   // 🔹 HIER
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              marginTop: '0.65rem',
              marginBottom: '0.65rem',
            }}
          >
            <div className={styles.stepNumber}>2</div>
            <h2
              className={styles.headingSection}
              style={{ display: 'flex', alignItems: 'center', margin: 0 }}
            >
              Verfahrensangaben machen
              <span className={styles.iconTooltip}>
                <HelpCircle size={18} />
                <span className={styles.tooltipText}>
                  Hier kannst du genaue Angaben zu den gewünschten Verfahren
                  machen.
                </span>
              </span>
            </h2>
          </div>
<VerfahrenUndLogistik
  selectedOption1={selectedOption1}
  setSelectedOption1={setSelectedOption1}
  selectedOption2={selectedOption2}
  setSelectedOption2={setSelectedOption2}
  specificationsMap={specificationsMap}
  specSelections={specSelections}
  setSpecSelections={setSpecSelections}
  verfahrenError={verfahrenError}
  verfahrenRef={verfahrenRef}
/>

<div className={styles.dividerLine} />

<MaterialGuete
  materialGuete={materialGuete}
  setMaterialGuete={setMaterialGuete}
  customMaterial={customMaterial}
  setCustomMaterial={setCustomMaterial}
  laenge={laenge}
  setLaenge={setLaenge}
  breite={breite}
  setBreite={setBreite}
  hoehe={hoehe}
  setHoehe={setHoehe}
  masse={masse}
  setMasse={setMasse}
  materialGueteError={materialGueteError}
  abmessungError={abmessungError}
  selectedVerfahren={selectedVerfahren}
/>

<div className={styles.dividerLine} />

<div ref={beschreibungRef}>
  <BeschreibungsBox
    text={beschreibung}
    setText={setBeschreibung}
    isRequired
    showError={beschreibungError}
  />
</div>

        </div>

        <div
          className={beschreibungsStyles.borderedContainer}
          ref={logistikRef}
        >
          <div className={beschreibungsStyles.textfeldContainer}>
            <div
            ref={step3Ref}   // 🔹 HIER
  style={{
    
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginTop: '0.65rem',
    marginBottom: '0.65rem',
  }}
>
  <div className={styles.stepNumber}>3</div>
  <h2
    className={styles.headingSection}
    style={{ display: 'flex', alignItems: 'center', margin: 0 }}
  >
    Logistik
    <span className={styles.iconTooltip}>
      <HelpCircle size={18} />
      <span className={styles.tooltipText}>
        Plane Anlieferung, Abholung und Transportart für deinen Auftrag.
      </span>
    </span>
  </h2>
</div>


              <LogistikSection
              lieferDatum={lieferDatum}
              setLieferDatum={setLieferDatum}
              abholDatum={abholDatum}
              setAbholDatum={setAbholDatum}
              lieferArt={lieferArt}
              setLieferArt={setLieferArt}
              abholArt={abholArt}
              setAbholArt={setAbholArt}
              logistikError={logistikError}
              serienauftrag={serienauftrag}
              setSerienauftrag={setSerienauftrag}
              rhythmus={rhythmus}
              setRhythmus={setRhythmus}
              onSerienTermineChange={setSerienTermine}
            />

          </div>
        </div>

        {/* Bewerbung – statisches Frontend-Panel */}
        <div
          className={styles.bewerbungPanel}
          role="region"
          aria-label="Bewerbung deiner Anfrage"
        >
          <div className={styles.bewerbungHeader}>
            <span className={styles.bewerbungIcon} aria-hidden></span>
            <p className={styles.bewerbungText}>
              Erhöhe deine Sichtbarkeit und erhalte bessere Angebote!
            </p>
          </div>

          <div className={styles.bewerbungGruppe}>
            {promoPackages.map((p) => (
              <label key={p.id} className={styles.bewerbungOption}>
                <input
                  type="checkbox"
                  onChange={() => toggleBewerbung(p.id)}
                  checked={bewerbungOptionen.includes(p.id)}
                />
                {p.icon}
                <span
                  style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                  }}
                >
                  <span>
                    {p.title} — {formatEUR(p.priceCents)}
                  </span>
                  <small style={{ color: '#64748b' }}>{p.subtitle}</small>
                </span>
              </label>
            ))}

            <p className={styles.steuerHinweis}>
              Steuern werden im Checkout berechnet.
            </p>
          </div>

          <div className={styles.promoHinweis} role="note" aria-live="polite">
            <div className={styles.promoHinweisRow}>
              <span className={styles.promoScore}>
                Deine Auswahl: +{selectedPromoScore} Promo-Punkte
              </span>
              <span className={styles.promoSumme}>
                Gesamt: {formatEUR(selectedTotalCents)}
              </span>
            </div>
            <small>
              Pakete addieren sich. Die Sortierung der Anzeigen erfolgt nach dem
              Promo-Score. Eine Startseiten-Platzierung ist{' '}
              <em>nicht garantiert</em> – wenn andere zeitgleich einen höheren
              Gesamtwert haben, erscheinen deren Anzeigen zuerst.
            </small>
          </div>
        </div>

        <div className={styles.agbContainer} ref={agbRef}>
          <motion.label
            className={`${styles.agbLabel} ${
              agbError ? styles.agbError : ''
            }`}
            animate={agbError ? { x: [0, -4, 4, -4, 0] } : {}}
            transition={{ duration: 0.3 }}
          >
            <input
              type="checkbox"
              id="agbCheckbox"
              checked={agbAccepted}
              onChange={(e) => {
                setAgbAccepted(e.target.checked)
                setAgbError(false)
              }}
            />
            <span>
              Ich akzeptiere die{' '}
              <a href="/agb" className={styles.nutzungsbedingungenLink}>
                Allgemeinen Geschäftsbedingungen
              </a>{' '}
              zur Gänze. Informationen zur Verarbeitung deiner Daten findest du
              in unserer{' '}
              <a href="/datenschutz" className={styles.agbLink}>
                Datenschutzerklärung
              </a>
              .
            </span>
          </motion.label>
        </div>

        <div className={styles.vorschauWrapper}>
          <button
            type="button"
            className={styles.vorschauToggle}
            onClick={() => setVorschauOffen(!vorschauOffen)}
          >
            {vorschauOffen ? 'Vorschau ausblenden ▲' : 'Vorschau anzeigen ▼'}
          </button>

          <AnimatePresence>
            {vorschauOffen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className={styles.vorschauContainer}
              ><h3>Deine Eingaben im Überblick</h3>

{/* 1️⃣ Bilder / Dateien */}
<p>
  <strong>Bilder:</strong> {photoFiles.length} Dateien hochgeladen
</p>
<p>
  <strong>Dateien:</strong> {fileFiles.length} Dateien hochgeladen
</p>

{/* 2️⃣ Verfahren & Spezifikationen */}
<p>
  <strong>Verfahren:</strong>{' '}
  {selectedOption1
    ? `${selectedOption1}${
        selectedOption2 ? ' – ' + selectedOption2 : ''
      }`
    : 'Noch keine Auswahl getroffen'}
</p>
{Object.keys(specSelections).length > 0 && (
  <div>
    <strong>Spezifikationen:</strong>
    {(Object.entries(specSelections) as [string, string | string[]][])
      .map(([rawKey, value], i) => {
        const display = Array.isArray(value) ? value.join(', ') : value

        // "v1__Eloxieren__farbeeloxieren" → verfahrenNameRaw="Eloxieren", fieldKeyRaw="farbeeloxieren"
        const withoutPrefix = rawKey.replace(/^v\d+__/, '')
        const [verfahrenNameRaw, fieldKeyRaw] = withoutPrefix.split('__')

        if (!verfahrenNameRaw) return null

        const verfahrenName = verfahrenNameRaw.trim()
        const fieldKeyLower = (fieldKeyRaw || '').toLowerCase()

        // Feld "verfahren" nicht nochmal anzeigen
        if (!fieldKeyRaw || fieldKeyLower === 'verfahren') {
          return null
        }

        // 1) Spezielle Schreibweisen
        const specialLabels: Record<string, string> = {
          farbeeloxieren: 'Farbe',       // ✅ nur „Farbe“
          farbe: 'Farbe',
          farbpalette: 'Farbpalette',
          glanzgrad: 'Glanzgrad',
          zertifizierungen: 'Zertifizierungen',
        }

        let fieldLabel = specialLabels[fieldKeyLower]

        // 2) Generische Heuristik für alles andere
        if (!fieldLabel) {
          let base = fieldKeyLower.replace(/_+/g, ' ').trim()

          const endings = ['eloxieren', 'lackieren', 'beschichten']
          for (const ending of endings) {
            if (base.endsWith(ending) && !base.includes(' ')) {
              const prefix = base.slice(0, -ending.length)
              base = (prefix ? prefix + ' ' : '') + ending
              break
            }
          }

          fieldLabel = base.replace(/(^|\s)\w/g, (m) => m.toUpperCase())
        }

        const label = `${verfahrenName} ${fieldLabel}`

        return (
          <p key={i}>
            {label}: {display}
          </p>
        )
      })}
  </div>
)}





{/* 3️⃣ Materialgüte */}
<p>
  <strong>Materialgüte:</strong>{' '}
  {materialGuete === 'Andere'
    ? `Andere (${customMaterial})`
    : materialGuete || 'Noch keine Angabe'}
</p>

{/* 4️⃣ Abmessungen & Masse */}
<p>
  <strong>Abmessungen größtes Werkstück (L/B/H):</strong>{' '}
  {laenge || breite || hoehe
    ? `${laenge || '–'} × ${breite || '–'} × ${hoehe || '–'} mm`
    : 'Noch keine Angaben gemacht'}
</p>
<p>
  <strong>Masse schwerstes Werkstück:</strong>{' '}
  {masse ? `${masse} kg` : 'Noch keine Angabe gemacht'}
</p>

{/* 5️⃣ Beschreibung */}
<p>
  <strong>Beschreibung:</strong>{' '}
  {beschreibung || 'Noch keine Angaben gemacht'}
</p>

{/* 6️⃣ Logistik */}
{/* 6️⃣ Logistik */}
<p>
  <strong>Lieferdatum:</strong>{' '}
  {lieferDatum
    ? formatDateDE(lieferDatum)
    : 'Noch kein Datum gewählt'}
</p>
<p>
  <strong>Abholdatum:</strong>{' '}
  {abholDatum
    ? formatDateDE(abholDatum)
    : 'Noch kein Datum gewählt'}
</p>

<p>
  <strong>Warenausgabe:</strong>{' '}
  {lieferArt ? formatLieferArt(lieferArt) : 'Nicht angegeben'}
</p>
<p>
  <strong>Warenrückgabe:</strong>{' '}
  {abholArt ? formatAbholArt(abholArt) : 'Nicht angegeben'}
</p>
{/* Serienauftrag / Serien-Termine */}
{serienauftrag && (
  <>
    <p>
      <strong>Serienauftrag:</strong>{' '}
      {rhythmus
        ? `Ja (${rhythmusLabel[rhythmus] ?? rhythmus})`
        : 'Ja (Rhythmus noch nicht gewählt)'}
    </p>
    {serienTermine.length > 0 && (

      <div>
        <strong>Serientermine:</strong>
        <ul>
          {serienTermine.map((t) => (
            <li key={t.nr}>
              #{t.nr}: {formatDateDE(t.liefer)} – {formatDateDE(t.abhol)}
            </li>
          ))}
        </ul>
      </div>
    )}
  </>
)}

{/* 7️⃣ Werbeoptionen */}
<p>
  <strong>Werbeoptionen:</strong>{' '}
  {bewerbungOptionen.length > 0
    ? bewerbungOptionen.join(', ')
    : 'Keine ausgewählt'}
</p>

{/* 8️⃣ AGB */}
<p>
  <strong>AGB:</strong>{' '}
  {agbAccepted ? '✓ akzeptiert' : '✗ nicht akzeptiert'}
</p>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

                <div style={{ textAlign: 'center' }}>
          <button
            type="submit"
            className={styles.absendenButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={styles.spinner}></span>
            ) : (
              'Jetzt Angebote einholen'
            )}
          </button>
          {successMessage && (
            <p className={styles.erfolg}>{successMessage}</p>
          )}
        </div>

        {/* 🔹 NEU: Alle Eingaben zurücksetzen */}
        <div className={styles.resetRow}>
          <button
            type="button"
            className={styles.resetButton}
            onClick={handleReset}
          >
            Alle Eingaben zurücksetzen
          </button>
        </div>
      </form>

    </div>
  )
}
