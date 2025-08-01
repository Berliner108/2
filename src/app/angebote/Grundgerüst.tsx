'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Star, Search, Crown, Upload, Settings, FileText, HelpCircle } from 'lucide-react'
import { Oswald } from 'next/font/google'
import styles from './Grundgeruest.module.css'
import Pager from './navbar/pager'
import Dropzone from './Dropzone'
import DateiVorschau from './DateiVorschau'
import BeschreibungsBox from './BeschreibungsBox'
import MaterialGuete from './MaterialGuete'
import VerfahrenUndLogistik from './VerfahrenUndLogistik'; // Pfad ggf. anpassen
import { specificationsMap } from '../components/SpezifikationenAngeboteEinholen';

const stepIcons = [
  <Upload size={40} />,
  <Settings size={40} />,
  <FileText size={40} />]

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '700']
})

// ✅ aktualisiertes fadeIn
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
}
export default function Formular() {
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

const [selectedOption1, setSelectedOption1] = useState('');
const [selectedOption2, setSelectedOption2] = useState('');
const [selectedOption3, setSelectedOption3] = useState('');

const [lieferDatum, setLieferDatum] = useState('');
const [abholDatum, setAbholDatum] = useState('');
const [lieferArt, setLieferArt] = useState('');
const [abholArt, setAbholArt] = useState('');
const [logistikError, setLogistikError] = useState(false);

const [verfahrenError, setVerfahrenError] = useState(false);
const verfahrenRef = useRef<HTMLDivElement>(null);


const [specSelections, setSpecSelections] = useState<Record<string, string | string[]>>({});
const allOptions = [
  "Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren",
  "Verzinnen", "Entlacken", "Aluminieren", "Strahlen", "Folieren",
  "Isolierstegverpressen", "Einlagern", "Entzinken", "Entzinnen", "Entnickeln",
  "Vernickeln", "Entanodisieren", "Entaluminieren", "Enteloxieren"
];
const validSecondOptions = {
  // ... dein ganzer Block von validSecondOptions hier rein ...
};
const validThirdOptions = {
  // ... dein ganzer Block von validThirdOptions hier rein ...
};

const istGueltigDatei = (file: File) => {
  const erlaubteEndungen = ['.pdf', '.zip', '.dxf'];
  const name = file.name.toLowerCase();
  return erlaubteEndungen.some(ext => name.endsWith(ext));
};
const [agbAccepted, setAgbAccepted] = useState(false)
const [agbError, setAgbError] = useState(false)
const agbRef = useRef<HTMLDivElement>(null)
const bilderRef = useRef<HTMLDivElement>(null)
const materialRef = useRef<HTMLDivElement>(null)
const logistikRef = useRef<HTMLDivElement>(null);



const [materialGuete, setMaterialGuete] = useState('');
const [customMaterial, setCustomMaterial] = useState('');
const [materialGueteError, setMaterialGueteError] = useState(false);

const [laenge, setLaenge] = useState('');
const [breite, setBreite] = useState('');
const [hoehe, setHoehe] = useState('');
const [masse, setMasse] = useState('');
const [abmessungError, setAbmessungError] = useState(false);

const [selectedVerfahren, setSelectedVerfahren] = useState<string[]>([]); // oder später aus deinem Verfahren-Block

const [bewerbungOptionen, setBewerbungOptionen] = useState<string[]>([])
const toggleBewerbung = (option: string) => {
  setBewerbungOptionen(prev =>
    prev.includes(option)
      ? prev.filter(o => o !== option)
      : [...prev, option]
  )
}
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(interval)
  }, [])
  useEffect(() => {
  const urls = photoFiles.map(file => URL.createObjectURL(file))
  setPhotoPreviews(urls)
  return () => urls.forEach(url => URL.revokeObjectURL(url))
}, [photoFiles])

