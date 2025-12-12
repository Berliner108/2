'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './VerfahrenUndLogistik.module.css';

import {
  todayDate,
  minSelectableDate,
  toYMD,
  isSelectable,
  isWeekend,
  gemeinsameFeiertageDEAT,
} from '../../lib/dateUtils';

interface LogistikSectionProps {
  lieferDatum: string;
  setLieferDatum: (value: string) => void;
  abholDatum: string;
  setAbholDatum: (value: string) => void;
  lieferArt: string;
  setLieferArt: (value: string) => void;
  abholArt: string;
  setAbholArt: (value: string) => void;
  logistikError: boolean;
  // 🔽 Serienauftrag
  serienauftrag: boolean;
  setSerienauftrag: (value: boolean) => void;
  rhythmus: string;
  setRhythmus: (value: string) => void;
  onSerienTermineChange?: (
    termine: { nr: number; liefer: string; abhol: string }[],
  ) => void;
}

/* -------- Mini-Kalender -------- */
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
          ‹
        </button>
        <strong>{monthLabel}</strong>
        <button
          type="button"
          onClick={goNext}
          aria-label="Nächster Monat"
          style={{ padding: '4px 8px' }}
        >
          ›
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
                  border: `1px solid ${
                    isSelected ? '#0ea5e9' : '#e2e8f0'
                  }`,
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

