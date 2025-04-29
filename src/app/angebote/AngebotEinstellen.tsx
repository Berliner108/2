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

  useEffect(() => {
    const urlFirst = searchParams.get('first');
    if (urlFirst) {
      setFirstSelection(urlFirst);
      setSecondSelection(null);
      setThirdSelection(null);
    }
  }, [searchParams]);
  const allOptions = [
    "Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Entlacken", "Strahlen",
    "Folieren", "Isolierstegverpressen", "Einlagern", "Entzinken", "Entzinnen", "Entnickeln",
    "Entbleien", "Anodisieren", "Verzinnen", "Verbleien", "Vernickeln",
    "Aluminieren", "Entanodisieren", "Enteloxieren"
  ];
  const validSecondOptions: { [key: string]: string[] } = {
    "Nasslackieren": ["Folieren", "Isolierstegverpressen", "Einlagern"],
    "Pulverbeschichten": ["Folieren", "Isolierstegverpressen", "Einlagern"],
    "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Entlacken": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Strahlen","Folieren","Einlagern","Isolierstegverpressen","Entzinken", "Entbleien", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren", "Entzinnen"],
    "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Vernickeln", "Entnickeln", "Entlacken","Folieren","Einlagern","Isolierstegverpressen","Entzinken", "Entbleien", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren", "Entzinnen"],
    "Folieren": ["Isolierstegverpressen", "Einlagern"],
    "Isolierstegverpressen": ["Einlagern"],
    "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Strahlen", "Entlacken","Folieren","Einlagern","Vernickeln", "Entnickeln","Isolierstegverpressen","Entzinken", "Entbleien", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren", "Entzinnen"],
    "Entzinken": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Vernickeln", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
    "Entzinnen": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Vernickeln", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
    "Entbleien": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Vernickeln", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
    "Entnickeln": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Vernickeln", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
    "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Verbleien": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
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
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Strahlen":["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Isolierstegverpressen": ["Einlagern"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Verbleien": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
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
      "Strahlen": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Eloxieren", "Folieren", "Einlagern", "Isolierstegverpressen", "Entzinken", "Entzinnen", "Entbleien", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
      "Entzinken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Entbleien": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verbleien": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Entanodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Anodisieren"],
      "Enteloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Eloxieren"],
      "Entzinnen": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
    },
    "Strahlen": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen"],
      "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen"],
      "Entlacken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Eloxieren", "Folieren", "Einlagern", "Isolierstegverpressen", "Entzinken", "Entzinnen", "Entbleien", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
      "Entzinken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Entzinnen": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Entbleien": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verbleien": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
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
      "Entlacken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Eloxieren", "Folieren", "Isolierstegverpressen", "Entzinken", "Entzinnen", "Entbleien", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren"],
      "Folieren": ["Isolierstegverpressen"],
      "Isolierstegverpressen": [],
      "Entzinken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Entzinnen": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Entbleien": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Verbleien": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Entanodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen", "Anodisieren"],
      "Enteloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen", "Eloxieren"],      
    },
    "Entzinken": {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Strahlen":["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Isolierstegverpressen": ["Einlagern"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Verbleien": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
    },
    "Entzinnen": {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Strahlen":["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Isolierstegverpressen": ["Einlagern"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Verbleien": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
    },
    "Entbleien": {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Strahlen":["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen", "Verbleien", "Aluminieren"],
      "Isolierstegverpressen": ["Einlagern"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Verbleien": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
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
    "Verbleien": {
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
    console.log('Formular gesendet');
  };

  return (
    <>
    
      <Pager />
      <div className={styles.wrapper}>
        <div className={styles.infoBox}>
          💡 Ab sofort ist das Einholen von Angeboten <strong>kostenlos</strong>!
          <a href="/mehr-erfahren" className={styles.infoLink}>Mehr erfahren</a>
        </div>

        <br />
        <h1 className={styles.subheading}>Angebote für Ihren Auftrag einholen</h1><br />

        <h2 className={styles.heading}>Dateien für deinen Auftrag hochladen</h2>
        <p className={styles.description}>
          Sie können bis zu 8 Dateien zu Ihrem Auftrag hinzufügen (alle gängigen Dateitypen). Beschichter möchten alle Details kennen um alle Anforderungen 
          an den Auftrag erfüllen zu können. Dies gibt Ihnen und dem Beschichter die benötigte Sicherheit für die Produktion Ihres Auftrags.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div
            className={styles.dropzone}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <div className={styles.counter}>{dateien.length} / {MAX_FILES} Dateien hochgeladen</div>
            <p>Dateien hierher ziehen oder klicken</p>
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

          {/* Dropdowns */}
<div className={styles.dropdownContainer}>
  {/* Erster Dropdown */}
  <p className={styles.dropdownText}>Wähle den ersten Arbeitsschritt</p>
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
      <p className={styles.dropdownText}>Triff eine Auswahl für den zweiten Arbeitsschritt</p>
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
      <p className={styles.dropdownText}>Triff eine Auswahl für den dritten Arbeitsschritt</p>
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
          {/* Dynamische Module */}
          {firstSelection && (
            <div className={styles.dynamicModule}>
              <h3>Optional können Sie spezifische Angaben zum 1. Arbeitsschritt machen</h3>
              {firstSelection === "Pulverbeschichten" && (
                <>
                  <div className="datePickerWrapper">
                  <label className="dateLabel">Datum der Selbstanlieferung / Abholung:</label>
                  
                  <DatePicker
                  
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    dateFormat="dd.MM.yyyy"
                    minDate={new Date()}
                    locale="de"
                    customInput={<CustomDateInput />}
                  />
                </div>
                

                  <label><input type="checkbox" /> Zusatzfunktion A</label>
                  <p>Farbe</p>
                  <label><input type="checkbox" /> Zusatzfunktion B</label>
                </>
              )}
              
              {firstSelection === "Option 4" && (
                <>
                  <p>Wähle eine Farbe:</p>
                  <label><input type="radio" name="farbe1" value="rot" /> Rot</label>
                  <label><input type="radio" name="farbe1" value="blau" /> Blau</label>
                </>
              )}
            </div>
          )}

          {secondSelection && (
            <div className={styles.dynamicModule}>
              <h3>Modul für Auswahl 2</h3>
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
                  <label><input type="radio" name="auswahl13" value="Standard" /> Standard</label>
                  <label><input type="radio" name="auswahl13" value="Premium" /> Premium</label>
                </>
              )}
              {thirdSelection === "Verzinken" && (
                <>
                  <p>Welches Verfahren soll für das Verzinken angewendet werden?</p>
                  <label><input type="radio" name="auswahl13" value="Standard" /> Feuerverzinken</label>
                  <label><input type="radio" name="auswahl13" value="Premium" /> Galvanisches Verzinken</label>
                  <label><input type="radio" name="auswahl13" value="Optimum" /> Mechanisches Verzinken</label>
                  <label><input type="radio" name="auswahl13" value="Superb" /> Diffusionsverzinken</label>
                  <label><input type="radio" name="auswahl13" value="Gigantisch" /> Spritzverzinken</label>
                  <label><input type="radio" name="auswahl13" value="Mega" /> Lamellenverzinken</label>
                </>
              )}
            </div>
          )}
        </form>
        <button type="submit" className={styles.submitButton}>
        Kostenlos Angebote einholen
        </button>
      </div>
    </>
  );
}