const scrollToError = (ref: React.RefObject<HTMLElement>) => {
  if (ref.current) {
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  let hasError = false;

if (!materialGuete || (materialGuete === 'Andere' && !customMaterial)) {
  setMaterialGueteError(true);
  scrollToError(materialRef); // 👈
  hasError = true;
} else {
  setMaterialGueteError(false);
}

if (!laenge || !breite || !hoehe || !masse) {
  setAbmessungError(true);
  scrollToError(materialRef); // 👈
  hasError = true;
} else {
  setAbmessungError(false);
}
if (!lieferDatum || !abholDatum || !lieferArt || !abholArt) {
  setLogistikError(true);
  scrollToError(logistikRef);
  hasError = true;
} else if (new Date(lieferDatum) > new Date(abholDatum)) {
  setLogistikError(true);
  scrollToError(logistikRef);
  hasError = true;
} else {
  setLogistikError(false);
}
// AGB prüfen
if (!agbAccepted) {
  setAgbError(true);
  scrollToError(agbRef);
  hasError = true;
} else {
  setAgbError(false);
}
// Mindestens 1 Bild prüfen
if (photoFiles.length === 0) {
  setWarnungBilder('Bitte lade mindestens 1 Foto hoch.');
  scrollToError(bilderRef);
  hasError = true;
} else {
  setWarnungBilder('');
}
if (!selectedOption1) {
  setVerfahrenError(true);
  scrollToError(verfahrenRef);
  hasError = true;
} else {
  setVerfahrenError(false);
}

if (hasError) return;

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
formData.append('lieferDatum', lieferDatum);
formData.append('abholDatum', abholDatum);
formData.append('lieferArt', lieferArt);
formData.append('abholArt', abholArt);

  try {
    const res = await fetch('/api/auftrag-absenden', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
  console.error('Serverfehler mit Status:', res.status)
  throw new Error('Fehler beim Absenden')
}
    setSuccessMessage('✅ Auftrag erfolgreich aufgegeben! Du wirst weitergeleitet …')

    setTimeout(() => {
      window.location.href = '/auftragsboerse'
    }, 2500)

  } catch (err) {
    console.error('❌ Fehler beim Absenden:', err)
    alert('Fehler beim Absenden. Bitte versuche es erneut.')
  } finally {
    setIsLoading(false)
  }
}
const calculateProgress = () => {
  let steps = 0
  if (photoFiles.length > 0) steps += 1
  if (beschreibung.trim().length > 0) steps += 1
  if (agbAccepted) steps += 1

  // Materialgüte
  if (materialGuete && (materialGuete !== 'Andere' || customMaterial)) {steps += 1}

  // Maße
  if (laenge && breite && hoehe && masse) {steps += 1}
  if (selectedOption1) steps += 1;
  if (lieferDatum && abholDatum && lieferArt && abholArt) steps += 1;

  const totalSteps = 7 // nun 5 statt 3
  return Math.round((steps / totalSteps) * 100)
}
  return (
    <div className={oswald.className}>
      <Pager />
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
          <a href="/mehr-erfahren" className={styles.infoLink}>Mehr erfahren</a>
        </motion.div>

        {/* Schrittübersicht */}
        <motion.div {...fadeIn} className={styles.stepsAnimation}>
          <h3>
            Sag uns in 3 einfachen Schritten, was du <span className={styles.highlight}>erledigt</span> haben möchtest.
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
                    animate={{
                      borderColor: index === activeStep ? '#00b4d8' : '#00e5ff',
                      boxShadow: index === activeStep
                        ? '0 0 6px 2px rgba(0, 229, 255, 0.8)'
                        : '0 0 0 0 rgba(0,0,0,0)',
                      scale: index === activeStep ? 1.03 : 1.02,
                    }}
                    transition={{ duration: 0.7, ease: 'easeInOut' }}
                  >
                    <div className={`${styles.stepNumber} ${step === 2 ? styles.stepNumberMobileMargin : ''}`}>
                      {step}
                    </div>
                    <strong className={`${styles.stepTitle} ${(index === 0 || index === 2) ? styles.mbMobile : ''}`}>
                      {['Dateien hochladen', 'Verfahren & Logistik wählen', 'Beschreibung hinzufügen'][index]}
                    </strong>
                    <div className={styles.stepIcon}>{stepIcons[index]}</div>
                    <p>
                      {[
                        'Laden Sie Skizzen, Zeichnungen oder Fotos Ihrer Teile hoch – ganz einfach per Drag & Drop oder Klick. Je genauer Ihre Daten, desto präziser das Angebot.',
                        'Wählen Sie die gewünschten Bearbeitungsverfahren und geben Sie an, ob ihr Material abgeholt & geliefert werden soll, oder Sie es selbst bringen möchten.',
                        'Teilen Sie mit, was Ihnen wichtig ist: besondere Anforderungen an Schichtdicke, Verpackung, Termine, Rückfragen – Ihr Beschichtungswunsch wird erfüllt, dafür stehen wir.'
                      ][index]}
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
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginTop: '2.5rem',
    marginBottom: '2.5rem'
  }}>
    <div className={styles.stepNumber}>1</div>
    <h2 className={styles.headingSection} style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
      Lade Fotos &amp; Dateien zu deinem Auftrag hoch
      <span className={styles.iconTooltip}>
        <HelpCircle size={18} />
        <span className={styles.tooltipText}>
          Sie können bis zu 8 Dateien zu Ihrem Auftrag hinzufügen (alle gängigen Dateitypen).<br />
          Beschichter möchten alle Details kennen, um alle Anforderungen an den Auftrag erfüllen zu können.<br />
          Dies gibt Ihnen und dem Beschichter die nötige Sicherheit für die Produktion Ihres Auftrags.
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
  {warnungBilder && <p className={styles.warnung}>{warnungBilder}</p>}

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
  {warnungDateien && <p className={styles.warnung}>{warnungDateien}</p>}

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
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '2.5rem', marginBottom: '2.5rem' }}>
        <div className={styles.stepNumber}>2</div>
        <h2 className={styles.headingSection} style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
          Arbeitsschritte und Logistik wählen
          <span className={styles.iconTooltip}>
            <HelpCircle size={18} />
            <span className={styles.tooltipText}>
              Hier können Sie genaue Angaben zum gewünschten Verfahren machen.
            </span>
          </span>
        </h2>
