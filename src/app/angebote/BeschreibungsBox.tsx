'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import styles from './BeschreibungsBox.module.css'

interface BeschreibungsBoxProps {
  text: string
  setText: (value: string) => void
}

const BeschreibungsBox: React.FC<BeschreibungsBoxProps> = ({ text, setText }) => {
  return (
    <div className={styles.borderedContainer}>
      <div className={styles.textfeldContainer}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginTop: '2.5rem',
            marginBottom: '2.5rem',
          }}
        >
          <div className={styles.stepNumber}>3</div>
          <h2 className={styles.headingSection} style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
            Beschreibung
            <span className={styles.iconTooltip}>
              <HelpCircle size={18} />
              <span className={styles.tooltipText}>
                Hier können Sie genaue Angaben zum gewünschten Verfahren machen.
              </span>
            </span>
          </h2>
        </div>
        <textarea
          id="beschreibung"
          className={styles.oswaldTextarea}
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= 400) {
              setText(e.target.value)
            }
          }}
          placeholder={`Um einen reibungslosen Ablauf zu gewährleisten, stellen Sie bitte sicher, dass Ihr Material:

- Den Angaben entspricht (keine qualitativen / quantitativen Abweichungen)
- Teile dem Beschichter mit, wie du deine Qualitätsanforderungen einschätzt (niedrig, mittel, hoch)
- Frei von Fremdstoffen ist (Rost, Zunder, Kleber, Fette, Öle, Lacke, Schmutz, Silikon, etc.)
- Bei thermischen Verfahren der Hitzeeinwirkung standhält
- Kontaktstellen zum Aufhängen / Einspannen verfügt; kennzeichnen Sie ggf. genau, an welcher Stelle ihr Material für die Beschichtung kontaktiert werden kann
- Dass die Verpackung Transportsicherheit und allg. Sicherheit gewährleistet
- Achtung: Angaben in der Beschreibung haben stets höhere Priorität als in den Verfahrensangaben!

Bei Bedarf kannst du Prüfprotokolle, Sichtseiten, Nebensichtseiten und Nichtsichtseiten, beschichtungsfreie Stellen, zusätzliche Normen und Standards, gewünschte Schichtdicken Verpackungsvorschrift, Details zur Vor- und Nachbehandlung, Anforderungen an das Beschichtungsergebnis (z.B. frei von Kratzern oder Fremdpartikeln, optisch funktional) hinzufügen.`}
          rows={6}
        />
        <div className={styles.charCount} style={{ color: text.length > 370 ? '#dc2626' : '#64748b' }}>
          {text.length}/400 Zeichen
        </div>
      </div>
    </div>
  )
}

export default BeschreibungsBox
