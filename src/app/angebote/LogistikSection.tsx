'use client';

import React, { useState, useRef, useEffect, RefObject } from 'react';
import { motion } from 'framer-motion';
import styles from './VerfahrenUndLogistik.module.css';
import {
  todayDate,
  minSelectableDate,
  toYMD,
  isSelectable,
} from '../../lib/dateUtils';

interface LogistikSectionProps {
  logistikRef: RefObject<HTMLFieldSetElement>;   // 👈 WICHTIG: Fieldset, nicht Div
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

/** -------- Mini-Kalender (wie gehabt) -------- */
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
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
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
        <button type="button" onClick={goPrev} aria-label="Voriger Monat" style={{ padding: '4px 8px' }}>
          ‹
        </button>
        <strong>{monthLabel}</strong>
        <button type="button" onClick={goNext} aria-label="Nächster Monat" style={{ padding: '4px 8px' }}>
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
                  border: `1px solid ${isSelected ? '#0ea5e9' : '#e2e8f0'}`,
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

/** -------- Logistik-Section -------- */
const LogistikSection: React.FC<LogistikSectionProps> = ({
  logistikRef,
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

  const isDisabledDay = (d: Date): boolean => {
    if (d < minDate) return true;
    if (!isSelectable(d)) return true;
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
  }, [lieferCalOpen, lieferDatumDate, minDate]);

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

  const [serienauftrag, setSerienauftrag] = useState(false);
  const [rhythmus, setRhythmus] = useState('');

  const aufenthaltTage =
    lieferDatum && abholDatum
      ? Math.max(
          0,
          Math.round(
            (new Date(abholDatum).getTime() - new Date(lieferDatum).getTime()) /
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
    <fieldset
      ref={logistikRef}  // 👈 jetzt typ-kompatibel
      className={`${styles.logistik} ${
        logistikError ? styles.errorFieldset : ''
      }`}
    >
      {/* ... Rest unverändert ... */}
      {/* (dein kompletter JSX-Code aus der vorherigen Version bleibt gleich) */}
    </fieldset>
  );
};

export default LogistikSection;
