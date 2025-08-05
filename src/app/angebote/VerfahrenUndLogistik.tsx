import React, { useState, useRef, useEffect } from 'react';
import styles from './VerfahrenUndLogistik.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import Link from 'next/link'
import { useSearchParams } from 'next/navigation';

export interface Specification {
  type: 'checkbox' | 'text' | 'radio' | 'group' | 'title' | 'dropdown';
  label: string;
  name: string;
  options?: string[];
  position?: 'left' | 'top';
  tooltip?: string; // ⬅ Tooltip-Text separat
}

interface VerfahrenUndLogistikProps {
  selectedOption1: string;
  setSelectedOption1: (value: string) => void;
  selectedOption2: string;
  setSelectedOption2: (value: string) => void;
  selectedOption3: string;
  setSelectedOption3: (value: string) => void;
  specificationsMap: Record<string, Specification[]>;
  specSelections: Record<string, string | string[]>;
  setSpecSelections: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
  lieferDatum: string;
  setLieferDatum: (value: string) => void;
  abholDatum: string;
  setAbholDatum: (value: string) => void;
  lieferArt: string;
  setLieferArt: (value: string) => void;
  abholArt: string;
  setAbholArt: (value: string) => void;
  logistikError: boolean;
  verfahrenError: boolean;
  verfahrenRef: React.RefObject<HTMLDivElement>;
}

const allOptions = [
  "Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren",
  "Verzinnen", "Entlacken", "Aluminieren", "Strahlen", "Folieren",
  "Isolierstegverpressen", "Einlagern", "Entzinken", "Entzinnen", "Entnickeln",
  "Vernickeln", "Entanodisieren", "Entaluminieren", "Enteloxieren"
];