/* -------- Logistik-Section -------- */
const LogistikSection: React.FC<LogistikSectionProps> = ({
  lieferDatum,
  setLieferDatum,
  abholDatum,
  setAbholDatum,
  lieferArt,
  setLieferArt,
  abholArt,
  setAbholArt,
  logistikError,
  serienauftrag,
  setSerienauftrag,
  rhythmus,
  setRhythmus,
  onSerienTermineChange,
}) => {
  const today = todayDate();
  const minDate = minSelectableDate();

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

  // ❗ Wochenende + gemeinsame Feiertage sperren
  const isDisabledDay = (d: Date): boolean => {
    if (d < minDate) return true;
    if (!isSelectable(d)) return true;
    if (isWeekend(d)) return true;
    const feiertage = gemeinsameFeiertageDEAT(d.getFullYear());
    if (feiertage.has(toYMD(d))) return true;
    return false;
  };

  const isDisabledAbholDay = (d: Date): boolean => {
    if (isDisabledDay(d)) return true;
    if (!lieferDatumDate) return true;
    if (d <= lieferDatumDate) return true;
    return false;
  };

  const [lieferCalOpen, setLieferCalOpen] = useState(false);
  const [lieferCalMonth, setLieferCalMonth] = useState<Date>(() => today);
  const [abholCalOpen, setAbholCalOpen] = useState(false);
  const [abholCalMonth, setAbholCalMonth] = useState<Date>(() => today);

  const lieferFieldRef = useRef<HTMLDivElement | null>(null);
  const lieferPopoverRef = useRef<HTMLDivElement | null>(null);
  const abholFieldRef = useRef<HTMLDivElement | null>(null);
  const abholPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lieferCalOpen) {
      if (lieferDatumDate) {
        setLieferCalMonth(
          new Date(
            lieferDatumDate.getFullYear(),
            lieferDatumDate.getMonth(),
            1,
          ),
        );
      } else {
        setLieferCalMonth(minDate);
      }
    }
  }, [lieferCalOpen, lieferDatumDate]);

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
  }, [abholCalOpen, abholDatumDate, lieferDatumDate]);

  useEffect(() => {
    if (lieferDatumDate && abholDatumDate && abholDatumDate <= lieferDatumDate) {
      setAbholDatumDate(null);
      setAbholDatum('');
    }
  }, [lieferDatumDate, abholDatumDate, setAbholDatum]);

  const handleSelectLieferdatum = (d: Date) => {
    setLieferDatumDate(d);
    setLieferDatum(toYMD(d));

    if (abholDatumDate && abholDatumDate <= d) {
      setAbholDatumDate(null);
      setAbholDatum('');
    }
    setLieferCalOpen(false);
  };

  const handleSelectAbholdatum = (d: Date) => {
    if (isDisabledAbholDay(d)) return;
    setAbholDatumDate(d);
    setAbholDatum(toYMD(d));
    setAbholCalOpen(false);
  };

  const rhythmusLabel: Record<string, string> = {
    taeglich: 'täglich',
    woechentlich: 'wöchentlich',
    zweiwoechentlich: 'alle zwei Wochen',
    monatlich: 'monatlich',
  };

  const aufenthaltTage =
    lieferDatum && abholDatum
      ? Math.max(
          0,
          Math.round(
            (new Date(abholDatum).getTime() -
              new Date(lieferDatum).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  const formatDateDE = (value: string) =>
    new Date(value).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  // Serienauftrag nur sinnvoll, wenn der Zeitraum lang genug ist
  const serienauftragDisabled =
    aufenthaltTage !== null && aufenthaltTage < 1;

  // Rhythmus-Abhängigkeiten
// Rhythmus-Abhängigkeiten: ein Rhythmus ist nur wählbar,
// wenn mindestens 2 Zyklen in den Zeitraum passen
const isRhythmusOptionDisabled = (key: string): boolean => {
  if (aufenthaltTage == null) return true;

  // Schrittweite (Tage) pro Rhythmus
  let stepDays = 0;
  switch (key) {
    case 'taeglich':
      stepDays = 1;
      break;
    case 'woechentlich':
      stepDays = 7;
      break;
    case 'zweiwoechentlich':
      stepDays = 14;
      break;
    case 'monatlich':
      stepDays = 30; // pragmatisch
      break;
    default:
      return true;
  }

  // mindestens 2 Zyklen notwendig
  const minSpanForTwoCycles = stepDays * 2;

  // aufenthaltTage ist dein Zeitraum: abholDatum - lieferDatum
  return aufenthaltTage < minSpanForTwoCycles;
};

useEffect(() => {
  if (!serienauftrag || rhythmus === '' || aufenthaltTage == null) return;

  // Wenn der aktuell gewählte Rhythmus laut neuer Logik
  // nicht (mehr) zulässig ist → zurücksetzen
  if (isRhythmusOptionDisabled(rhythmus)) {
    setRhythmus('');
  }
}, [aufenthaltTage, serienauftrag, rhythmus]);


  useEffect(() => {
    if (serienauftragDisabled && serienauftrag) {
      setSerienauftrag(false);
      setRhythmus('');
    }
  }, [serienauftragDisabled, serienauftrag, setSerienauftrag, setRhythmus]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      const inLieferField = lieferFieldRef.current?.contains(target) ?? false;
      const inLieferPopover = lieferPopoverRef.current?.contains(target) ?? false;
      if (!inLieferField && !inLieferPopover) {
        setLieferCalOpen(false);
      }

      const inAbholField = abholFieldRef.current?.contains(target) ?? false;
      const inAbholPopover = abholPopoverRef.current?.contains(target) ?? false;
      if (!inAbholField && !inAbholPopover) {
        setAbholCalOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLieferCalOpen(false);
        setAbholCalOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);
/* 👉 Serienlogik: Start/Ende + Rhythmus → Serien-Termine */
type SerienTermin = { nr: number; liefer: Date; abhol: Date };

const maxSerienTermine = 8;

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// wie viele Tage zwischen zwei Terminen (Rhythmus)
const getStepDaysForRhythmus = (r: string): number => {
  switch (r) {
    case 'taeglich':
      return 1;
    case 'woechentlich':
      return 7;
    case 'zweiwoechentlich':
      return 14;
    case 'monatlich':
      return 30; // pragmatisch, nicht kalendermonatsgenau
    default:
      return 0;
  }
};

const serienTermine: SerienTermin[] = [];

// 👉 Termine aus Start-/Enddatum + Rhythmus berechnen
if (serienauftrag && rhythmus && lieferDatumDate && abholDatumDate) {
  const stepDays = getStepDaysForRhythmus(rhythmus);

  if (stepDays > 0) {
    const endDate = abholDatumDate; // letzte Rückgabe darf nicht NACH diesem Datum sein
    let nr = 1;
    let currentLiefer = new Date(lieferDatumDate);

    while (nr <= maxSerienTermine && currentLiefer <= endDate) {
      // 1) Anlieferungsdatum für diesen Termin
      let liefer = new Date(currentLiefer);

      // falls auf gesperrten Tag → nach vorne schieben
      while (isDisabledDay(liefer) && liefer <= endDate) {
        liefer = addDays(liefer, 1);
      }
      if (liefer > endDate) break;

      // 2) Rückgabe = Anlieferung + stepDays (z.B. +7 bei wöchentlich)
      let abhol = addDays(liefer, stepDays);

      // Rückgabe auch von gesperrten Tagen wegschieben
      while (isDisabledDay(abhol)) {
        abhol = addDays(abhol, 1);
      }

      // wenn Rückgabe schon hinter dem Enddatum liegen würde → diesen Termin nicht mehr anzeigen
      if (abhol > endDate) break;

      serienTermine.push({ nr, liefer, abhol });

      // 3) Nächster Termin
      nr += 1;
      currentLiefer = addDays(liefer, stepDays);
    }
  }
}


const lieferArtLabelMap: Record<string, string> = {
  selbst: 'Ich liefere selbst',
  abholung: 'Abholung an meinem Standort',
};

const abholArtLabelMap: Record<string, string> = {
  selbst: 'Ich hole selbst ab',
  anlieferung: 'Anlieferung an meinem Standort',
};

  // Termine in Grundgerüst melden
// Termine in Grundgerüst melden
useEffect(() => {
  if (!onSerienTermineChange) return;

  if (!serienauftrag || !rhythmus || !lieferDatumDate || !abholDatumDate) {
    onSerienTermineChange([]);
    return;
  }

  const plain = serienTermine.map((t) => ({
    nr: t.nr,
    liefer: toYMD(t.liefer),
    abhol: toYMD(t.abhol),
  }));

  onSerienTermineChange(plain);
}, [
  serienauftrag,
  rhythmus,
  lieferDatum,
  abholDatum,
  JSON.stringify(serienTermine),
]);


  return (
    <div
      className={`${styles.logistik} ${
        logistikError ? styles.errorFieldset : ''
      }`}
    >
      <p className={styles.logistikIntro}>
        Plane hier, wann die Teile bereit zur Beschichtung sind und wann du sie
        wieder erhalten willst.
      </p>

      {/* Karten: Anlieferung / Rücktransport */}
      <div className={styles.logistikCards}>
        {/* Anlieferung */}
        <div className={styles.logistikCard}>
          <h5 className={styles.logistikCardTitle}>Anlieferung / Abholung</h5>

          <div className={styles.inputGroup} ref={lieferFieldRef}>
            <label>Warenausgabedatum</label>
            <input
              type="text"
              readOnly
              placeholder="Datum wählen"
              onClick={() => setLieferCalOpen((prev) => !prev)}
              value={lieferDatumDate ? formatDateDE(lieferDatum) : ''}
              className={
                logistikError && !lieferDatum ? styles.inputError : ''
              }
            />

            {lieferCalOpen && (
              <div className={styles.calendarPopover} ref={lieferPopoverRef}>
                <MiniCalendar
                  month={lieferCalMonth}
                  onMonthChange={setLieferCalMonth}
                  selected={lieferDatumDate}
                  onSelect={handleSelectLieferdatum}
                  isDisabled={isDisabledDay}
                  minDate={minDate}
                />
              </div>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label>Lieferart</label>
            <select
              value={lieferArt}
              onChange={(e) => setLieferArt(e.target.value)}
              className={
                logistikError && !lieferArt ? styles.inputError : ''
              }
            >
              <option value="">Bitte wählen</option>
              <option value="selbst">Ich liefere selbst</option>
              <option value="abholung">Abholung an meinem Standort</option>
            </select>
          </div>
        </div>

        {/* Rücktransport */}
        <div className={styles.logistikCard}>
          <h5 className={styles.logistikCardTitle}>
            Abholung / Rücktransport
          </h5>

          <div className={styles.inputGroup} ref={abholFieldRef}>
            <label>Warenrückgabedatum</label>
            <input
              type="text"
              readOnly
              placeholder={
                lieferDatum ? 'Datum wählen' : 'Zuerst Lieferdatum wählen'
              }
              onClick={() => {
                if (!lieferDatumDate) return;
                setAbholCalOpen((prev) => !prev);
              }}
              value={abholDatumDate ? formatDateDE(abholDatum) : ''}
              className={
                logistikError && !abholDatum ? styles.inputError : ''
              }
            />

            {abholCalOpen && (
              <div className={styles.calendarPopover} ref={abholPopoverRef}>
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

          <div className={styles.inputGroup}>
            <label>Abholart</label>
            <select
              disabled={!lieferDatum}
              value={abholArt}
              onChange={(e) => setAbholArt(e.target.value)}
              className={
                logistikError && !abholArt ? styles.inputError : ''
              }
            >
              <option value="">Bitte wählen</option>
              <option value="selbst">Ich hole selbst ab</option>
              <option value="anlieferung">
                Anlieferung an meinem Standort
              </option>
            </select>
          </div>
        </div>
      </div>
{/* Timeline Einzelauftrag */}
{lieferDatum && abholDatum && (
  <div className={styles.timelineBox}>
    <h5 className={styles.timelineTitle}>Dein Terminplan</h5>
    <ul className={styles.timelineList}>
      <li>
        <strong>📥 Warenausgabe:</strong>{' '}
        {formatDateDE(lieferDatum)} –{' '}
        {lieferArt
          ? lieferArtLabelMap[lieferArt] ?? lieferArt
          : 'Lieferart noch offen'}
      </li>
      <li>
        <strong>📤 Warenrückgabe:</strong>{' '}
        {formatDateDE(abholDatum)} –{' '}
        {abholArt
          ? abholArtLabelMap[abholArt] ?? abholArt
          : 'Abholart noch offen'}
      </li>
      {aufenthaltTage !== null && (
        <li>
          <strong>🕒 Zeitspanne des Auftrags:</strong>{' '}
          {aufenthaltTage} Tage
        </li>
      )}
    </ul>
  </div>
)}


      {/* Serienauftrag-Einstellungen */}
      <div className={styles.serienauftragRow}>
        <div className={styles.serienauftragLeft}>
          <label className={styles.serienCheckboxLabel}>
            <input
              type="checkbox"
              checked={serienauftrag}
              disabled={serienauftragDisabled}
              onChange={(e) => {
                const checked = e.target.checked;
                setSerienauftrag(checked);
                if (!checked) setRhythmus('');
              }}
            />
            Serienauftrag (wiederkehrende Lieferungen)
          </label>
          {aufenthaltTage !== null && aufenthaltTage < 7 && (
            <p className={styles.helperText}>
              Wöchentliche oder längere Serien sind nur möglich, wenn der
              Aufenthalt mindestens 7 Tage beträgt.
            </p>
          )}
        </div>

        {serienauftrag && (
          <div className={styles.serienauftragSelect}>
            <span>Rhythmus der An- und Auslieferung:</span>
            <select
              value={rhythmus}
              onChange={(e) => setRhythmus(e.target.value)}
            >
              <option value="">Bitte wählen</option>
              <option
                value="taeglich"
                disabled={isRhythmusOptionDisabled('taeglich')}
              >
                Täglich
              </option>
              <option
                value="woechentlich"
                disabled={isRhythmusOptionDisabled('woechentlich')}
              >
                Wöchentlich
              </option>
              <option
                value="zweiwoechentlich"
                disabled={isRhythmusOptionDisabled('zweiwoechentlich')}
              >
                Alle zwei Wochen
              </option>
              <option
                value="monatlich"
                disabled={isRhythmusOptionDisabled('monatlich')}
              >
                Monatlich
              </option>
            </select>
          </div>
        )}
      </div>

      {/* Serienauftrag-Zusammenfassung + Liste */}
      {serienauftrag && lieferDatum && rhythmus && (
        <div className={styles.seriesBox}>
          <h5 className={styles.seriesTitle}>Serienauftrag aktiviert</h5>
          <p className={styles.seriesInfo}>
            Start der Serie:{' '}
            <strong>{formatDateDE(lieferDatum)}</strong>
            <br />
            Rhythmus:{' '}
            <strong>{rhythmusLabel[rhythmus] ?? rhythmus}</strong>
          </p>
          <p className={styles.seriesHint}>
            Die exakten Folgetermine kannst du mit dem Beschichter im Detail
            abstimmen. Hier siehst du die grundlegende Planung für deinen
            wiederkehrenden Auftrag.
          </p>
        </div>
      )}

      {serienauftrag && rhythmus && serienTermine.length > 0 && (
        <div className={styles.seriesScheduleBox}>
          <h5 className={styles.seriesTitle}>
            Geplante Serien-Termine (max. 8)
          </h5>
          <ol className={styles.seriesScheduleList}>
            {serienTermine.map((t) => (
              <li key={t.nr} className={styles.seriesScheduleItem}>
                <span className={styles.seriesBadge}>#{t.nr}</span>
                <span>
                  📥 Warenausgabe:{' '}
                  <strong>
                    {t.liefer.toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </strong>
                  {' · '}
                  📤 Warenrückgabe:{' '}
                  <strong>
                    {t.abhol.toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </strong>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {logistikError && (
        <motion.p
          className={styles.warnung}
          animate={{ x: [0, -4, 4, -4, 0] }}
          transition={{ duration: 0.3 }}
        >
          Bitte fülle die Logistik vollständig und korrekt aus.
        </motion.p>
      )}
    </div>
  );
};

export default LogistikSection;
