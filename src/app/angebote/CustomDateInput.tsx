'use client';
import React, { forwardRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import datepickerStyles from "./CustomDateInput.module.css";

type Props = {
  value?: string;
  onClick?: () => void;
};

const formatDisplayDate = (date: Date): string => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return "Heute";
  if (isTomorrow) return "Morgen";

  const weekday = date.toLocaleDateString("de-DE", { weekday: "long" });
  const shortDate = date.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  });

  return `${weekday}, ${shortDate}`;
};

export const CustomDateInput = forwardRef<HTMLButtonElement, Props>(
  ({ value, onClick }, ref) => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Initialisiere mit dem aktuellen Datum

    const handleArrow = (offset: number) => {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + offset); // Navigiere das Datum um 1 Tag
      setSelectedDate(newDate); // Aktualisiere den Zustand
    };

    return (
      <div className={datepickerStyles.dateWrapper}>
        <button
          type="button"
          onClick={() => handleArrow(-1)} // Einen Tag zurück
          className={datepickerStyles.arrowButton}
        >
          <ChevronLeft size={18} />
        </button>

        <button
          className={datepickerStyles.customDateButton}
          onClick={onClick}
          ref={ref}
        >
          <Calendar size={18} style={{ marginRight: 8 }} />
          {formatDisplayDate(selectedDate)} {/* Zeige das Datum an */}
        </button>

        <button
          type="button"
          onClick={() => handleArrow(1)} // Einen Tag vorwärts
          className={datepickerStyles.arrowButton}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }
);

CustomDateInput.displayName = "CustomDateInput";
