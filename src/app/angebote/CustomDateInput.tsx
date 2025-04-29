import React, { forwardRef } from "react";
import datepickerStyles from "./CustomDateInput.module.css";

type Props = {
  value?: string;
  onClick?: () => void;
};

export const CustomDateInput = forwardRef<HTMLButtonElement, Props>(
  ({ value, onClick }, ref) => (
    <button
      className={datepickerStyles.customDateButton}
      onClick={onClick}
      ref={ref}
    >
      {value || "Datum wählen"}
    </button>
  )
);

CustomDateInput.displayName = "CustomDateInput";
