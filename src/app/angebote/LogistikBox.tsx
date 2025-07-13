'use client';

import { motion } from 'framer-motion';
import styles from './LogistikBox.module.css';
import React, { useState } from 'react';

type Props = {
  lieferDatum: string;
  setLieferDatumAction: (value: string) => void;
  lieferArt: string;
  setLieferArtAction: (value: string) => void;
  abholDatum: string;
  setAbholDatumAction: (value: string) => void;
  abholArt: string;
  setAbholArtAction: (value: string) => void;
  showErrors?: boolean;
};

export default function LogistikBox({
  lieferDatum,
  setLieferDatumAction,
  lieferArt,
  setLieferArtAction,
  abholDatum,
  setAbholDatumAction,
  abholArt,
  setAbholArtAction,
  showErrors = false,
}: Props) {
  const [showTransportOption, setShowTransportOption] = useState(false);
  const [transportArt, setTransportArt] = useState('');
  

  const today = new Date().toISOString().split('T')[0];
  

  return (
    <motion.div
      className={styles.logistikBox}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <h4>Logistikdetails</h4>

      <div className={styles.gridLayout}>
        <div className={styles.formGroup}>
          <label>Lieferdatum:</label>
          <input
            type="date"
            value={lieferDatum}
            onChange={(e) => {
              const newLiefer = e.target.value;
              setLieferDatumAction(newLiefer);
              if (abholDatum && new Date(newLiefer) > new Date(abholDatum)) {
                setAbholDatumAction('');
              }
            }}
            min={today}
            required
            className={`${styles.inputBase} ${showErrors && !lieferDatum ? styles.inputError : ''}`}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Anlieferungsmethode:</label>
          <select
            value={lieferArt}
            onChange={(e) => setLieferArtAction(e.target.value)}
            required
            className={`${styles.inputBase} ${showErrors && !lieferArt ? styles.inputError : ''}`}
          >
            <option value="">Bitte wählen</option>
            <option value="Selbstanlieferung">Selbstanlieferung</option>
            <option value="Abholung durch Anbieter">Abholung durch Anbieter</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Abholdatum:</label>
          <input
            type="date"
            value={abholDatum}
            onChange={(e) => setAbholDatumAction(e.target.value)}
            min={lieferDatum || today}
            required
            className={`${styles.inputBase} ${showErrors && !abholDatum ? styles.inputError : ''}`}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Abholmethode:</label>
          <select
            value={abholArt}
            onChange={(e) => setAbholArtAction(e.target.value)}
            required
            className={`${styles.inputBase} ${showErrors && !abholArt ? styles.inputError : ''}`}
          >
            <option value="">Bitte auswählen</option>
            <option value="Selbstabholung">Selbstabholung</option>
            <option value="Lieferung durch Anbieter">Lieferung durch Anbieter</option>
          </select>
        </div>

        <div className={styles.formGroup}>
  <div className={styles.checkboxGroup}>
  <input
    type="checkbox"
    checked={showTransportOption}
    onChange={(e) => setShowTransportOption(e.target.checked)}
  />
  <label>Ich habe einen Serienauftrag</label>
</div>


  {showTransportOption && (
    <div style={{ marginTop: '0.9rem' }}>
      <label style={{ marginBottom: '0.9rem', display: 'block' }}>
        Rhythmus der Anlieferung:
        </label>

      <select
        value={transportArt}
        onChange={(e) => setTransportArt(e.target.value)}
        className={styles.dropdown}
      >
        <option value="">Bitte wählen</option>
        <option value="Täglich">Täglich</option>
        <option value="Wöchentlich">Wöchentlich</option>
        <option value="Alle zwei Wochen">Alle zwei Wochen</option>
        <option value="Monatlich">Monatlich</option>
      </select>
    </div>
  )}
</div>

        
      </div>
    </motion.div>
  );
}
