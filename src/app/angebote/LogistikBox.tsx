'use client';

import { motion } from 'framer-motion';
import styles from './LogistikBox.module.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  gemeinsameFeiertageDEAT,
  isWeekend,
  toYMD,
  todayDate,
  minSelectableDate,
} from '../../lib/dateUtils';

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

/* ---------------- Mini-Kalender (Mo–So) ---------------- */

type MiniCalendarProps = {
  month: Date;
  onMonthChange: (next: Date) => void;
  selected?: Date | null;
  onSelect: (d: Date) => void;
  isDisabled: (d: Date) => boolean;
  minDate: Date;
};

function MiniCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  isDisabled,
  minDate,
}: MiniCalendarProps) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const firstOfMonth = new Date(y, m, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // Mo=0..So=6
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const weeks: Array<Array<Date | null>> = [];
  let week: Array<Date | null> = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(new Date(y, m, day));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const monthLabel = new Intl.DateTimeFormat('de-DE', {
    month: 'long',
    year: 'numeric',
  }).format(month);
  const goPrev = () => onMonthChange(new Date(y, m - 1, 1));
  const goNext = () => onMonthChange(new Date(y, m + 1, 1));

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 12,
        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        width: 320,
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <button
          type="button"
          onClick={goPrev}
          aria-label="Voriger Monat"
          style={{ padding: '4px 8px' }}
        >
          {'‹'}
        </button>
        <strong>{monthLabel}</strong>
        <button
          type="button"
          onClick={goNext}
          aria-label="Nächster Monat"
          style={{ padding: '4px 8px' }}
        >
          {'›'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          fontSize: 12,
          color: '#64748b',
          marginBottom: 4,
        }}
      >
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
          <div key={d} style={{ textAlign: 'center' }}>
            {d}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
        }}
      >
        {weeks.map((w, wi) =>
          w.map((d, di) => {
            if (!d) return <div key={`${wi}-${di}`} />;
            const disabled = isDisabled(d) || d < minDate;
            const isSelected = !!selected && toYMD(selected) === toYMD(d);
            return (
              <button
                key={`${wi}-${di}`}
                type="button"
                onClick={() => !disabled && onSelect(d)}
                disabled={disabled}
                style={{
                  padding: '8px 0',
                  borderRadius: 8,
                  border:
                    '1px solid ' +
                    (isSelected ? '#0ea5e9' : '#e2e8f0'),
                  background: disabled
                    ? '#f1f5f9'
                    : isSelected
                    ? '#e0f2fe'
                    : '#fff',
                  color: disabled ? '#94a3b8' : '#0f172a',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {d.getDate()}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

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

  // String-Props -> Date-State
  const [lieferDatumDate, setLieferDatumDate] = useState<Date | null>(() =>
    lieferDatum ? new Date(lieferDatum) : null,
  );
  const [abholDatumDate, setAbholDatumDate] = useState<Date | null>(() =>
    abholDatum ? new Date(abholDatum) : null,
  );

  useEffect(() => {
    setLieferDatumDate(lieferDatum ? new Date(lieferDatum) : null);
  }, [lieferDatum]);

  useEffect(() => {
    setAbholDatumDate(abholDatum ? new Date(abholDatum) : null);
  }, [abholDatum]);

  // Feiertags-/Werktag-Handling wie in sonderlacke
  const today = useMemo<Date>(() => todayDate(), []);
  const minDate = useMemo<Date>(() => minSelectableDate(), []);
  const todayIso = useMemo(() => toYMD(today), [today]);

  const holidaysSet = useMemo<Set<string>>(() => {
    const y = today.getFullYear();
    const s1 = gemeinsameFeiertageDEAT(y);
    const s2 = gemeinsameFeiertageDEAT(y + 1);
    return new Set<string>([...s1, ...s2]);
  }, [today]);

  const isDisabledDay = (d: Date): boolean => {
    if (d < minDate) return true;
    if (isWeekend(d)) return true;
    if (holidaysSet.has(toYMD(d))) return true;
    return false;
  };

  const isDisabledAbholDay = (d: Date): boolean => {
    if (isDisabledDay(d)) return true;
    if (!lieferDatumDate) return true;
    // Abholdatum MUSS nach dem Lieferdatum liegen
    if (d <= lieferDatumDate) return true;
    return false;
  };

  /* ---------------- Kalender-Overlay Logik (Liefer + Abhol) ---------------- */

  const [calOpen, setCalOpen] = useState<boolean>(false);
  const [calMonth, setCalMonth] = useState<Date>(() => today);
  const popoverRef = useRef<HTMLDivElement>(null);
  const dateFieldRef = useRef<HTMLDivElement>(null);

  const [abholCalOpen, setAbholCalOpen] = useState<boolean>(false);
  const [abholCalMonth, setAbholCalMonth] = useState<Date>(() => today);
  const abholPopoverRef = useRef<HTMLDivElement>(null);
  const abholFieldRef = useRef<HTMLDivElement>(null);

  // Monat setzen beim Öffnen
  useEffect(() => {
    if (calOpen) {
      if (lieferDatumDate) {
        setCalMonth(
          new Date(
            lieferDatumDate.getFullYear(),
            lieferDatumDate.getMonth(),
            1,
          ),
        );
      } else {
        setCalMonth(minDate);
      }
    }
  }, [calOpen, lieferDatumDate, minDate]);

  useEffect(() => {
    if (abholCalOpen) {
      if (abholDatumDate) {
        setAbholCalMonth(
          new Date(
            abholDatumDate.getFullYear(),
            abholDatumDate.getMonth(),
            1,
          ),
        );
      } else if (lieferDatumDate) {
        setAbholCalMonth(
          new Date(
            lieferDatumDate.getFullYear(),
            lieferDatumDate.getMonth(),
            1,
          ),
        );
      } else {
        setAbholCalMonth(minDate);
      }
    }
  }, [abholCalOpen, abholDatumDate, lieferDatumDate, minDate]);

  // Outside-Click / ESC für beide Kalender
  useEffect(() => {
    if (!calOpen && !abholCalOpen) return;

    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inLieferPopover = popoverRef.current?.contains(target);
      const inLieferField = dateFieldRef.current?.contains(target);
      const inAbholPopover = abholPopoverRef.current?.contains(target);
      const inAbholField = abholFieldRef.current?.contains(target);

      if (!inLieferPopover && !inLieferField) {
        setCalOpen(false);
      }
      if (!inAbholPopover && !inAbholField) {
        setAbholCalOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCalOpen(false);
        setAbholCalOpen(false);
      }
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [calOpen, abholCalOpen]);

  // Schließen bei Auswahl
  useEffect(() => {
    if (lieferDatumDate) setCalOpen(false);
  }, [lieferDatumDate]);

  useEffect(() => {
    if (abholDatumDate) setAbholCalOpen(false);
  }, [abholDatumDate]);

  // Wenn Lieferdatum geändert wird, Abhol-Datum invalidieren, falls zu früh/gleich
  useEffect(() => {
    if (lieferDatumDate && abholDatumDate && abholDatumDate <= lieferDatumDate) {
      setAbholDatumDate(null);
      setAbholDatumAction('');
    }
  }, [lieferDatumDate, abholDatumDate, setAbholDatumAction]);

  const handleSelectLieferdatum = (d: Date) => {
    setLieferDatumDate(d);
    const ymd = toYMD(d);
    setLieferDatumAction(ymd);

    if (abholDatumDate && abholDatumDate <= d) {
      setAbholDatumDate(null);
      setAbholDatumAction('');
    }
  };

  const handleSelectAbholdatum = (d: Date) => {
    // isDisabledAbholDay schützt gegen ungültige Auswahl
    if (isDisabledAbholDay(d)) return;
    setAbholDatumDate(d);
    setAbholDatumAction(toYMD(d));
  };

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
        {/* Lieferdatum mit Mini-Kalender */}
        <div className={styles.formGroup}>
          <label>Lieferdatum:</label>
          <div ref={dateFieldRef} className={styles.dateFieldRow}>
            <input
              type="text"
              readOnly
              className={`${styles.inputBase} ${
                showErrors && !lieferDatum ? styles.inputError : ''
              }`}
              value={
                lieferDatumDate
                  ? new Intl.DateTimeFormat('de-DE').format(lieferDatumDate)
                  : ''
              }
              placeholder="Datum wählen"
              onClick={() => setCalOpen(true)}
            />
            <button
              type="button"
              className={styles.zuruecksetzenButton}
              onClick={() => setCalOpen(true)}
            >
              Datum wählen
            </button>
            {lieferDatumDate && (
              <button
                type="button"
                className={styles.zuruecksetzenButton}
                onClick={() => {
                  setLieferDatumDate(null);
                  setLieferDatumAction('');
                }}
              >
                Löschen
              </button>
            )}
          </div>

          {calOpen && (
            <div
              ref={popoverRef}
              className={styles.calendarPopover}
              role="dialog"
              aria-label="Kalender Lieferdatum"
            >
              <MiniCalendar
                month={calMonth}
                onMonthChange={setCalMonth}
                selected={lieferDatumDate}
                onSelect={handleSelectLieferdatum}
                isDisabled={isDisabledDay}
                minDate={minDate}
              />
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Anlieferungsmethode:</label>
          <select
            value={lieferArt}
            onChange={(e) => setLieferArtAction(e.target.value)}
            required
            className={`${styles.inputBase} ${
              showErrors && !lieferArt ? styles.inputError : ''
            }`}
          >
            <option value="">Bitte wählen</option>
            <option value="Selbstanlieferung">Selbstanlieferung</option>
            <option value="Abholung durch Anbieter">
              Abholung durch Anbieter
            </option>
          </select>
        </div>

        {/* Abholdatum mit Mini-Kalender (immer nach Lieferdatum) */}
        <div className={styles.formGroup}>
          <label>Abholdatum:</label>
          <div ref={abholFieldRef} className={styles.dateFieldRow}>
            <input
              type="text"
              readOnly
              disabled={!lieferDatumDate}
              className={`${styles.inputBase} ${
                showErrors && !abholDatum ? styles.inputError : ''
              }`}
              value={
                abholDatumDate
                  ? new Intl.DateTimeFormat('de-DE').format(abholDatumDate)
                  : ''
              }
              placeholder={
                lieferDatumDate
                  ? 'Datum wählen'
                  : 'Bitte zuerst Lieferdatum wählen'
              }
              onClick={() => {
                if (!lieferDatumDate) return;
                setAbholCalOpen(true);
              }}
            />
            <button
              type="button"
              className={styles.zuruecksetzenButton}
              disabled={!lieferDatumDate}
              onClick={() => {
                if (!lieferDatumDate) return;
                setAbholCalOpen(true);
              }}
            >
              Datum wählen
            </button>
            {abholDatumDate && (
              <button
                type="button"
                className={styles.zuruecksetzenButton}
                onClick={() => {
                  setAbholDatumDate(null);
                  setAbholDatumAction('');
                }}
              >
                Löschen
              </button>
            )}
          </div>

          {abholCalOpen && (
            <div
              ref={abholPopoverRef}
              className={styles.calendarPopover}
              role="dialog"
              aria-label="Kalender Abholdatum"
            >
              <MiniCalendar
                month={abholCalMonth}
                onMonthChange={setAbholCalMonth}
                selected={abholDatumDate}
                onSelect={handleSelectAbholdatum}
                isDisabled={isDisabledAbholDay}
                minDate={lieferDatumDate ?? minDate}
              />
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Abholmethode:</label>
          <select
            value={abholArt}
            onChange={(e) => setAbholArtAction(e.target.value)}
            required
            className={`${styles.inputBase} ${
              showErrors && !abholArt ? styles.inputError : ''
            }`}
          >
            <option value="">Bitte auswählen</option>
            <option value="Selbstabholung">Selbstabholung</option>
            <option value="Lieferung durch Anbieter">
              Lieferung durch Anbieter
            </option>
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
              <label
                style={{
                  marginBottom: '0.9rem',
                  display: 'block',
                }}
              >
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
