'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './Materialguete.module.css'
import { HelpCircle } from 'lucide-react' // falls nicht schon importiert

interface MaterialGueteProps {
  materialGuete: string
  setMaterialGuete: (value: string) => void
  customMaterial: string
  setCustomMaterial: (value: string) => void
  selectedVerfahren: string[]
  laenge: string
  setLaenge: (value: string) => void
  breite: string
  setBreite: (value: string) => void
  hoehe: string
  setHoehe: (value: string) => void
  masse: string
  setMasse: (value: string) => void
  materialGueteError: boolean
  abmessungError: boolean
}

export default function MaterialGuete({
  materialGuete,
  setMaterialGuete,
  customMaterial,
  setCustomMaterial,
  selectedVerfahren,
  laenge,
  setLaenge,
  breite,
  setBreite,
  hoehe,
  setHoehe,
  masse,
  setMasse,
  materialGueteError,
  abmessungError
}: MaterialGueteProps) {
  const isEloxieren = selectedVerfahren.includes('Eloxieren')

  useEffect(() => {
    if (isEloxieren) setMaterialGuete('Aluminium')
  }, [isEloxieren])

  const materialOptions = [
    'Aluminium', 'Aluguss', 'Stahl','Edelstahl', 'Eloxiert', 'Anodisiert', 
     'Kupfer', 'Zink', 'Zinn', 'Nickel', 'Chrom', 'Andere'
  ]

  const allowOnlyDigits = (value: string, max: number) =>
  value.replace(/\D/g, '').slice(0, max)


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
      e.preventDefault()
    }
  }

  return (
    <div className={styles.materialBox}>
      <div className={styles.materialBoxÜB}>
  <p>
    Meine Teile sind aus:
    <span className={styles.iconTooltip}>
      <HelpCircle size={18} />
      <span className={styles.tooltipText}>
        Wählen Sie die passende Materialgüte. Bei „Andere“ bitte manuell ergänzen. Wichtig: Abmessungen und Masse-Angaben sind erforderlich für die Durchführbarkeit des Auftrags.
      </span>
    </span>
  </p>
</div>


<div className={styles.dropdownRow}>
  <select
    className={`${styles.dropdown} ${materialGueteError && !materialGuete ? styles.radioError : ''}`}
    value={materialGuete}
    onChange={(e) => setMaterialGuete(e.target.value)}
    disabled={isEloxieren}
  >
    <option value="">Bitte wählen</option>
    {materialOptions.map((option) => (
      <option key={option} value={option}>{option}</option>
    ))}
  </select>

  <AnimatePresence>
  {materialGuete === 'Andere' && (
    <motion.div
      key="custom"
      className={styles.customInputInline}
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: '180px' }}
      exit={{ opacity: 0, width: 0 }}
      transition={{ duration: 0.3 }}
    >
      <input
        type="text"
        placeholder="Material"
        maxLength={12} // Maximal 12 Zeichen
        value={customMaterial}
        onChange={(e) => {
          // Nur Buchstaben (inkl. Umlaute) erlauben
          const val = e.target.value.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
          setCustomMaterial(val);
        }}
        className={`${styles.inputField1} ${
          materialGueteError && !customMaterial ? styles.inputError : ''
        }`}
      />
    </motion.div>
  )}
</AnimatePresence>

</div>

      <div className={styles.abmessungWrapper}>

      <div className={styles.abmessungGruppe}>
  <h3 className={styles.gruppenTitel}>Abmessungen größtes Werkstück (mm):</h3>
  <div className={styles.rowGroup}>
    {/* Länge */}
    <div className={styles.labeledInputSideBySide}>
  <label className={styles.labelLeft}>Länge</label>
  <div className={styles.inputWithUnit}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          onKeyDown={handleKeyDown}
          value={laenge}
          onChange={(e) => setLaenge(allowOnlyDigits(e.target.value, 6))}

          className={`${styles.inputField} ${abmessungError && !laenge ? styles.inputError : ''}`}
        />
        <span>mm</span>
      </div>
    </div>

    {/* Breite */}
    <div className={styles.labeledInputSideBySide}>
  <label className={styles.labelLeft}>Breite</label>
  <div className={styles.inputWithUnit}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          onKeyDown={handleKeyDown}
          value={breite}
          onChange={(e) => setBreite(allowOnlyDigits(e.target.value, 6))}

          className={`${styles.inputField} ${abmessungError && !breite ? styles.inputError : ''}`}
        />
        <span>mm</span>
      </div>
    </div>

    {/* Höhe */}
    <div className={styles.labeledInputSideBySide}>
  <label className={styles.labelLeft}>Höhe</label>
  <div className={styles.inputWithUnit}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          onKeyDown={handleKeyDown}
          value={hoehe}
          onChange={(e) => setHoehe(allowOnlyDigits(e.target.value, 6))}
          className={`${styles.inputField} ${abmessungError && !hoehe ? styles.inputError : ''}`}
        />
        <span>mm</span>
      </div>
    </div>
  </div>
</div>

<div className={styles.masseGruppe}>
  <h3 className={styles.gruppenTitel}>Masse schwerstes Werkstück (kg):</h3>
  <div className={styles.inputWithUnit}>
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      onKeyDown={handleKeyDown}
      value={masse}
      onChange={(e) => setMasse(allowOnlyDigits(e.target.value, 4))}
      className={`${styles.inputField} ${abmessungError && !masse ? styles.inputError : ''}`}
    />
    <span>kg</span>
  </div>
</div>
</div>
</div>
   
  )
}