const validSecondOptions: { [key: string]: string[] } = {
    "Nasslackieren": ["Folieren", "Isolierstegverpressen", "Einlagern"],
    "Pulverbeschichten": ["Nasslackieren","Folieren", "Isolierstegverpressen", "Einlagern"],
    "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Entlacken": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Strahlen","Folieren","Einlagern","Isolierstegverpressen","Entzinken", "Anodisieren", "Verzinnen",  "Aluminieren", "Entanodisieren", "Enteloxieren", "Entzinnen"],
    "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Vernickeln", "Entnickeln", "Entlacken","Folieren","Einlagern","Isolierstegverpressen","Entzinken",  "Anodisieren", "Verzinnen",  "Aluminieren", "Entanodisieren", "Enteloxieren", "Entzinnen"],
    "Folieren": ["Isolierstegverpressen", "Einlagern"],
    "Isolierstegverpressen": ["Einlagern"],
    "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Strahlen", "Entlacken","Folieren","Einlagern","Vernickeln", "Entnickeln","Isolierstegverpressen","Entzinken", "Anodisieren", "Verzinnen",  "Aluminieren", "Entanodisieren", "Enteloxieren", "Entzinnen"],
    "Entzinken": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Vernickeln", "Einlagern", "Isolierstegverpressen", "Verzinnen",  "Aluminieren"],
    "Entzinnen": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Vernickeln", "Einlagern", "Isolierstegverpressen", "Verzinnen",  "Aluminieren"],
    "Entnickeln": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Vernickeln", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen",  "Aluminieren"],
    "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],    
    "Vernickeln": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    "Entanodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Anodisieren"],
    "Entaluminieren": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Vernickeln", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen",  "Aluminieren"],
    "Enteloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Eloxieren"],
  };
  const validThirdOptions: { [key: string]: { [key: string]: string[] } } = {
    "Nasslackieren": {
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Isolierstegverpressen": ["Einlagern"],
      "Einlagern": [],
    },
    "Pulverbeschichten": {
      "Nasslackieren": ["Einlagern","Folieren","Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Isolierstegverpressen": ["Einlagern"],
      "Einlagern": [],
    },
    "Verzinken": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Vernickeln": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Entnickeln": {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen",  "Aluminieren"],
      "Strahlen":["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen",  "Aluminieren"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen",  "Aluminieren"],
      "Isolierstegverpressen": ["Einlagern"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],      
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Vernickeln": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
    },
    "Entaluminieren": {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen",  "Aluminieren"],
      "Strahlen":["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen",  "Aluminieren"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen",  "Aluminieren"],
      "Isolierstegverpressen": ["Einlagern"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],      
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
      "Vernickeln": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
    },
    "Eloxieren": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Entlacken": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen"],
      "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Eloxieren", "Folieren", "Einlagern", "Isolierstegverpressen", "Entzinken", "Entzinnen", "Anodisieren", "Verzinnen",   "Aluminieren", "Entanodisieren", "Enteloxieren"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
      "Entzinken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Aluminieren"],      
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],      
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Entanodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Anodisieren"],
      "Enteloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Eloxieren"],
      "Entzinnen": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen", "Aluminieren"],
    },
    "Strahlen": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen"],
      "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen"],
      "Entlacken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Eloxieren", "Folieren", "Einlagern", "Isolierstegverpressen", "Entzinken", "Entzinnen", 
      "Anodisieren", "Verzinnen", "Aluminieren", "Entanodisieren", "Enteloxieren"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
      "Entzinken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen",   "Aluminieren"],
      "Entzinnen": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen", "Verzinnen",   "Aluminieren"],      
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],      
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
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Isolierstegverpressen", "Strahlen"],
      "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Isolierstegverpressen", "Strahlen"],
      "Entlacken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Eloxieren", "Folieren", "Isolierstegverpressen", "Entzinken", "Entzinnen", "Anodisieren", "Verzinnen",   "Aluminieren", "Entanodisieren", "Enteloxieren"],
      "Folieren": ["Isolierstegverpressen"],
      "Isolierstegverpressen": [],
      "Entzinken": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen",   "Aluminieren"],
      "Entzinnen": ["Nasslackieren", "Pulverbeschichten","Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen",   "Aluminieren"],
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Entanodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen", "Anodisieren"],
      "Enteloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen", "Eloxieren"],      
    },
    "Entzinken": {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen",   "Aluminieren"],
      "Strahlen":["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen",   "Aluminieren"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen",   "Aluminieren"],
      "Isolierstegverpressen": ["Einlagern"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],      
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
    },
    "Entzinnen": {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen","Einlagern"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen",   "Aluminieren"],
      "Strahlen":["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen", "Strahlen", "Verzinnen",   "Aluminieren"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Strahlen", "Folieren", "Isolierstegverpressen", "Verzinnen",   "Aluminieren"],
      "Isolierstegverpressen": ["Einlagern"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],      
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Einlagern", "Folieren", "Isolierstegverpressen"],
    },    
    "Anodisieren": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Verzinnen": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    " ": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Aluminieren": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
    },
    "Entanodisieren": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    },
    "Enteloxieren": {
      "Nasslackieren": ["Folieren", "Einlagern", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Nasslackieren","Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Einlagern", "Isolierstegverpressen"],
      "Einlagern": [],
      "Isolierstegverpressen": ["Einlagern"],
      "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
    },
  };

