'use client';
import React, { useState, useEffect } from 'react';
import styles from './angebote.module.css';
import Pager from './navbar/pager';
import { useSearchParams } from 'next/navigation';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CustomDateInput } from "./CustomDateInput"; // Importiere die CustomDateInput-Komponente
import { registerLocale } from "react-datepicker";
import { de } from "date-fns/locale/de";
registerLocale("de", de);
import "react-datepicker/dist/react-datepicker.css";
import "./DatePickerOverrides.css";

export default function AngebotEinstellen() {
  const [dateien, setDateien] = useState<File[]>([]);
  const MAX_FILES = 8;
  const MAX_FILE_SIZE_MB = 5;
  
  const [firstSelection, setFirstSelection] = useState<string | null>(null);
  const [secondSelection, setSecondSelection] = useState<string | null>(null);
  const [thirdSelection, setThirdSelection] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); 
  
  const [isChecked, setIsChecked] = useState(false);  // Checkbox Zustand
  const [errorMessage, setErrorMessage] = useState("");  // Fehlermeldung

  const [zeigeUnterOptionen, setZeigeUnterOptionen] = useState(false);
  const [text, setText] = useState("");

  const [selectedOption1, setSelectedOption1] = useState<string | null>(null);
  const [selectedOption2, setSelectedOption2] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
const totalSteps = 5;
const progress = Math.round((currentStep / totalSteps) * 100);


  useEffect(() => {
    const urlFirst = searchParams.get('first');
    if (urlFirst) {
      setFirstSelection(urlFirst);
      setSecondSelection(null);
      setThirdSelection(null);
    }
  }, [searchParams]);

  useEffect(() => {
    const listener = (e: Event) => {
      const detail = (e as CustomEvent).detail as number;
      setSelectedDate(prev => {
        if (!prev) return new Date(); // Falls vorher null
        const newDate = new Date(prev);
        newDate.setDate(prev.getDate() + detail);
        return newDate;
      });
    };
    document.addEventListener("navigateDate", listener);
    return () => document.removeEventListener("navigateDate", listener);
  }, []);

 const handleCheckboxChange = () => {
  setIsChecked(!isChecked);
  if (!isChecked) {
    setErrorMessage("");  // Fehler zurücksetzen, wenn die Checkbox geändert wird
  }
};
const handleNext = () => {
  if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
};

const handleBack = () => {
  if (currentStep > 1) setCurrentStep(currentStep - 1);
};


const handleFormSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  // Überprüfen, ob die Checkbox aktiviert ist
  if (!isChecked) {
    setErrorMessage("Bitte akzeptieren Sie die Bedingungen."); // Fehlermeldung anzeigen
  } else {
    setErrorMessage(""); // Fehler zurücksetzen, wenn die Checkbox aktiviert ist
    // Weitere Formularverarbeitung hier, z.B. das Absenden der Daten
  }
};

  const allOptions = [
    "Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren","Verzinnen","Entlacken", "Aluminieren","Strahlen",
    "Folieren", "Isolierstegverpressen", "Einlagern", "Entzinken", "Entzinnen", "Entnickeln", "Vernickeln",
     "Entanodisieren", "Enteloxieren"
  ];
  const validSecondOptions: { [key: string]: string[] } = {
    "Nasslackieren": ["Folieren", "Isolierstegverpressen", "Einlagern"],
    "Pulverbeschichten": ["Folieren", "Isolierstegverpressen", "Einlagern"],
    "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Entlacken": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Strahlen","Folieren","Einlagern","Isolierstegverpressen","Entzinken", "Enten", "Anodisieren", "Verzinnen", "Veren", "Aluminieren", "Entanodisieren", "Enteloxieren", "Entzinnen"],
    "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Vernickeln", "Entnickeln", "Entlacken","Folieren","Einlagern","Isolierstegverpressen","Entzinken", "Enten", "Anodisieren", "Verzinnen", "Veren", "Aluminieren", "Entanodisieren", "Enteloxieren", "Entzinnen"],
    "Folieren": ["Isolierstegverpressen", "Einlagern"],
    "Isolierstegverpressen": ["Einlagern"],
    "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Strahlen", "Entlacken","Folieren","Einlagern","Vernickeln", "Entnickeln","Isolierstegverpressen","Entzinken", "Enten", "Anodisieren", "Verzinnen", "Veren", "Aluminieren", "Entanodisieren", "Enteloxieren", "Entzinnen"],
    "Entzinken": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Vernickeln", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
    "Entzinnen": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Vernickeln", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
    "Enten": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Vernickeln", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
    "Entnickeln": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Vernickeln", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
    "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Veren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Vernickeln": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Entanodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Anodisieren"],
    "Enteloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Eloxieren"],
  };
  const validThirdOptions: { [key: string]: { [key: string]: string[] } } = {
    "Nasslackieren": {
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Isolierstegverpressen": ["Einlagern"],
      "Einlagern": [],
    },
    "Pulverbeschichten": {
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Isolierstegverpressen": ["Einlagern"],
      "Einlagern": [],
    },
    "Verzinken": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Vernickeln": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Entnickeln": {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Veren", "Aluminieren"],
      "Strahlen":["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Veren", "Aluminieren"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
      "Isolierstegverpressen": ["Einlagern"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Veren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Vernickeln": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
    },
    "Eloxieren": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Entlacken": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen"],
      "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Eloxieren", "Folieren", "Einlagern", "Isolierstegverpressen", "Entzinken", "Entzinnen", "Enten", "Anodisieren", "Verzinnen", "Veren", "Aluminieren", "Entanodisieren", "Enteloxieren"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
      "Entzinken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
      "Enten": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Veren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Entanodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Anodisieren"],
      "Enteloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Eloxieren"],
      "Entzinnen": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
    },
    "Strahlen": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen"],
      "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen"],
      "Entlacken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Eloxieren", "Folieren", "Einlagern", "Isolierstegverpressen", "Entzinken", "Entzinnen", "Enten", "Anodisieren", "Verzinnen", "Veren", "Aluminieren", "Entanodisieren", "Enteloxieren"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
      "Entzinken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
      "Entzinnen": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
      "Enten": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Veren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Entanodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Anodisieren"],
      "Enteloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Eloxieren"],      
    },
    "Folieren": {
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],          
    },
    "Isolierstegverpressen": {
      "Einlagern": [],
    },
    "Einlagern": {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Isolierstegverpressen", "Strahlen"],
      "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Isolierstegverpressen", "Strahlen"],
      "Entlacken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Eloxieren", "Folieren", "Isolierstegverpressen", "Entzinken", "Entzinnen", "Enten", "Anodisieren", "Verzinnen", "Veren", "Aluminieren", "Entanodisieren", "Enteloxieren"],
      "Folieren": ["Isolierstegverpressen"],
      "Isolierstegverpressen": [],
      "Entzinken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
      "Entzinnen": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
      "Enten": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Veren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Entanodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen", "Anodisieren"],
      "Enteloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen", "Eloxieren"],      
    },
    "Entzinken": {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Veren", "Aluminieren"],
      "Strahlen":["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Veren", "Aluminieren"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
      "Isolierstegverpressen": ["Einlagern"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Veren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
    },
    "Entzinnen": {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Veren", "Aluminieren"],
      "Strahlen":["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Veren", "Aluminieren"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
      "Isolierstegverpressen": ["Einlagern"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Veren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
    },
    "Enten": {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Veren", "Aluminieren"],
      "Strahlen":["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Veren", "Aluminieren"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Veren", "Aluminieren"],
      "Isolierstegverpressen": ["Einlagern"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Veren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
    },
    "Anodisieren": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Verzinnen": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Veren": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Aluminieren": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Entanodisieren": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    },
    "Enteloxieren": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
      "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    },
  };
  const getSecondDropdownOptions = () => {
    if (!firstSelection || !validSecondOptions[firstSelection]) return [];
    return validSecondOptions[firstSelection];
  };
  const getThirdDropdownOptions = () => {
    if (
      !firstSelection ||
      !secondSelection ||
      !validThirdOptions[firstSelection] ||
      !validThirdOptions[firstSelection][secondSelection]
    )
      return [];
    return validThirdOptions[firstSelection][secondSelection];
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };
  const handleUploadClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    addFiles(files);
  };
  const addFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`"${file.name}" ist größer als ${MAX_FILE_SIZE_MB} MB und wird ignoriert.`);
        return false;
      }
      return true;
    });
    if (dateien.length + validFiles.length > MAX_FILES) {
      alert(`Maximal ${MAX_FILES} Dateien erlaubt.`);
      return;
    }
    setDateien(prev => [...prev, ...validFiles]);
  };
  const handleRemove = (index: number) => {
    setDateien(dateien.filter((_, i) => i !== index));
  };
  const getPreviewIcon = (file: File) => {
    if (file.type.startsWith('image/')) return URL.createObjectURL(file);
    if (file.type === 'application/pdf') return "/pdf-icon.png";
    if (file.name.endsWith('.zip')) return "/zip-icon.png";
    return "/file-icon.png";
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isChecked) {
      setErrorMessage("Bitte akzeptieren Sie die Bedingungen."); // Fehlermeldung anzeigen
    } else {
      setErrorMessage(""); // Fehler zurücksetzen, wenn die Checkbox aktiviert ist
      // Weitere Formularverarbeitung hier, z.B. das Absenden der Daten
    }
};
  return (
    <>   
      <Pager />
      
      <div className={styles.wrapper}>
        <div className={styles.progressContainer}>
  <div className={styles.progressBar} style={{ width: `${progress}%` }} />
  <p className={styles.progressText}>{progress}% abgeschlossen</p>
</div>

        <div className={styles.infoBox}>
          💡 Ab sofort ist das Einholen von Angeboten <strong>kostenlos</strong>!
          <a href="/mehr-erfahren" className={styles.infoLink}>Mehr erfahren</a>
        </div>
        <br />
        
        <h1 className={styles.subheading}>In 3 Schritten Angebote für Ihren Auftrag einholen</h1><br />
        <h2 className={styles.heading}>1. Dateien für deinen Auftrag hochladen</h2>
        <p className={styles.description}>
          Sie können bis zu 8 Dateien zu Ihrem Auftrag hinzufügen (alle gängigen Dateitypen). Beschichter möchten alle Details kennen um alle Anforderungen 
          an den Auftrag erfüllen zu können. Dies gibt Ihnen und dem Beschichter die benötigte Sicherheit für die Produktion Ihres Auftrags.
        </p>
        <form onSubmit={handleFormSubmit} className={styles.form}>

          <div
            className={styles.dropzone}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <div className={styles.counter}>{dateien.length} / {MAX_FILES} Dateien hochgeladen</div>
            <p className={styles.dropText}>
                Dateien hierher ziehen oder <span className={styles.clickHighlight}>klicken</span>
                </p>
            <input
              type="file"
              id="file-upload"
              multiple
              className={styles.input}
              onChange={handleUploadClick}
            />
          </div>

          {dateien.length > 0 && (
            <div className={styles.preview}>
              {dateien.map((file, index) => (
                <div className={styles.fileCard} key={index}>
                  <img
                    src={getPreviewIcon(file)}
                    alt="preview"
                    className={styles.fileIcon}
                  />
                  <p className={styles.fileName}>{file.name}</p>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className={styles.removeButton}
                  >
                    ✖
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className={styles.lineContainer}></div>
          <p className={styles.dropdownText}>2. Wähle den ersten Arbeitsschritt</p>
          {/* Dropdowns */}
        <div className={styles.dropdownContainer}>
  {/* Erster Dropdown */}
  
  <p className={styles.dropdownText}>Triff eine Auswahl für den ersten Arbeitsschritt</p>
  <select
    value={firstSelection || ""}
    onChange={(e) => {
      const value = e.target.value || null;
      setFirstSelection(value);
      setSecondSelection(null);
      setThirdSelection(null);
    }}
    className={styles.select}
  >
    <option value="" disabled hidden>Wähle den ersten Arbeitsschritt</option>
    <option value="">-- Auswahl zurücksetzen --</option>
    {allOptions.map((option, index) => (
      <option key={index} value={option}>{option}</option>
    ))}
  </select>

  {/* Zweiter Dropdown */}
  {firstSelection && getSecondDropdownOptions().length > 0 && (
    <>
      <p className={styles.dropdownText}>Triff eine Auswahl für den zweiten Arbeitsschritt (optional)</p>
      <select
        value={secondSelection || ""}
        onChange={(e) => {
          const value = e.target.value || null;
          setSecondSelection(value);
          setThirdSelection(null);
        }}
        className={styles.select}
      >
        <option value="" disabled hidden>Triff eine Auswahl</option>
        <option value="">-- Auswahl zurücksetzen --</option>
        {getSecondDropdownOptions().map((option, index) => (
          <option key={index} value={option}>{option}</option>
        ))}
      </select>
    </>
  )}

  {/* Dritter Dropdown */}
  {firstSelection && secondSelection && getThirdDropdownOptions().length > 0 && (
    <>
      <p className={styles.dropdownText}>Triff eine Auswahl für den dritten Arbeitsschritt (optional)</p>
      <select
        value={thirdSelection || ""}
        onChange={(e) => {
          const value = e.target.value || null;
          setThirdSelection(value);
        }}
        className={styles.select}
      >
        <option value="" disabled hidden>Triff eine Auswahl</option>
        <option value="">-- Auswahl zurücksetzen --</option>
        {getThirdDropdownOptions().map((option, index) => (
          <option key={index} value={option}>{option}</option>
        ))}
      </select>
    </>
  )}
</div>
        <div className={styles.lineContainer}></div>
        
        <p className={styles.dropdownText}>3. Logistik für den gesamten Auftrag</p>  
        <div className={styles.dropdownContainer}>   
        <p className={styles.dropdownText}></p>  
                    <div className={styles.radioSection}>
                    <h3>Das Material wird dem Beschichter überstellt per:</h3>               
                    {/* Gruppe 1 */}
                <div className={styles.radioGroup}>
                <label>
                <input
                    type="radio"
                    name="lieferung1"
                    value="selbst"
                    onChange={() => setSelectedOption1("selbst")}
                />
                Selbstanlieferung
                <a href="/Logistikersuche" className={styles.link1}> (Transporteur finden)</a>
                </label>
                <label>
                    <input
                    type="radio"
                    name="lieferung1"
                    value="selbst"
                    onChange={() => setSelectedOption1("selbst")}
                    />
                    Abholung an meinem Firmenstandort
                </label>
                <label>
                    <input
                    type="radio"
                    name="lieferung1"
                    value="lieferung"
                    onChange={() => setSelectedOption1("lieferung")}
                    />
                    Abholung an anderem Standort
                </label>
                {selectedOption1 === "lieferung" && (
                    <div className={styles.addressInput}>
                    <p>Adresse:</p>
                    <input type="text" placeholder="Straße, Hausnummer" />
                    <input type="text" placeholder="PLZ, Ort" />
                    </div>                    
                )}
                <label className="dateLabel">Datum der Zustellung / Selbstabholung:</label>                
                    <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    dateFormat="dd.MM.yyyy"
                    locale="de"
                    customInput={<CustomDateInput />}
                    minDate={new Date()}
                    popperPlacement="bottom-start" // Kalender erscheint nun linksbündig
                    />
                </div>
                </div>
                <div className={styles.radioSection}>
                    <h3>Das Material wird dem Auftraggeber überstellt per:</h3>                        
                    {/* Gruppe 2 */}
                <div className={styles.radioGroup}>
                <label>
                    <input
                    type="radio"
                    name="lieferung2"
                    value="selbst"
                    onChange={() => setSelectedOption2("selbst")}
                    />
                    Selbstabholung
                <a href="/Logistikersuche" className={styles.link1}> (Transporteur finden)</a>
                </label>
                <label>
                    <input
                    type="radio"
                    name="lieferung2"
                    value="selbst"
                    onChange={() => setSelectedOption2("selbst")}
                    />
                    Zustellung an meinem Firmenstandort
                </label>
                <label>
                    <input
                    type="radio"
                    name="lieferung2"
                    value="lieferung"
                    onChange={() => setSelectedOption2("lieferung")}
                    />
                    Zustellung an anderem Standort
                </label>
                {selectedOption2 === "lieferung" && (
                    <div className={styles.addressInput}>
                    <p>Adresse:</p>
                    <input type="text" placeholder="Straße, Hausnummer" />
                    <input type="text" placeholder="PLZ, Ort" />
                    </div>
                )}
                </div>
                    <br></br> 
                    <label className="dateLabel">Datum der Zustellung / Selbstabholung:</label> <br></br>
                    <DatePicker
                        selected={selectedDate}
                        onChange={(date) => setSelectedDate(date)}
                        dateFormat="dd.MM.yyyy"
                        locale="de"
                        customInput={<CustomDateInput />}
                        minDate={new Date()}
                        popperPlacement="bottom-start" // Kalender erscheint nun linksbündig
                    />
                    </div>
                      <label>
                                <input
                                    type="checkbox"
                                    name="autowaescheErweitert"
                                    onChange={(e) => setZeigeUnterOptionen(e.target.checked)}
                                />
                                Ich habe einen Serienauftrag
                                </label>
                                

                                {zeigeUnterOptionen && (
                                <div className={styles.optionRow}>
                                <span className={styles.optionLabel}>Zusatzoptionen:</span>
                                <label className={styles.checkboxLabel}>
                                  <input type="checkbox" /> Option 1
                                </label>
                                <label className={styles.checkboxLabel}>
                                  <input type="checkbox" /> Option 2
                                </label>
                              </div>
                              
                                )}
                                <br></br>
                  <label htmlFor="waschplatzName">Gesamte m² für meinen Auftrag:</label>
                    <input
                    type="text"
                    id="waschplatzName"
                    name="waschplatzName"
                    className={styles.customTextInput}
                    />
                    <p>Materialgüte (äußerste Schicht):</p>
                    <div className={styles.radioContainer}>
                  <label><input type="radio" name="auswahl1" value="Aluminium" /> Aluminium</label>
                  <label><input type="radio" name="auswahl1" value="Aluguss" /> Aluguss</label>
                  <label><input type="radio" name="auswahl1" value="Eloxal" /> Eloxal</label>
                  <label><input type="radio" name="auswahl1" value="Anodisiert" /> Anodisiert</label>
                  <label><input type="radio" name="auswahl1" value="Stahl" /> Stahl</label>
                  <label><input type="radio" name="auswahl1" value="Edelstahl" /> Edelstahl</label>
                  <label><input type="radio" name="auswahl1" value="Kupfer" /> Kupfer</label>
                  <label><input type="radio" name="auswahl1" value="Zink" /> Zink</label>
                  <label><input type="radio" name="auswahl1" value="Zinn" /> Zinn</label>
                  <label><input type="radio" name="auswahl1" value="Nickel" /> Nickel</label>
                  <label><input type="radio" name="auswahl1" value="" /> </label>
                  <label><input type="radio" name="auswahl1" value="Chrom" /> Chrom</label>
                  <label><input type="radio" name="auswahl1" value="Andere" /> Andere</label>
                  </div>
                  </div>
                  
          {/* Dynamische Module */}
          {firstSelection && (
            <div className={styles.dynamicModule}>
              <h3>Optional können Sie spezifische Angaben zum ersten Arbeitsschritt machen</h3>
              {firstSelection === "Pulverbeschichten" && (
                <>
                  

                  <label htmlFor="waschplatzName">Farbton oder Artikelnummer des Herstellers:</label>
                    <input
                    type="text"
                    id="waschplatzName"
                    name="waschplatzName"
                    className={styles.customTextInput}
                    />
                    <p>Farbpalette:</p>
                    <div className={styles.radioContainer}>
                    
                  <label><input type="radio" name="auswahl2" value="RAL" /> RAL</label>
                  <label><input type="radio" name="auswahl2" value="NCS" /> NCS</label>
                  <label><input type="radio" name="auswahl2" value="MCS" /> MCS</label>
                  <label><input type="radio" name="auswahl2" value="DB" /> DB</label>
                  <label><input type="radio" name="auswahl2" value="BS" /> BS</label>
                  <label><input type="radio" name="auswahl2" value="Munsell" /> Munsell</label>
                  <label><input type="radio" name="auswahl2" value="Candy" /> Candy</label>
                  <label><input type="radio" name="auswahl2" value="Neon" /> Neon</label>
                  <label><input type="radio" name="auswahl2" value="Pantone" /> Pantone</label>
                  <label><input type="radio" name="auswahl2" value="Sikkens" /> Sikkens</label>
                  <label><input type="radio" name="auswahl2" value="HKS" /> HKS</label>
                  <label><input type="radio" name="auswahl2" value="Nach Vorlage" /> Nach Vorlage</label>
                  <label><input type="radio" name="auswahl2" value="Klarlack" /> Klarlack</label>
                  <label><input type="radio" name="auswahl2" value="Sonderfarbe" /> Sonderfarbe</label>
                  <label><input type="radio" name="auswahl2" value="RAL D2-Design" /> RAL D2-Design</label>
                  <label><input type="radio" name="auswahl2" value="RAL E4-Effekt" /> RAL E4-Effekt</label></div>
                  <br></br>
                  <label><input type="checkbox" /> Ich brauche eine Duplexbeschichtung für erhöhten Korrosionsschutz (Grundierung & 2. Lackschicht)</label>                  
                  <label><input type="checkbox" /> Ich stelle den Lack für meinen Auftrag in ausreichender Menge und Qualität bei</label>

                  <p>Oberfläche:</p>
                  <div className={styles.radioContainer}>
                  <label><input type="radio" name="auswahl3" value="Glatt" /> Glatt</label>
                  <label><input type="radio" name="auswahl3" value="Feinstruktur" /> Feinstruktur</label>
                  <label><input type="radio" name="auswahl3" value="Grobstruktur" /> Grobstruktur</label></div>

                  <p>Glanzgrad:</p>
                  <div className={styles.radioContainer}>
                  <label><input type="radio" name="auswahl4" value="Hochglanz" /> Hochglanz</label>
                  <label><input type="radio" name="auswahl4" value="Seidenglanz" /> Seidenglanz</label>
                  <label><input type="radio" name="auswahl4" value="Glanz" /> Glanz</label>
                  <label><input type="radio" name="auswahl4" value="Matt" /> Matt</label>
                  <label><input type="radio" name="auswahl4" value="Seidenmatt" /> Seidenmatt</label>
                  <label><input type="radio" name="auswahl4" value="Stumpfmatt" /> Stumpfmatt</label></div>

                  <p>Effekt:</p>
                  <div className={styles.radioContainer}>
                  <label><input type="checkbox" /> Metallic</label>
                  <label><input type="checkbox" /> Fluoreszierend</label></div>

                  <p>Qualität:</p>
                  <div className={styles.radioContainer}>
                  <label><input type="radio" name="auswahl5" value="Polyester" /> Polyester</label>
                  <label><input type="radio" name="auswahl5" value="Epoxy-Polyester" /> Epoxy-Polyester</label>
                  <label><input type="radio" name="auswahl5" value="Polyester für Feuerverzinkung" /> Polyester für Feuerverzinkung</label>
                  <label><input type="radio" name="auswahl5" value="Thermoplast" /> Thermoplast</label></div>


                  <p>Zwingende Qualitätsanforderungen an den Beschichter:</p>
                  <div className={styles.radioContainer}>
                  <label><input type="checkbox" /> GSB Zertifizierung (alle Stufen)</label>
                  <label><input type="checkbox" /> Qualicoat Zertifizierung (alle Stufen)</label>
                  <label><input type="checkbox" /> Qualisteelcoat Zertifizierung</label>
                  <label><input type="checkbox" /> DIN 55634-2</label>
                  <label><input type="checkbox" /> DIN EN 1090-2</label>
                  <label><input type="checkbox" /> DBS 918 340</label>
                  <label><input type="checkbox" /> ISO:9001 Zertifizierung</label></div>
                </>
              )}
              
              {firstSelection === "Option 4" && (
                <>
                  <p>Wähle eine Farbe:</p>
                  <label><input type="radio" name="farbe1" value="rot" /> Rot</label>
                  <label><input type="radio" name="farbe1" value="blau" /> Blau</label>
                </>
              )}
              {firstSelection === "Verzinken" && (
                <>
                  <p>Welches Verfahren soll für das Verzinken angewendet werden?</p>
                  <label><input type="radio" name="auswahl13" value="Feuerverzinken" /> Feuerverzinken</label>
                  <label><input type="radio" name="auswahl13" value="Galvanisches Verzinken" /> Galvanisches Verzinken</label>
                  <label><input type="radio" name="auswahl13" value="Mechanisches Verzinken" /> Mechanisches Verzinken</label>
                  <label><input type="radio" name="auswahl13" value="Diffusionsverzinken" /> Diffusionsverzinken</label>
                  <label><input type="radio" name="auswahl13" value="Spritzverzinken" /> Spritzverzinken</label>
                  <label><input type="radio" name="auswahl13" value="Lamellenverzinken" /> Lamellenverzinken</label>
                </>
              )}
            </div>
          )}

          {secondSelection && (
            <div className={styles.dynamicModule}>
              <h3>Optional können Sie spezifische Angaben zum 2. Arbeitsschritt machen</h3>
              {secondSelection === "Option 5" && (
                <label>Benutzerdefinierter Text:
                  <input type="text" placeholder="Ihre Eingabe..." />
                </label>
              )}
              {secondSelection === "Option 8" && (
                <>
                  <label><input type="checkbox" /> Erweiterung 1</label>
                  <label><input type="checkbox" /> Erweiterung 2</label>
                </>
              )}
            </div>
          )}

          {thirdSelection && (
            <div className={styles.dynamicModule}>
              <h3>Optional können Sie spezifische Angaben zum 3. Arbeitsschritt machen</h3>
              {thirdSelection === "Pulverbeschichten" && (
                <>
                  <p>Bitte geben Sie Ihre Maße ein:</p>
                  <input type="number" placeholder="Breite (cm)" />
                  <input type="number" placeholder="Höhe (cm)" />
                </>
              )}
              {thirdSelection === "Nasslackieren" && (                
                <>
                <label>
                  <input type="radio" name="auswahl13" value="Standard" /> Standard
                </label>
                <label>
                  <input type="radio" name="auswahl13" value="Premium" /> Premium
                </label>
                <input
                    type="text"
                    placeholder="Weitere Angaben"
                    className="customTextInput"
                />
              </>
            )}
              {thirdSelection === "Verzinken" && (
                <>
                  <p>Welches Verfahren soll für das Verzinken angewendet werden?</p>
                  <label><input type="radio" name="auswahl13" value="Feuerverzinken" /> Feuerverzinken</label>
                  <label><input type="radio" name="auswahl13" value="Galvanisches Verzinken" /> Galvanisches Verzinken</label>
                  <label><input type="radio" name="auswahl13" value="Mechanisches Verzinken" /> Mechanisches Verzinken</label>
                  <label><input type="radio" name="auswahl13" value="Diffusionsverzinken" /> Diffusionsverzinken</label>
                  <label><input type="radio" name="auswahl13" value="Spritzverzinken" /> Spritzverzinken</label>
                  <label><input type="radio" name="auswahl13" value="Lamellenverzinken" /> Lamellenverzinken</label>
                </>
              )}
            </div>
          )}
        </form>
        <div className={styles.textfeldContainer}>
        <div className={styles.lineContainer}></div>
        <p className={styles.dropdownText}>4. Beschreibung</p>
  <textarea
    id="beschreibung"
    className={styles.oswaldTextarea}
    value={text}
    onChange={(e) => {
      if (e.target.value.length <= 300) {
        setText(e.target.value);
      }
    }}
      placeholder={`Um einen reibungslosen Ablauf zu gewährleisten, stellen Sie bitte sicher, dass Ihr Material:

- Den Angaben entspricht (keine qualitativen / quantitativen Abweichungen)
- Frei von Fremdstoffen ist (Rost, Zunder, Kleber, Fette, Öle, Lacke, Schmutz, Silikon, etc.)
- Bei thermischen Verfahren der Hitzeeinwirkung standhält
- Kontaktstellen zum Aufhängen / Einspannen verfügt; kennzeichnen Sie ggf. genau, an welcher Stelle ihr Material für die Beschichtung kontaktiert werden kann
- Dass die Verpackung Transportsicherheit und allg. Sicherheit gewährleistet)`}
  rows={5}
/>
  
<div className={styles.charCount}>{text.length}/300 Zeichen</div>

<form onSubmit={handleFormSubmit} className={styles.form}>
  <div className={`${styles.checkboxContainer} ${!isChecked ? styles.error : ""}`}>
    <input
      type="checkbox"
      id="terms"
      checked={isChecked}
      onChange={handleCheckboxChange} // Checkbox-Veränderung behandeln
    />
    <label htmlFor="terms">
      Ich akzeptiere die <a href="wissenswertes">Bedingungen</a>.
    </label>
  </div>

  <button type="submit" className={styles.submitButton}>
    Kostenlos Angebote einholen
  </button>
</form>
<div className={styles.stepNavigation}>
  <button onClick={handleBack} disabled={currentStep === 1}>
    Zurück
  </button>
  <button onClick={handleNext} disabled={currentStep === totalSteps}>
    Weiter
  </button>
</div>

</div>     
     </div>
    </>
  );
}
