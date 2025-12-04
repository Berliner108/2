import React, { useState, useRef, useEffect } from 'react';
import styles from './VerfahrenUndLogistik.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// ⬇️ Date-Helfer wie in deiner anderen Seite
import {
  gemeinsameFeiertageDEAT,
  isWeekend,
  toYMD,
  todayDate,
  minSelectableDate,
} from '../../lib/dateUtils';

export interface Specification {
  type: 'checkbox' | 'text' | 'radio' | 'group' | 'title' | 'dropdown';
  label: string;
  name: string;
  options?: string[];
  position?: 'left' | 'top';
  tooltip?: string;
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
  setSpecSelections: React.Dispatch<
    React.SetStateAction<Record<string, string | string[]>>
  >;
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
  'Nasslackieren',
  'Pulverbeschichten',
  'Verzinken',
  'Eloxieren',
  'Anodisieren',
  'Verzinnen',
  'Entlacken',
  'Aluminieren',
  'Strahlen',
  'Folieren',
  'Isolierstegverpressen',
  'Einlagern',
  'Entzinken',
  'Entzinnen',
  'Entnickeln',
  'Vernickeln',
  'Entanodisieren',
  'Entaluminieren',
  'Enteloxieren',
];

const validSecondOptions: { [key: string]: string[] } = {
  Nasslackieren: ['Folieren', 'Isolierstegverpressen', 'Einlagern'],
  Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Isolierstegverpressen', 'Einlagern'],
  Verzinken: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Strahlen',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
  ],
  Eloxieren: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Strahlen',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
  ],
  Entlacken: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Eloxieren',
    'Strahlen',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
    'Entzinken',
    'Anodisieren',
    'Verzinnen',
    'Aluminieren',
    'Entanodisieren',
    'Enteloxieren',
    'Entzinnen',
  ],
  Strahlen: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Eloxieren',
    'Vernickeln',
    'Entnickeln',
    'Entlacken',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
    'Entzinken',
    'Anodisieren',
    'Verzinnen',
    'Aluminieren',
    'Entanodisieren',
    'Enteloxieren',
    'Entzinnen',
  ],
  Folieren: ['Isolierstegverpressen', 'Einlagern'],
  Isolierstegverpressen: ['Einlagern'],
  Einlagern: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Eloxieren',
    'Strahlen',
    'Entlacken',
    'Folieren',
    'Einlagern',
    'Vernickeln',
    'Entnickeln',
    'Isolierstegverpressen',
    'Entzinken',
    'Anodisieren',
    'Verzinnen',
    'Aluminieren',
    'Entanodisieren',
    'Enteloxieren',
    'Entzinnen',
  ],
  Entzinken: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Strahlen',
    'Folieren',
    'Vernickeln',
    'Einlagern',
    'Isolierstegverpressen',
    'Verzinnen',
    'Aluminieren',
  ],
  Entzinnen: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Strahlen',
    'Folieren',
    'Vernickeln',
    'Einlagern',
    'Isolierstegverpressen',
    'Verzinnen',
    'Aluminieren',
  ],
  Entnickeln: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Strahlen',
    'Vernickeln',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
    'Verzinnen',
    'Aluminieren',
  ],
  Anodisieren: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Strahlen',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
  ],
  Verzinnen: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Strahlen',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
  ],
  Vernickeln: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Strahlen',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
  ],
  Aluminieren: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Strahlen',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
  ],
  Entanodisieren: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Strahlen',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
    'Anodisieren',
  ],
  Entaluminieren: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Strahlen',
    'Vernickeln',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
    'Verzinnen',
    'Aluminieren',
  ],
  Enteloxieren: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Strahlen',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
    'Eloxieren',
  ],
};