</div>
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
<div ref={logistikRef}>
<VerfahrenUndLogistik
  selectedOption1={selectedOption1}
  setSelectedOption1={setSelectedOption1}
  selectedOption2={selectedOption2}
  setSelectedOption2={setSelectedOption2}
  selectedOption3={selectedOption3}
  setSelectedOption3={setSelectedOption3}
  specificationsMap={specificationsMap}
  specSelections={specSelections}
  setSpecSelections={setSpecSelections}
  lieferDatum={lieferDatum}
  setLieferDatum={setLieferDatum}
  abholDatum={abholDatum}
  setAbholDatum={setAbholDatum}
  lieferArt={lieferArt}
  setLieferArt={setLieferArt}
  abholArt={abholArt}
  setAbholArt={setAbholArt}
  logistikError={logistikError}
  verfahrenError={verfahrenError}
  verfahrenRef={verfahrenRef}
/>
</div>
</div>

<BeschreibungsBox text={beschreibung} setText={setBeschreibung} />
<div className={styles.bewerbungGruppe}>
  <label className={styles.bewerbungOption}>
    <input
      type="checkbox"
      onChange={() => toggleBewerbung('startseite')}
      checked={bewerbungOptionen.includes('startseite')}
    />
    <Star size={18} color="#f5b400" />
    Anzeige auf Startseite hervorheben (39,99 €)
  </label>

  <label className={styles.bewerbungOption}>
    <input
      type="checkbox"
      onChange={() => toggleBewerbung('suche')}
      checked={bewerbungOptionen.includes('suche')}
    />
    <Search size={18} color="#0070f3" />
    Anzeige in Suche priorisieren (17,99 €)
  </label>

  <label className={styles.bewerbungOption}>
    <input
      type="checkbox"
      onChange={() => toggleBewerbung('premium')}
      checked={bewerbungOptionen.includes('premium')}
    />
    <Crown size={18} color="#9b59b6" />
    Premium-Anzeige aktivieren (19,99 €)
  </label>

  <p className={styles.steuerHinweis}>Preise inkl. MwSt.</p>
</div>

<div className={styles.agbContainer} ref={agbRef}>

  <motion.label
    className={`${styles.agbLabel} ${agbError ? styles.agbError : ''}`}
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
      <a href="/nutzungsbedingungen" className={styles.nutzungsbedingungenLink}>
        Nutzungsbedingungen</a>{' '}zur Gänze. Informationen zur Verarbeitung deiner Daten findest du in unserer{' '}
      <a href="/datenschutz" className={styles.agbLink}>
        Datenschutzerklärung
      </a>.
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
      >
        <h3>Deine Eingaben im Überblick</h3>
        <ul>
          <li><strong>Bilder:</strong> {photoFiles.length} Dateien hochgeladen</li>
          <li><strong>Dateien:</strong> {fileFiles.length} Dateien hochgeladen</li>
          <li><strong>Materialgüte:</strong>{' '}  {materialGuete === 'Andere'    ? `Andere (${customMaterial})`    : materialGuete || 'Noch keine Angabe'}</li>
          <li>  <strong>Verfahren:</strong>{' '}  {selectedOption1? `${selectedOption1}${selectedOption2 ? ' – ' + selectedOption2 : ''}${selectedOption3 ? ' – ' + selectedOption3 : ''}`: 'Noch keine Auswahl getroffen'}</li>
           {Object.keys(specSelections).length > 0 && (
            <li>
                <strong>Spezifikationen:</strong><ul style={{ paddingLeft: '1rem', marginTop: '0.5rem' }}>{Object.entries(specSelections).map(([label, value], i) => (
                    <li key={i}>
                    {label}: {Array.isArray(value) ? value.join(', ') : value}
                    </li>
                ))}
                </ul>
            </li>
            )}
            <li><strong>Lieferdatum:</strong> {lieferDatum || 'Noch kein Datum gewählt'}</li>
            <li><strong>Abholdatum:</strong> {abholDatum || 'Noch kein Datum gewählt'}</li>
            <li><strong>Lieferart:</strong> {lieferArt || 'Nicht angegeben'}</li>
            <li><strong>Abholart:</strong> {abholArt || 'Nicht angegeben'}</li>
          <li><strong>Beschreibung:</strong> {beschreibung ? beschreibung : 'Noch keine Angaben gemacht'}</li>
          <li><strong>AGB:</strong> {agbAccepted ? '✓ akzeptiert' : '✗ nicht akzeptiert'}</li>
          <li><strong>Werbeoptionen:</strong> {bewerbungOptionen.length > 0 ? bewerbungOptionen.join(', ') : 'Keine ausgewählt'}</li>
        </ul>
      </motion.div>
    )}
  </AnimatePresence>
</div>

<div style={{ textAlign: 'center' }}>
  <button type="submit" className={styles.absendenButton} disabled={isLoading}>
    {isLoading ? (
      <span className={styles.spinner}></span>
    ) : (
      'Jetzt Angebote einholen'
    )}
  </button>
  {successMessage && <p className={styles.erfolg}>{successMessage}</p>}
</div>
</form>
</div>
  )
}
