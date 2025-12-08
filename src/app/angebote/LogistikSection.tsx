'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import styles from './VerfahrenUndLogistik.module.css';

import {
  todayDate,
  minSelectableDate,
  toYMD,
  isSelectable,
  isWeekend,
  gemeinsameFeiertageDEAT,
  addDays,
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
}

/* -------- Mini-Kalender -------- */
type MiniCalendarProps = {
  month: Date;
  onMonthChange: (next: Date) => void;
  selected?: Date | null;
  onSelect: (d: Date) => void;
  isDisabled: (d: Date) => boolean;
  minDate: Date;
  getDayInfo?: (d: Date) => {
    isLiefer?: boolean;
    isAbhol?: boolean;
    isSerie?: boolean;
  };
};

function MiniCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  isDisabled,
  minDate,
  getDayInfo,
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

            const info = typeof getDayInfo === 'function'
              ? getDayInfo(d)
              : undefined;

            let borderColor = isSelected ? '#0ea5e9' : '#e2e8f0';
            let background = disabled
              ? '#f1f5f9'
              : isSelected
              ? '#e0f2fe'
              : '#fff';
            let textColor = disabled ? '#94a3b8' : '#0f172a';
            let fontWeight: React.CSSProperties['fontWeight'] = 400;

            if (!disabled) {
              if (info?.isAbhol) {
                textColor = '#b91c1c'; // rot
                fontWeight = 600;
              } else if (info?.isLiefer) {
                textColor = '#15803d'; // grün
                fontWeight = 600;
              } else if (info?.isSerie) {
                textColor = '#0369a1'; // blau
              }
            }

            return (
              <button
                key={`${wi}-${di}`}
                type="button"
                onClick={() => !disabled && onSelect(d)}
                disabled={disabled}
                style={{
                  padding: '8px 0',
                  borderRadius: 8,
                  border: `1px solid ${borderColor}`,
                  background,
                  color: textColor,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight,
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

  // genau wie in der anderen Datei: heute + WE + gemeinsame Feiertage sperren
  const isDisabledDay = (d: Date): boolean => {
    if (d < minDate) return true;
    if (!isSelectable(d)) return true; // heute gesperrt
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

  const isSameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // 🔧 Bugfix: minDate NICHT in den Dependencies, sonst springt der Monat immer zurück
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
  }, [lieferCalOpen, lieferDatumDate]); // minDate bewusst nicht in deps

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
  }, [abholCalOpen, abholDatumDate, lieferDatumDate]); // minDate bewusst nicht in deps

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

  // Reset-Buttons
  const handleResetLiefer = () => {
    setLieferDatum('');
    setLieferDatumDate(null);
    setAbholDatum('');
    setAbholDatumDate(null);
    setLieferCalOpen(false);
    setAbholCalOpen(false);
  };

  const handleResetAbhol = () => {
    setAbholDatum('');
    setAbholDatumDate(null);
    setAbholCalOpen(false);
  };

  const [serienauftrag, setSerienauftrag] = useState(false);
  const [rhythmus, setRhythmus] = useState('');

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
    aufenthaltTage !== null && aufenthaltTage < 1; // ggf. auf < 7 anpassen

  // Rhythmus-Abhängigkeiten: wöchentlich nur ab 7 Tagen, etc.
  const isRhythmusOptionDisabled = (key: string): boolean => {
    if (aufenthaltTage == null) return true;
    switch (key) {
      case 'taeglich':
        return aufenthaltTage < 1;
      case 'woechentlich':
        return aufenthaltTage < 7;
      case 'zweiwoechentlich':
        return aufenthaltTage < 14;
      case 'monatlich':
        return aufenthaltTage < 30;
      default:
        return false;
    }
  };

  // Wenn sich der Zeitraum ändert und der aktuelle Rhythmus nicht mehr passt → zurücksetzen
  useEffect(() => {
    if (!serienauftrag || rhythmus === '' || aufenthaltTage == null) return;

    const invalid =
      (rhythmus === 'woechentlich' && aufenthaltTage < 7) ||
      (rhythmus === 'zweiwoechentlich' && aufenthaltTage < 14) ||
      (rhythmus === 'monatlich' && aufenthaltTage < 30) ||
      (rhythmus === 'taeglich' && aufenthaltTage < 1);

    if (invalid) {
      setRhythmus('');
    }
  }, [aufenthaltTage, serienauftrag, rhythmus]);

  // Wenn Zeitraum extrem kurz wird → Serienauftrag komplett zurücksetzen
  useEffect(() => {
    if (serienauftragDisabled && serienauftrag) {
      setSerienauftrag(false);
      setRhythmus('');
    }
  }, [serienauftragDisabled, serienauftrag]);

  // Alle Serien-Termine (Anlieferungen) berechnen
  const serienTermine = useMemo(() => {
    if (!serienauftrag || !lieferDatumDate || !rhythmus) return [];

    const result: Date[] = [];

    let current = new Date(
      lieferDatumDate.getFullYear(),
      lieferDatumDate.getMonth(),
      lieferDatumDate.getDate(),
    );

    const end = abholDatumDate
      ? new Date(
          abholDatumDate.getFullYear(),
          abholDatumDate.getMonth(),
          abholDatumDate.getDate(),
        )
      : addDays(current, 90);

    const maxIterations = 50;

    const advance = (d: Date): Date => {
      switch (rhythmus) {
        case 'taeglich':
          return addDays(d, 1);
        case 'woechentlich':
          return addDays(d, 7);
        case 'zweiwoechentlich':
          return addDays(d, 14);
        case 'monatlich':
          return new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
        default:
          return d;
      }
    };

    let iterations = 0;
    while (current <= end && iterations < maxIterations) {
      result.push(new Date(current));
      const next = advance(current);
      if (next <= current) break;
      current = next;
      iterations++;
    }

    return result;
  }, [serienauftrag, rhythmus, lieferDatumDate, abholDatumDate]);

  const getDayInfo = (d: Date) => {
    const info: { isLiefer?: boolean; isAbhol?: boolean; isSerie?: boolean } =
      {};

    if (lieferDatumDate && isSameDate(d, lieferDatumDate)) {
      info.isLiefer = true;
    }

    if (abholDatumDate && isSameDate(d, abholDatumDate)) {
      info.isAbhol = true;
    }

    if (serienTermine.some((t) => isSameDate(t, d))) {
      info.isSerie = true;
    }

    return info;
  };

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

  return (
    <div
      className={`${styles.logistik} ${
        logistikError ? styles.errorFieldset : ''
      }`}
    >
      <p className={styles.logistikIntro}>
        Plane hier, wann die Teile bereit sind und wann du sie wieder erhalten möchtest.
      </p>

      {lieferDatum && abholDatum && aufenthaltTage !== null && (
        <p className={styles.logistikSummary}>
          Aufenthalt beim Anbieter:{' '}
          <strong>{aufenthaltTage} Tage</strong> (
          {formatDateDE(lieferDatum)} – {formatDateDE(abholDatum)})
        </p>
      )}

      <div className={styles.logistikCards}>
        {/* Anlieferung */}
        <div className={styles.logistikCard}>
          <h5 className={styles.logistikCardTitle}>Anlieferung</h5>

          <div
            className={`${styles.inputGroup} ${styles.dateGroup}`}
            ref={lieferFieldRef}
          >
            <label>Lieferdatum</label>
            <div className={styles.dateFieldRow}>
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
              {lieferDatumDate && (
                <button
                  type="button"
                  className={styles.dateButton}
                  onClick={handleResetLiefer}
                >
                  Zurücksetzen
                </button>
              )}
            </div>

            {lieferCalOpen && (
              <div className={styles.calendarPopover} ref={lieferPopoverRef}>
                <MiniCalendar
                  month={lieferCalMonth}
                  onMonthChange={setLieferCalMonth}
                  selected={lieferDatumDate}
                  onSelect={handleSelectLieferdatum}
                  isDisabled={isDisabledDay}
                  minDate={minDate}
                  getDayInfo={getDayInfo}
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

        {/* Abholung */}
        <div className={styles.logistikCard}>
          <h5 className={styles.logistikCardTitle}>
            Abholung / Rücktransport
          </h5>

          <div
            className={`${styles.inputGroup} ${styles.dateGroup}`}
            ref={abholFieldRef}
          >
            <label>Abholdatum</label>
            <div className={styles.dateFieldRow}>
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
              {abholDatumDate && (
                <button
                  type="button"
                  className={styles.dateButton}
                  onClick={handleResetAbhol}
                >
                  Zurücksetzen
                </button>
              )}
            </div>

            {abholCalOpen && (
              <div className={styles.calendarPopover} ref={abholPopoverRef}>
                <MiniCalendar
                  month={abholCalMonth}
                  onMonthChange={setAbholCalMonth}
                  selected={abholDatumDate}
                  onSelect={handleSelectAbholdatum}
                  isDisabled={isDisabledAbholDay}
                  minDate={lieferDatumDate ?? minDate}
                  getDayInfo={getDayInfo}
                />
              </div>
            )}

            {!lieferDatum && (
              <span className={styles.helperText}>
                Bitte zuerst das Lieferdatum wählen.
              </span>
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

      {/* Legende für Farben im Kalender */}
      <div
        style={{
          marginTop: '0.5rem',
          fontSize: '0.8rem',
          color: '#64748b',
        }}
      >
        <strong>Kalender-Legende:</strong>{' '}
        <span style={{ color: '#15803d' }}>●</span> Anlieferung{' '}
        <span style={{ color: '#b91c1c', marginLeft: 8 }}>●</span> Abholung{' '}
        <span style={{ color: '#0369a1', marginLeft: 8 }}>●</span> Serien-Lieferung
      </div>

      {/* Zusammenfassung als Zeitstrahl / Timeline */}
      {lieferDatum && abholDatum && (
        <div className={styles.timelineBox}>
          <h5 className={styles.timelineTitle}>Dein Terminplan</h5>
          <ul className={styles.timelineList}>
            <li>
              <strong>📥 Anlieferung:</strong>{' '}
              {formatDateDE(lieferDatum)} –{' '}
              {lieferArt || 'Lieferart noch offen'}
            </li>
            <li>
              <strong>📤 Abholung:</strong>{' '}
              {formatDateDE(abholDatum)} –{' '}
              {abholArt || 'Abholart noch offen'}
            </li>
            {aufenthaltTage !== null && (
              <li>
                <strong>🕒 Aufenthalt beim Anbieter:</strong>{' '}
                {aufenthaltTage} Tage
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Serienauftrag-Bereich */}
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
          <p className={styles.serienHintInline}>
            Wenn aktiviert, planst du einen regelmäßig wiederkehrenden Auftrag.
          </p>
          {aufenthaltTage !== null && aufenthaltTage < 7 && (
            <p className={styles.helperText}>
              Wöchentliche oder längere Serien sind nur sinnvoll, wenn der
              Aufenthalt mindestens 7 Tage beträgt.
            </p>
          )}
        </div>

        {serienauftrag && (
          <div className={styles.serienauftragSelect}>
            <span>Rhythmus der Anlieferung:</span>
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

      {/* Serienauftrag-Zusammenfassung */}
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

          {serienTermine.length > 0 && (
            <>
              <p className={styles.seriesInfo}>
                Geplante Anlieferungen an diesen Tagen:
              </p>
              <ul className={styles.timelineList}>
                {serienTermine.slice(0, 12).map((d, idx) => (
                  <li key={idx}>{formatDateDE(toYMD(d))}{idx === 0 ? ' (Start)' : ''}</li>
                ))}
              </ul>
              {serienTermine.length > 12 && (
                <p className={styles.seriesHint}>
                  Weitere Termine folgen im gleichen Rhythmus.
                </p>
              )}
            </>
          )}

          <p className={styles.seriesHint}>
            Die exakten Folgetermine werden mit dem Anbieter im Detail
            abgestimmt. Fällt eine geplante Lieferung auf einen Feiertag
            oder einen nicht verfügbaren Tag, kann sich die tatsächliche
            Lieferung um einzelne Tage nach vorne oder hinten verschieben.
          </p>
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