const validThirdOptions: { [key: string]: { [key: string]: string[] } } = {
  // … dein kompletter validThirdOptions-Block unverändert …
  // (ich kürze hier nicht – bitte vollständig aus deinem Code übernehmen)
  // ----- BEGIN DEIN BLOCK -----
  Nasslackieren: {
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Isolierstegverpressen: ['Einlagern'],
    Einlagern: [],
  },
  Pulverbeschichten: {
    Nasslackieren: ['Einlagern', 'Folieren', 'Isolierstegverpressen'],
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Isolierstegverpressen: ['Einlagern'],
    Einlagern: [],
  },
  Verzinken: {
    Nasslackieren: ['Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Einlagern: [],
    Isolierstegverpressen: ['Einlagern'],
  },
  Vernickeln: {
    Nasslackieren: ['Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Einlagern: [],
    Isolierstegverpressen: ['Einlagern'],
  },
  Entnickeln: {
    Nasslackieren: ['Folieren', 'Isolierstegverpressen', 'Einlagern'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Verzinken: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Strahlen',
      'Verzinnen',
      'Aluminieren',
    ],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Strahlen',
      'Verzinnen',
      'Aluminieren',
    ],
    Folieren: ['Isolierstegverpressen', 'Einlagern'],
    Einlagern: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Strahlen',
      'Folieren',
      'Isolierstegverpressen',
      'Verzinnen',
      'Aluminieren',
    ],
    Isolierstegverpressen: ['Einlagern'],
    Verzinnen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Einlagern',
      'Folieren',
      'Isolierstegverpressen',
    ],
    Aluminieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Einlagern',
      'Folieren',
      'Isolierstegverpressen',
    ],
    Vernickeln: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Einlagern',
      'Folieren',
      'Isolierstegverpressen',
    ],
  },
  Entaluminieren: {
    Nasslackieren: ['Folieren', 'Isolierstegverpressen', 'Einlagern'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Verzinken: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Strahlen',
      'Verzinnen',
      'Aluminieren',
    ],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Strahlen',
      'Verzinnen',
      'Aluminieren',
    ],
    Folieren: ['Isolierstegverpressen', 'Einlagern'],
    Einlagern: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Strahlen',
      'Folieren',
      'Isolierstegverpressen',
      'Verzinnen',
      'Aluminieren',
    ],
    Isolierstegverpressen: ['Einlagern'],
    Verzinnen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Einlagern',
      'Folieren',
      'Isolierstegverpressen',
    ],
    Aluminieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Einlagern',
      'Folieren',
      'Isolierstegverpressen',
    ],
    Vernickeln: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Einlagern',
      'Folieren',
      'Isolierstegverpressen',
    ],
  },
  Eloxieren: {
    Nasslackieren: ['Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Einlagern: [],
    Isolierstegverpressen: ['Einlagern'],
  },
  Entlacken: {
    Nasslackieren: ['Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Verzinken: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Strahlen',
    ],
    Eloxieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Strahlen',
    ],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Eloxieren',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Entzinken',
      'Entzinnen',
      'Anodisieren',
      'Verzinnen',
      'Aluminieren',
      'Entanodisieren',
      'Enteloxieren',
    ],
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Einlagern: [],
    Isolierstegverpressen: ['Einlagern'],
    Entzinken: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Verzinnen',
      'Aluminieren',
    ],
    Anodisieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Verzinnen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Aluminieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Entanodisieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Anodisieren',
    ],
    Enteloxieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Eloxieren',
    ],
    Entzinnen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Verzinnen',
      'Aluminieren',
    ],
  },
  Strahlen: {
    Nasslackieren: ['Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Verzinken: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Strahlen',
    ],
    Eloxieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Strahlen',
    ],
    Entlacken: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Eloxieren',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Entzinken',
      'Entzinnen',
      'Anodisieren',
      'Verzinnen',
      'Aluminieren',
      'Entanodisieren',
      'Enteloxieren',
    ],
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Einlagern: [],
    Isolierstegverpressen: ['Einlagern'],
    Entzinken: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Verzinnen',
      'Aluminieren',
    ],
    Entzinnen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Verzinnen',
      'Aluminieren',
    ],
    Anodisieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Verzinnen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Aluminieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Entanodisieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Anodisieren',
    ],
    Enteloxieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Eloxieren',
    ],
  },
  Folieren: {
    Einlagern: [],
    Isolierstegverpressen: ['Einlagern'],
  },
  Isolierstegverpressen: {
    Einlagern: [],
  },
  Einlagern: {
    Nasslackieren: ['Folieren', 'Isolierstegverpressen'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Isolierstegverpressen'],
    Verzinken: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Isolierstegverpressen',
      'Strahlen',
    ],
    Eloxieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Isolierstegverpressen',
      'Strahlen',
    ],
    Entlacken: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Eloxieren',
      'Folieren',
      'Isolierstegverpressen',
      'Entzinken',
      'Entzinnen',
      'Anodisieren',
      'Verzinnen',
      'Aluminieren',
      'Entanodisieren',
      'Enteloxieren',
    ],
    Folieren: ['Isolierstegverpressen'],
    Isolierstegverpressen: [],
    Entzinken: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Strahlen',
      'Folieren',
      'Isolierstegverpressen',
      'Verzinnen',
      'Aluminieren',
    ],
    Entzinnen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Strahlen',
      'Folieren',
      'Isolierstegverpressen',
      'Verzinnen',
      'Aluminieren',
    ],
    Anodisieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Isolierstegverpressen',
    ],
    Verzinnen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Isolierstegverpressen',
    ],
    Aluminieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Isolierstegverpressen',
    ],
    Entanodisieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Isolierstegverpressen',
      'Anodisieren',
    ],
    Enteloxieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Isolierstegverpressen',
      'Eloxieren',
    ],
  },
  Entzinken: {
    Nasslackieren: ['Folieren', 'Isolierstegverpressen', 'Einlagern'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Verzinken: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Strahlen',
      'Verzinnen',
      'Aluminieren',
    ],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Strahlen',
      'Verzinnen',
      'Aluminieren',
    ],
    Folieren: ['Isolierstegverpressen', 'Einlagern'],
    Einlagern: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Strahlen',
      'Folieren',
      'Isolierstegverpressen',
      'Verzinnen',
      'Aluminieren',
    ],
    Isolierstegverpressen: ['Einlagern'],
    Verzinnen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Einlagern',
      'Folieren',
      'Isolierstegverpressen',
    ],
    Aluminieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Einlagern',
      'Folieren',
      'Isolierstegverpressen',
    ],
  },
  Entzinnen: {
    Nasslackieren: ['Folieren', 'Isolierstegverpressen', 'Einlagern'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Verzinken: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Strahlen',
      'Verzinnen',
      'Aluminieren',
    ],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
      'Strahlen',
      'Verzinnen',
      'Aluminieren',
    ],
    Folieren: ['Isolierstegverpressen', 'Einlagern'],
    Einlagern: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Verzinken',
      'Strahlen',
      'Folieren',
      'Isolierstegverpressen',
      'Verzinnen',
      'Aluminieren',
    ],
    Isolierstegverpressen: ['Einlagern'],
    Verzinnen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Einlagern',
      'Folieren',
      'Isolierstegverpressen',
    ],
    Aluminieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Einlagern',
      'Folieren',
      'Isolierstegverpressen',
    ],
  },
  Anodisieren: {
    Nasslackieren: ['Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Einlagern: [],
    Isolierstegverpressen: ['Einlagern'],
  },
  Verzinnen: {
    Nasslackieren: ['Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Einlagern: [],
    Isolierstegverpressen: ['Einlagern'],
  },
  ' ': {
    Nasslackieren: ['Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Einlagern: [],
    Isolierstegverpressen: ['Einlagern'],
  },
  Aluminieren: {
    Nasslackieren: ['Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Einlagern: [],
    Isolierstegverpressen: ['Einlagern'],
  },
  Entanodisieren: {
    Nasslackieren: ['Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Einlagern: [],
    Isolierstegverpressen: ['Einlagern'],
    Anodisieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
  },
  Enteloxieren: {
    Nasslackieren: ['Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Pulverbeschichten: ['Nasslackieren', 'Folieren', 'Einlagern', 'Isolierstegverpressen'],
    Strahlen: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
    Folieren: ['Einlagern', 'Isolierstegverpressen'],
    Einlagern: [],
    Isolierstegverpressen: ['Einlagern'],
    Eloxieren: [
      'Nasslackieren',
      'Pulverbeschichten',
      'Strahlen',
      'Folieren',
      'Einlagern',
      'Isolierstegverpressen',
    ],
  },
  // ----- END DEIN BLOCK -----
};

/* -------- Mini-Kalender-Komponente (Mo–So) -------- */

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
  // --- Datum & Kalender-Logik ---
  const today = todayDate();
  const minDate = minSelectableDate();
  const todayStr = toYMD(today);


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

  const holidaysSet = (() => {
    const y = today.getFullYear();
    const s1 = gemeinsameFeiertageDEAT(y);
    const s2 = gemeinsameFeiertageDEAT(y + 1);
    return new Set<string>([...s1, ...s2]);
  })();

  const isDisabledDay = (d: Date): boolean => {
    if (d < minDate) return true;
    if (isWeekend(d)) return true;
    if (holidaysSet.has(toYMD(d))) return true;
    return false;
  };

  const isDisabledAbholDay = (d: Date): boolean => {
    if (isDisabledDay(d)) return true;
    if (!lieferDatumDate) return true;
    // WICHTIG: Abholdatum MUSS NACH dem Lieferdatum liegen
    if (d <= lieferDatumDate) return true;
    return false;
  };

  // Kalender-Zustand Liefer-/Abholdatum
  const [lieferCalOpen, setLieferCalOpen] = useState(false);
  const [lieferCalMonth, setLieferCalMonth] = useState<Date>(() => today);
  const [abholCalOpen, setAbholCalOpen] = useState(false);
  const [abholCalMonth, setAbholCalMonth] = useState<Date>(() => today);

  const lieferFieldRef = useRef<HTMLDivElement | null>(null);
  const lieferPopoverRef = useRef<HTMLDivElement | null>(null);
  const abholFieldRef = useRef<HTMLDivElement | null>(null);
  const abholPopoverRef = useRef<HTMLDivElement | null>(null);

  // Monat auf sinnvollen Wert setzen beim Öffnen
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

  // Wenn Lieferdatum geändert wird und Abholdatum nicht mehr gültig ist -> reset
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

// Hilfsfunktionen für Aufenthaltsdauer + Datumsformat
const aufenthaltTage =
  lieferDatum && abholDatum
    ? Math.max(
        0,
        Math.round(
          (new Date(abholDatum).getTime() - new Date(lieferDatum).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

const formatDateDE = (value: string) =>
  new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const secondOptions = validSecondOptions[selectedOption1] || [];
  const thirdOptions =
    validThirdOptions[selectedOption1]?.[selectedOption2] || [];

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const level2Ref = useRef<HTMLDivElement>(null);
  const level3Ref = useRef<HTMLDivElement>(null);

  const [openLevel1, setOpenLevel1] = useState(false);
  const [openLevel2, setOpenLevel2] = useState(false);
  const [openLevel3, setOpenLevel3] = useState(false);

  const searchParams = useSearchParams();
  const firstParam = searchParams.get('first');

  useEffect(() => {
    if (firstParam && allOptions.includes(firstParam)) {
      setSelectedOption1(firstParam);
    }
  }, [firstParam, setSelectedOption1]);

  // Click-Outside & ESC für Dropdowns + Kalender
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setOpenDropdown(null);
      }
      if (verfahrenRef.current && !verfahrenRef.current.contains(target)) {
        setOpenLevel1(false);
      }
      if (level2Ref.current && !level2Ref.current.contains(target)) {
        setOpenLevel2(false);
      }
      if (level3Ref.current && !level3Ref.current.contains(target)) {
        setOpenLevel3(false);
      }

      const inLieferField =
        lieferFieldRef.current?.contains(target) ?? false;
      const inLieferPopover =
        lieferPopoverRef.current?.contains(target) ?? false;
      if (!inLieferField && !inLieferPopover) {
        setLieferCalOpen(false);
      }

      const inAbholField = abholFieldRef.current?.contains(target) ?? false;
      const inAbholPopover =
        abholPopoverRef.current?.contains(target) ?? false;
      if (!inAbholField && !inAbholPopover) {
        setAbholCalOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setOpenLevel1(false);
        setOpenLevel2(false);
        setOpenLevel3(false);
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
  }, [
    verfahrenRef,
    dropdownRef,
    level2Ref,
    level3Ref,
    lieferFieldRef,
    lieferPopoverRef,
    abholFieldRef,
    abholPopoverRef,
  ]);

  // Spezifikationen rendern
  const renderSpecs = (specs: Specification[]) =>
    specs
      .filter((spec) => spec.type !== 'checkbox')
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
                    <span className={styles.labelTooltipText}>
                      {spec.tooltip}
                    </span>
                  </span>
                )}
              </div>

              <input
                type="text"
                className={styles.inputField2}
                value={(specSelections[selectionKey] as string) || ''}
                onChange={(e) =>
                  setSpecSelections((prev) => ({
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
                    setOpenDropdown((prev) =>
                      prev === selectionKey ? null : selectionKey,
                    )
                  }
                >
                  {(specSelections[selectionKey] as string) || 'Bitte wählen'}
                </div>
                {openDropdown === selectionKey && (
                  <ul className={styles.dropdownList}>
                    <li
                      key="leer"
                      onClick={() => {
                        setSpecSelections((prev) => ({
                          ...prev,
                          [selectionKey]: '',
                        }));
                        setOpenDropdown(null);
                      }}
                    >
                      Bitte wählen
                    </li>
                    {spec.options?.map((opt, i) => (
                      <li
                        key={i}
                        onClick={() => {
                          setSpecSelections((prev) => ({
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
                    <span className={styles.tooltipText}>
                      {spec.tooltip}
                    </span>
                  </span>
                )}
              </div>
              <div className={styles.radioInline}>
                {spec.options?.map((opt, i) => (
                  <label key={i} className={styles.radioItem}>
                    <input
                      type="radio"
                      name={selectionKey}
                      value={opt}
                      checked={specSelections[selectionKey] === opt}
                      onChange={() =>
                        setSpecSelections((prev) => ({
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
          const selectedValues = Array.isArray(
            specSelections[selectionKey],
          )
            ? (specSelections[selectionKey] as string[])
            : [];

          return (
            <div key={index} className={styles.checkboxGroup}>
              <p className={styles.groupLabel}>
                {spec.label}
                {spec.tooltip && (
                  <span className={styles.iconTooltip}>
                    <HelpCircle size={18} />
                    <span className={styles.tooltipText}>
                      {spec.tooltip}
                    </span>
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
                          : selectedValues.filter(
                              (val: string) => val !== opt,
                            );
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
            <h5 key={index} className={styles.sectionTitle}>
              {spec.label}
            </h5>
          );
        }

        return null;
      });

  return (
    <section className={styles.container}>
      {/* VERFAHREN 1 */}
      <div className={styles.dropdownContainer}>
        <div ref={verfahrenRef}>
          <div className={styles.labelRow}>
            <span>Verfahren 1:</span>
            <span className={styles.labelTooltipIcon}>
              <HelpCircle size={18} />
              <span className={styles.labelTooltipText}>
                Wähle das Hauptverfahren, mit dem dein Auftrag beginnt.
                Übersicht und weitere Infos zu den Verfahren findest du{' '}
                <Link
                  href="/wissenswertes#Verfahren"
                  className={styles.tooltipLink}
                >
                  hier.
                </Link>
              </span>
            </span>
          </div>

          <div
            className={`${styles.inputField} ${
              verfahrenError ? styles.errorBorder : ''
            }`}
            onClick={() => setOpenLevel1((prev) => !prev)}
          >
            {selectedOption1 || 'Bitte wählen'}
          </div>

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

          {selectedOption1 &&
            !openLevel1 &&
            specificationsMap[selectedOption1]?.length > 0 && (
              <div className={styles.specsBox}>
                <h4 className={styles.specTitle}>
                  Spezifikationen Stufe 1:
                </h4>
                {renderSpecs(specificationsMap[selectedOption1])}
              </div>
            )}
        </div>
      </div>

      {/* VERFAHREN 2 */}
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

            <div className={styles.dropdownContainer} ref={level2Ref}>
              <div
                className={styles.inputField}
                onClick={() => setOpenLevel2((prev) => !prev)}
              >
                {selectedOption2 || 'Bitte wählen'}
              </div>

              {openLevel2 && (
                <ul className={styles.dropdownList}>
                  <li
                    onClick={() => {
                      setSelectedOption2('');
                      setSelectedOption3('');
                      setOpenLevel2(false);
                    }}
                  >
                    Bitte wählen
                  </li>
                  {secondOptions.map((opt, i) => (
                    <li
                      key={i}
                      onClick={() => {
                        setSelectedOption2(opt);
                        setSelectedOption3('');
                        setOpenLevel2(false);
                      }}
                    >
                      {opt}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedOption2 &&
              specificationsMap[selectedOption2]?.length > 0 && (
                <div className={styles.specsBox}>
                  <h4 className={styles.specTitle}>
                    Spezifikationen Stufe 2:
                  </h4>
                  {renderSpecs(specificationsMap[selectedOption2])}
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* VERFAHREN 3 */}
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
                onClick={() => setOpenLevel3((prev) => !prev)}
              >
                {selectedOption3 || 'Bitte wählen'}
              </div>

              {openLevel3 && (
                <ul className={styles.dropdownList}>
                  <li
                    onClick={() => {
                      setSelectedOption3('');
                      setOpenLevel3(false);
                    }}
                  >
                    Bitte wählen
                  </li>
                  {thirdOptions.map((opt, i) => (
                    <li
                      key={i}
                      onClick={() => {
                        setSelectedOption3(opt);
                        setOpenLevel3(false);
                      }}
                    >
                      {opt}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedOption3 &&
              specificationsMap[selectedOption3]?.length > 0 && (
                <div className={styles.specsBox}>
                  <h4 className={styles.specTitle}>
                    Spezifikationen Stufe 3:
                  </h4>
                  {renderSpecs(specificationsMap[selectedOption3])}
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOGISTIK */}
<fieldset
  className={`${styles.logistik} ${
    logistikError ? styles.errorFieldset : ''
  }`}
>
  <legend className={styles.legendLogistik}>Logistik</legend>

  {/* kurze Erklärung */}
  <p className={styles.logistikIntro}>
    Plane hier, wann die Teile zu dir kommen und wann sie wieder abgeholt
    werden sollen.
  </p>

  {/* Aufenthaltsdauer, nur wenn beide Daten gesetzt sind */}
  {lieferDatum && abholDatum && aufenthaltTage !== null && (
    <p className={styles.logistikSummary}>
      Aufenthalt beim Anbieter:{' '}
      <strong>{aufenthaltTage} Tage</strong> (
      {formatDateDE(lieferDatum)} – {formatDateDE(abholDatum)})
    </p>
  )}

  {/* zwei Karten: Anlieferung links, Abholung rechts */}
  <div className={styles.logistikCards}>
    {/* Karte 1: Anlieferung */}
    <div className={styles.logistikCard}>
      <h5 className={styles.logistikCardTitle}>Anlieferung</h5>

      <div className={styles.inputGroup}>
        <label>Lieferdatum</label>
        <input
  type="date"
  min={todayStr}               // ✅ String
  value={lieferDatum}
  onChange={(e) => {
    const newLiefer = e.target.value;
    setLieferDatum(newLiefer);
    if (abholDatum && new Date(newLiefer) >= new Date(abholDatum)) {
      // Abhol-Datum darf nicht am gleichen oder davor sein
      setAbholDatum('');
    }
  }}
  className={logistikError && !lieferDatum ? styles.inputError : ''}
/>

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
          <option value="abholung">
            Abholung an meinem Standort
          </option>
        </select>
      </div>
    </div>

    {/* Karte 2: Abholung / Rücktransport */}
    <div className={styles.logistikCard}>
      <h5 className={styles.logistikCardTitle}>
        Abholung / Rücktransport
      </h5>

      <div className={styles.inputGroup}>
        <label>Abholdatum</label>
        <input
  type="date"
  disabled={!lieferDatum}
  min={lieferDatum || todayStr}   // ✅ immer String
  value={abholDatum}
  onChange={(e) => {
    const newAbhol = e.target.value;
    // Abholdatum MUSS nach dem Lieferdatum sein (strict >)
    if (
      lieferDatum &&
      new Date(newAbhol) <= new Date(lieferDatum)
    ) {
      return;
    }
    setAbholDatum(newAbhol);
  }}
  className={logistikError && !abholDatum ? styles.inputError : ''}
/>

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

  {/* Serienauftrag (optional einklappbar) */}
  <div className={styles.serienauftragRow}>
    <label className={styles.serienCheckboxLabel}>
      <input
        type="checkbox"
        checked={serienauftrag}
        onChange={(e) => {
          setSerienauftrag(e.target.checked);
          if (!e.target.checked) {
            setRhythmus('');
          }
        }}
      />
      Ich habe einen Serienauftrag
    </label>

    {serienauftrag && (
      <div className={styles.serienauftragSelect}>
        <span>Rhythmus der Anlieferung:</span>
        <select
          value={rhythmus}
          onChange={(e) => setRhythmus(e.target.value)}
        >
          <option value="">Bitte wählen</option>
          <option value="taeglich">Täglich</option>
          <option value="woechentlich">Wöchentlich</option>
          <option value="zweiwoechentlich">Alle zwei Wochen</option>
          <option value="monatlich">Monatlich</option>
        </select>
      </div>
    )}
  </div>

  {logistikError && (
    <motion.p
      className={styles.warnung}
      animate={{ x: [0, -4, 4, -4, 0] }}
      transition={{ duration: 0.3 }}
    >
      Bitte fülle die Logistik vollständig und korrekt aus.
    </motion.p>
  )}
</fieldset>

    </section>
  );
};

export default VerfahrenUndLogistik;