const VerfahrenUndLogistik: React.FC<VerfahrenUndLogistikProps> = ({
  specificationsMap,
  selectedOption1,
  setSelectedOption1,
  selectedOption2,
  setSelectedOption2,
  selectedOption3,
  setSelectedOption3,
  specSelections,
  setSpecSelections,
  lieferDatum,
  setLieferDatum,
  abholDatum,
  setAbholDatum,
  lieferArt,
  setLieferArt,
  abholArt,
  setAbholArt,
  logistikError,
  verfahrenError,
  verfahrenRef,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const secondOptions = validSecondOptions[selectedOption1] || [];
  const thirdOptions = validThirdOptions[selectedOption1]?.[selectedOption2] || [];

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const level2Ref = useRef<HTMLDivElement>(null);
const level3Ref = useRef<HTMLDivElement>(null);
    // ↓ direkt hier einfügen
  const [openLevel1, setOpenLevel1] = useState(false);
  const [openLevel2, setOpenLevel2] = useState(false);
  const [openLevel3, setOpenLevel3] = useState(false);
const searchParams = useSearchParams();
const firstParam = searchParams.get('first');

useEffect(() => {
  if (firstParam && allOptions.includes(firstParam)) {
    setSelectedOption1(firstParam);
  }
}, [firstParam]);

useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setOpenDropdown(null);
    }
    if (verfahrenRef.current && !verfahrenRef.current.contains(e.target as Node)) {
      setOpenLevel1(false);
    }
    if (level2Ref.current && !level2Ref.current.contains(e.target as Node)) {
      setOpenLevel2(false);
    }
    if (level3Ref.current && !level3Ref.current.contains(e.target as Node)) {
      setOpenLevel3(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [verfahrenRef, dropdownRef, level2Ref, level3Ref]);





  // Funktion zum Rendern der Spezifikationen
  // Funktion zum Rendern der Spezifikationen: Nur 'group' Checkboxen, keine einzelnen Checkboxen mehr
const renderSpecs = (specs: Specification[]) => 
  specs
    .filter(spec => spec.type !== 'checkbox') // Einzelne checkboxen filtern raus
    .map((spec, index) => {
      const selectionKey = spec.name;
      

      if (spec.type === 'text') {
  return (
    <div key={index} className={styles.inputRow}>
      <div className={styles.labelRowNeutral}>
        <span className={styles.labelTextNormal}>{spec.label}</span>
        {spec.tooltip && (
          <span className={styles.labelTooltipIcon}>
            <HelpCircle size={18} />
            <span className={styles.labelTooltipText}>{spec.tooltip}</span>
          </span>
        )}
      </div>

      <input
        type="text"
        className={styles.inputField2}
        value={specSelections[selectionKey] || ''}
        onChange={e =>
          setSpecSelections(prev => ({
            ...prev,
            [selectionKey]: e.target.value,
          }))
        }
      />
    </div>
  );
}


     if (spec.type === 'dropdown') {
  return (
    <div key={index} className={styles.inputRow}>
      <label>{spec.label}</label>
      <div className={styles.customDropdown} ref={dropdownRef}>

        <div
          className={styles.dropdownSelected}
          onClick={() =>
            setOpenDropdown(prev =>
              prev === selectionKey ? null : selectionKey
            )
          }
        >
          {specSelections[selectionKey] || 'Bitte wählen'}
        </div>
        {openDropdown === selectionKey && (
          <ul className={styles.dropdownList}>
            {/* Zusatzoption ganz oben */}
            <li
              key="leer"
              onClick={() => {
                setSpecSelections(prev => ({
                  ...prev,
                  [selectionKey]: '',
                }));
                setOpenDropdown(null);
              }}
            >
              Bitte wählen
            </li>

            {/* Alle echten Optionen */}
            {spec.options?.map((opt, i) => (
              <li
                key={i}
                onClick={() => {
                  setSpecSelections(prev => ({
                    ...prev,
                    [selectionKey]: opt,
                  }));
                  setOpenDropdown(null);
                }}
              >
                {opt}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
      if (spec.type === 'radio') {
        return (
          <div key={index} className={styles.radioGroup}>
            <div className={styles.radioLabel}>
  {spec.label}
  {spec.tooltip && (
    <span className={styles.iconTooltip}>
      <HelpCircle size={18} />
      <span className={styles.tooltipText}>{spec.tooltip}</span>
    </span>
  )}
</div>
            <div className={styles.radioInline}>
              {spec.options?.map((opt: string, i: number) => (
                <label key={i} className={styles.radioItem}>
                  <input
                    type="radio"
                    name={`${selectionKey}`}
                    value={opt}
                    checked={specSelections[selectionKey] === opt}
                    onChange={() =>
                      setSpecSelections(prev => ({
                        ...prev,
                        [selectionKey]: opt,
                      }))
                    }
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        );
      }

   if (spec.type === 'group') {
  const selectedValues = Array.isArray(specSelections[selectionKey])
    ? specSelections[selectionKey]
    : [];

  return (
    <div key={index} className={styles.checkboxGroup}>
      <p className={styles.groupLabel}>
  {spec.label}
  {spec.tooltip && (
    <span className={styles.iconTooltip}>
      <HelpCircle size={18} />
      <span className={styles.tooltipText}>{spec.tooltip}</span>
    </span>
  )}
</p>

      <div className={styles.checkboxContainer}>
        {spec.options?.map((opt, i) => (
          <label key={i} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={selectedValues.includes(opt)}
              onChange={(e) => {
                const updated = e.target.checked
                  ? [...selectedValues, opt]
                  : selectedValues.filter((val: string) => val !== opt);
                setSpecSelections((prev: any) => ({
                  ...prev,
                  [selectionKey]: updated,
                }));
              }}
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}
      if (spec.type === 'title') {
        return (
          <h5 key={index} className={styles.sectionTitle}>{spec.label}</h5>
        );
      }

      return null;
    });

  return (
    <section className={styles.container}>
      {/* DROPDOWNS */}
      {/* DROPDOWN 1 */}
<div className={styles.dropdownContainer}>
  <div ref={verfahrenRef}>
    <div className={styles.labelRow}>
      <span>Verfahren 1:</span>
      <span className={styles.labelTooltipIcon}>
        <HelpCircle size={18} />
        <span className={styles.labelTooltipText}>
          Wähle das Hauptverfahren, mit dem dein Auftrag beginnt. Übersicht und weitere Infos zu den Verfahren findest du{' '}
          <Link href="/wissenswertes#Verfahren" className={styles.tooltipLink}>
            hier.
          </Link>
        </span>
      </span>
    </div>

    {/* Trigger */}
    <div
      className={`${styles.inputField} ${verfahrenError ? styles.errorBorder : ''}`}
      onClick={() => setOpenLevel1(prev => !prev)}
    >
      {selectedOption1 || 'Bitte wählen'}
    </div>

    {/* Options */}
    {openLevel1 && (
      <ul className={styles.dropdownList}>
        <li
          onClick={() => {
            setSelectedOption1('');
            setSelectedOption2('');
            setSelectedOption3('');
            setOpenLevel1(false);
          }}
        >
          Bitte wählen
        </li>
        {allOptions.map((opt, i) => (
          <li
            key={i}
            onClick={() => {
              setSelectedOption1(opt);
              setSelectedOption2('');
              setSelectedOption3('');
              setOpenLevel1(false);
            }}
          >
            {opt}
          </li>
        ))}
      </ul>
    )}

    {/* Spezifikationen unter Dropdown 1 – nur wenn geschlossen */}
    {selectedOption1 && !openLevel1 && specificationsMap[selectedOption1]?.length > 0 && (
      <div className={styles.specsBox}>
        <h4 className={styles.specTitle}>Spezifikationen Stufe 1:</h4>
        {renderSpecs(specificationsMap[selectedOption1])}
      </div>
    )}
  </div>
</div>


      <AnimatePresence mode="wait">
  {selectedOption1 && (
    <motion.div
      key="dropdown2"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <label className={styles.labelRow}>Verfahren 2:</label>
      {/* Wrapper mit Ref für Click‑Outside */}
      <div className={styles.dropdownContainer} ref={level2Ref}>
        {/* Trigger */}
        <div
          className={styles.inputField}
          onClick={() => setOpenLevel2(prev => !prev)}
        >
          {selectedOption2 || 'Bitte wählen'}
        </div>

        {/* Liste */}
        {openLevel2 && (
          <ul className={styles.dropdownList}>
            {/* Leer‑Eintrag */}
            <li
              onClick={() => {
                setSelectedOption2('')
                setSelectedOption3('')
                setOpenLevel2(false)
              }}
            >
              Bitte wählen
            </li>
            {/* Optionen */}
            {secondOptions.map((opt, i) => (
              <li
                key={i}
                onClick={() => {
                  setSelectedOption2(opt)
                  setSelectedOption3('')
                  setOpenLevel2(false)
                }}
              >
                {opt}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Spezifikationen unter Stufe 2 */}
      {selectedOption2 && specificationsMap[selectedOption2]?.length > 0 && (
        <div className={styles.specsBox}>
          <h4 className={styles.specTitle}>Spezifikationen Stufe 2:</h4>
          {renderSpecs(specificationsMap[selectedOption2])}
        </div>
      )}
    </motion.div>
  )}
</AnimatePresence>


      <AnimatePresence mode="wait">
  {selectedOption2 && thirdOptions.length > 0 && (
    <motion.div
      key="dropdown3"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <label className={styles.labelRow}>Verfahren 3:</label>

      <div className={styles.dropdownContainer} ref={level3Ref}>
        <div
          className={styles.inputField}
          onClick={() => setOpenLevel3(prev => !prev)}
        >
          {selectedOption3 || 'Bitte wählen'}
        </div>

        {openLevel3 && (
          <ul className={styles.dropdownList}>
            <li
              onClick={() => {
                setSelectedOption3('')
                setOpenLevel3(false)
              }}
            >
              Bitte wählen
            </li>
            {thirdOptions.map((opt, i) => (
              <li
                key={i}
                onClick={() => {
                  setSelectedOption3(opt)
                  setOpenLevel3(false)
                }}
              >
                {opt}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Spezifikationen unter Stufe 3 */}
      {selectedOption3 && specificationsMap[selectedOption3]?.length > 0 && (
        <div className={styles.specsBox}>
          <h4 className={styles.specTitle}>Spezifikationen Stufe 3:</h4>
          {renderSpecs(specificationsMap[selectedOption3])}
        </div>
      )}
    </motion.div>
  )}
</AnimatePresence>


      {/* LOGISTIK */}
      <fieldset className={`${styles.logistik} ${logistikError ? styles.errorFieldset : ''}`}>
      <legend className={styles.legendLogistik}>Logistik</legend>

        <div className={styles.logistikGrid}>
          <div className={styles.inputGroup}>
            <label>Lieferdatum</label>
            <input
              type="date"
              min={today}
              max={abholDatum || undefined}
              value={lieferDatum}
              onChange={(e) => {
                const newLiefer = e.target.value;
                if (abholDatum && new Date(newLiefer) > new Date(abholDatum)) return;
                setLieferDatum(newLiefer);
              }}
              className={logistikError && !lieferDatum ? styles.inputError : ''}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Lieferart</label>
            <select
              value={lieferArt}
              onChange={(e) => setLieferArt(e.target.value)}
              className={logistikError && !lieferArt ? styles.inputError : ''}
            >
              <option value="">Bitte wählen</option>
              <option value="selbst">Ich liefere selbst</option>
              <option value="abholung">Abholung an meinem Standort</option>
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label>Abholdatum</label>
            <input
              type="date"
              min={lieferDatum || today}
              value={abholDatum}
              onChange={(e) => {
                const newAbhol = e.target.value;
                if (lieferDatum && new Date(newAbhol) < new Date(lieferDatum)) return;
                setAbholDatum(newAbhol);
              }}
              className={logistikError && !abholDatum ? styles.inputError : ''}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Abholart</label>
            <select
              value={abholArt}
              onChange={(e) => setAbholArt(e.target.value)}
              className={logistikError && !abholArt ? styles.inputError : ''}
            >
              <option value="">Bitte wählen</option>
              <option value="selbst">Ich hole selbst ab</option>
              <option value="anlieferung">Anlieferung an meinem Standort</option>
            </select>
          </div>
        </div>
        {logistikError && (
          <motion.p
            className={styles.warnung}
            animate={{ x: [0, -4, 4, -4, 0] }}
            transition={{ duration: 0.3 }}
          >
            Bitte füllen Sie alle Logistikfelder korrekt aus.
          </motion.p>
        )}
      </fieldset>
    </section>
  );
};

export default VerfahrenUndLogistik;
