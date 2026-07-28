import type React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './Materialguete.module.css'
import { HelpCircle } from 'lucide-react'

interface MaterialGueteProps {
  materialGuete: string
  setMaterialGuete: (value: string) => void
  customMaterial: string
  setCustomMaterial: (value: string) => void
  selectedVerfahren: string[]
  materialienAktiv: string[]
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

const sanitizePositiveInt = (raw: string, maxDigits: number) => {
  const digits = raw.replace(/\D/g, "").slice(0, maxDigits)
  const noLeadingZeros = digits.replace(/^0+/, "") // 00012 -> 12

  // wenn leer oder 0 -> leer (damit dein abmessungError greift)
  if (!noLeadingZeros) return ""
  if (Number(noLeadingZeros) === 0) return ""

  return noLeadingZeros
}
const sanitizePositiveDecimal = (
  raw: string,
  maxIntegerDigits: number,
  maxDecimalDigits = 2,
) => {
  const separator = raw.includes(",") ? "," : "."
  const normalized = raw.replace(/[^0-9.,]/g, "")
  const firstSeparatorIndex = normalized.search(/[.,]/)

  const value =
    firstSeparatorIndex === -1
      ? normalized
      : normalized.slice(0, firstSeparatorIndex + 1) +
        normalized.slice(firstSeparatorIndex + 1).replace(/[.,]/g, "")

  const [integerRaw = "", decimalRaw = ""] = value.split(/[.,]/)
  const integerPart = integerRaw
    .replace(/^0+(?=\d)/, "")
    .slice(0, maxIntegerDigits)
  const decimalPart = decimalRaw.slice(0, maxDecimalDigits)

  if (!integerPart && !decimalPart) return ""

  if (Number(integerPart || "0") === 0 && Number(decimalPart || "0") === 0) {
    return firstSeparatorIndex !== -1 ? `0${separator}` : ""
  }

  if (firstSeparatorIndex !== -1) {
    return `${integerPart || "0"}${separator}${decimalPart}`
  }

  return integerPart
}
const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
  if (['e', 'E', '+', '-', '.'].includes(e.key)) {
    e.preventDefault()
  }
}
const handleDecimalKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
  if (['e', 'E', '+', '-'].includes(e.key)) {
    e.preventDefault()
  }
}

const isPositiveDecimal = (value: string) => Number(value.replace(",", ".")) > 0

export default function MaterialGuete({
  materialGuete,
  setMaterialGuete,
  customMaterial,
  setCustomMaterial,
  selectedVerfahren,
  materialienAktiv,
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

  

  return (
    <div className={styles.materialBox}>
      <div className={styles.materialBoxÜB}>
        <p>
          Meine Teile sind aus:
          <span className={styles.requiredStar}>*</span>
          <span className={styles.iconTooltip}>
            <HelpCircle size={18} />
            <span className={styles.tooltipText}>
              Wähle die passende Materialgüte. Bei „Andere“ bitte manuell
              ergänzen. Wichtig: Abmessungen und Masse-Angaben sind erforderlich
              für die Durchführbarkeit dieses Auftrags.
            </span>
          </span>
        </p>
      </div>

      {/* Material-Auswahl – normales select */}
      <div className={styles.dropdownRow}>
        <select
          className={`${styles.dropdown} ${
            materialGueteError && !materialGuete ? styles.inputError : ''
          }`}
          value={materialGuete}
          onChange={(e) => {
            const value = e.target.value
            setMaterialGuete(value)
            if (value !== 'Andere') {
              setCustomMaterial('')
            }
          }}
        >
          <option value="">Bitte Materialgüte wählen</option>
          {materialienAktiv.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
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
                placeholder="Material (Pflichtfeld)"
                maxLength={12}
                value={customMaterial}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^A-Za-zÄÖÜäöüß]/g, '')
                  setCustomMaterial(val)
                }}
                className={`${styles.inputField1} ${
                  materialGueteError && !customMaterial ? styles.inputError : ''
                }`}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Abmessungen & Masse – nebeneinander auf Desktop */}
      <div className={styles.abmessungWrapper}>
        <h3 className={styles.gruppenTitel}>
          Abmessungen des größten (mm) &amp; und Masse (kg) des schwersten Werkstücks:
          <span className={styles.requiredStar}>*</span>
        </h3>

        <div className={styles.abmessungRow}>
          {/* Länge */}
          <div className={styles.dimensionInline}>
            <span className={styles.dimensionLabel}>
              Länge<span className={styles.requiredStarInline}>*</span>
            </span>
            <div className={styles.inputWithUnit}>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]{0,1}"
                maxLength={7}
                onKeyDown={handleDecimalKeyDown}
                value={laenge}
                onChange={(e) => setLaenge(sanitizePositiveDecimal(e.target.value, 5, 1))}
                onBlur={() => {
                  if (!isPositiveDecimal(laenge)) {
                    setLaenge("")
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault()
                  setLaenge(sanitizePositiveDecimal(e.clipboardData.getData("text"), 5, 1))
                }}
                className={`${styles.inputField} ${
                  abmessungError && !laenge ? styles.inputError : ""
                }`}
              />

              <span>mm</span>
            </div>
          </div>

          {/* Breite */}
          <div className={styles.dimensionInline}>
            <span className={styles.dimensionLabel}>
              Breite<span className={styles.requiredStarInline}>*</span>
            </span>
            <div className={styles.inputWithUnit}>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]{0,1}"
                maxLength={7}
                onKeyDown={handleDecimalKeyDown}
                value={breite}
                onChange={(e) => setBreite(sanitizePositiveDecimal(e.target.value, 5, 1))}
                onBlur={() => {
                  if (!isPositiveDecimal(breite)) {
                    setBreite("")
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault()
                  setBreite(sanitizePositiveDecimal(e.clipboardData.getData("text"), 5, 1))
                }}
                className={`${styles.inputField} ${
                  abmessungError && !breite ? styles.inputError : ""
                }`}
              />

              <span>mm</span>
            </div>
          </div>

          {/* Höhe */}
          <div className={styles.dimensionInline}>
            <span className={styles.dimensionLabel}>
              Höhe<span className={styles.requiredStarInline}>*</span>
            </span>
            <div className={styles.inputWithUnit}>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]{0,1}"
                maxLength={7}
                onKeyDown={handleDecimalKeyDown}
                value={hoehe}
                onChange={(e) => setHoehe(sanitizePositiveDecimal(e.target.value, 5, 1))}
                onBlur={() => {
                  if (!isPositiveDecimal(hoehe)) {
                    setHoehe("")
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault()
                  setHoehe(sanitizePositiveDecimal(e.clipboardData.getData("text"), 5, 1))
                }}
                className={`${styles.inputField} ${
                  abmessungError && !hoehe ? styles.inputError : ""
                }`}
              />

              <span>mm</span>
            </div>
          </div>

          {/* Masse */}
          <div className={styles.dimensionInline}>
            <span className={styles.dimensionLabel}>
              Masse<span className={styles.requiredStarInline}>*</span>
            </span>
            <div className={styles.inputWithUnit}>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]{0,2}"
                maxLength={8}
                onKeyDown={handleDecimalKeyDown}
                value={masse}
                onChange={(e) => setMasse(sanitizePositiveDecimal(e.target.value, 5, 2))}
                onBlur={() => {
                  if (!isPositiveDecimal(masse)) {
                    setMasse("")
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault()
                  setMasse(sanitizePositiveDecimal(e.clipboardData.getData("text"), 5, 2))
                }}
                className={`${styles.inputField} ${
                  abmessungError && !masse ? styles.inputError : ""
                }`}
              />

              <span>kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
