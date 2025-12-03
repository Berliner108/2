'use client';

import React, { useState, useEffect } from 'react';
import styles from './angebote.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle, HelpCircle, Upload, Settings, FileImage, FileText, FileArchive, File } from 'lucide-react';
import Navbar from './../components/navbar/Navbar'
import { useSearchParams } from 'next/navigation';
import { Oswald } from 'next/font/google';
import LogistikBox from './LogistikBox'; // Pfad ggf. anpassen

type Specification =
  | { type: 'checkbox'; label: string }
  | { type: 'text'; label: string }
  | { type: 'radio'; label: string; options: string[] }
  | { type: 'group'; label: string; options: { type: 'checkbox'; label: string }[] }
  | { type: 'title'; label: string }; // <-- NEU

  type SpecBlockProps = {
  title: string;
  specs: Specification[]; // ✅ nutzt deinen bestehenden Typ
  specSelections: Record<string, string | string[]>;
  setSpecSelections: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
};


const SpecBlock = ({ title, specs, specSelections, setSpecSelections }: SpecBlockProps) => (
  <div className={styles.specsBox}>
    <h4 className={styles.specTitle}>Spezifikationen zum {title}:</h4>

    {specs.map((spec, index) => {
      if (spec.type === 'checkbox') {
        const checked = Array.isArray(specSelections[spec.label])
          ? (specSelections[spec.label] as string[]).includes('✔')
          : false;

        return (
          <label key={index} className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                setSpecSelections((prev) => ({
                  ...prev,
                  [spec.label]: e.target.checked ? ['✔'] : [],
                }));
              }}
            />
            <>
  {spec.label}
  {spec.label === 'ISO 9001' && (
    <span className={styles.tooltipContainer}>
      <HelpCircle size={16} />
      <span className={styles.tooltipText}>
        Qualitätsmanagementsystem – Anforderungen
      </span>
    </span>
  )}
  {spec.label === 'ISO 14001' && (
    <span className={styles.tooltipContainer}>
      <HelpCircle size={16} />
      <span className={styles.tooltipText}>
        Umweltmanagementsystem – Anforderungen
      </span>
    </span>
  )}
  {spec.label === 'RoHS-Konformität' && (
    <span className={styles.tooltipContainer}>
      <HelpCircle size={16} />
      <span className={styles.tooltipText}>
        Beschränkung gefährlicher Stoffe in Industrieprozessen
      </span>
    </span>
  )}
</>
          </label>
        );
      }
      if (spec.type === 'group') {
  const selectedVerfahren = specSelections['Verfahren wählen']?.toString() || '';
  const isZink = title === 'Verzinken';
  const isAlu = title === 'Aluminieren';
  const isEntal = title === 'Entaluminieren';
  const isEntelox = title === 'Enteloxieren';
  const isEntnickel = title === 'Entnickeln';
  const isEntzinken = title === 'Entzinken';
  const isNickel = title === 'Vernickeln';
  const isZinn = title === 'Verzinnen';
  

  const hide =
  // Verzinken
  (isZink && spec.label.includes('Feuerverzinken') && selectedVerfahren !== 'Feuerverzinken') ||
  (isZink && spec.label.includes('Galvanisch') && selectedVerfahren !== 'Galvanisches Verzinken') ||
  (isZink && spec.label.includes('Diffusions') && !selectedVerfahren.includes('Diffusions')) ||
  (isZink && spec.label.includes('Lamellen') && !selectedVerfahren.includes('Lamellen')) ||
  (isZink && spec.label.includes('Mechanisch') && selectedVerfahren !== 'Mechanisches Verzinken') ||

  // Aluminieren
  (isAlu && spec.label.includes('Feueraluminieren') && selectedVerfahren !== 'Feueraluminieren') ||
  (isAlu && spec.label.includes('Thermisches Spritzen') && selectedVerfahren !== 'Thermisches Spritzen') ||
  (isAlu && spec.label.includes('Packaluminieren') && selectedVerfahren !== 'Packaluminieren') ||

  // Entaluminieren
  (isEntal && spec.label.includes('Standards für Chemisches Entaluminieren') && selectedVerfahren !== 'Chemisch') ||
  (isEntal && spec.label.includes('Standards für Elektrochemisches Entaluminieren') && selectedVerfahren !== 'Elektrochemisch') ||
  (isEntal && spec.label.includes('Standards für Mechanisches Entaluminieren') && selectedVerfahren !== 'Mechanisch') ||

   // Entnickeln
  (isEntnickel && spec.label.includes('Standards für Chemisches Entnickeln') && selectedVerfahren !== 'Chemisch') ||
  (isEntnickel && spec.label.includes('Standards für Elektrochemisches Entnickeln') && selectedVerfahren !== 'Elektrochemisch') ||

  // Enteloxieren
  (isEntelox && spec.label.includes('Standards für Chemisches Enteloxieren') && selectedVerfahren !== 'Chemisch') ||
  (isEntelox && spec.label.includes('Standards für Elektrochemisches Enteloxieren') && selectedVerfahren !== 'Elektrochemisch') ||

  // Entzinken
  (isEntzinken && spec.label.includes('Standards für Chemisches Entzinken') && selectedVerfahren !== 'Chemisch') ||
  (isEntzinken && spec.label.includes('Standards für Elektrochemisches Entzinken') && selectedVerfahren !== 'Elektrochemisch') ||

  // Verzinnen
(isZinn && spec.label.includes('Chemisches Verzinnen') && selectedVerfahren !== 'Chemisch') ||
(isZinn && spec.label.includes('Galvanisches Verzinnen') && selectedVerfahren !== 'Galvanisch') ||

    // Vernickeln
  (isNickel && spec.label.includes('Chemisches Vernickeln') && selectedVerfahren !== 'Chemisch') ||
  (isNickel && spec.label.includes('Galvanisches Vernickeln') && selectedVerfahren !== 'Galvanisch');

  if (hide) return null;
}

if (spec.type === 'title') {
  return (
    <h5 key={index} className={styles.sectionTitle}>
      {spec.label}
    </h5>
  );
}

      if (spec.type === 'radio') {
  const isDropdown = spec.label === 'Farbpalette';

  return (
    <div key={index} className={styles.radioGroup}>
      <div className={styles.radioLabel}>{spec.label}:</div>

      {isDropdown ? (
        <select
          className={styles.inputField}
          value={specSelections[spec.label] || ''}
          onChange={(e) =>
            setSpecSelections((prev) => ({
              ...prev,
              [spec.label]: e.target.value,
            }))
          }
        >
          <option value="">Bitte wählen</option>
          {spec.options.map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <div className={styles.radioInline}>
          {spec.options.map((opt, i) => (
            <label key={i} className={styles.radioItem}>
              <input
                type="radio"
                name={`${title}-${spec.label}`}
                value={opt}
                checked={specSelections[spec.label] === opt}
                onChange={() =>
                  setSpecSelections((prev) => ({
                    ...prev,
                    [spec.label]: opt,
                  }))
                }
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}


      if (spec.type === 'group') {
        const selectedValues = Array.isArray(specSelections[spec.label])
          ? (specSelections[spec.label] as string[])
          : [];

        return (
          <div key={index} className={styles.checkboxGroup}>
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{spec.label}</p>
            {spec.options.map((opt, i) => {
              const isChecked = selectedValues.includes(opt.label);
              return (
                <label key={i} className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      setSpecSelections((prev) => {
                        const current = Array.isArray(prev[spec.label])
                          ? [...(prev[spec.label] as string[])]
                          : [];
                        const updated = e.target.checked
                          ? [...current, opt.label]
                          : current.filter((val) => val !== opt.label);
                        return {
                          ...prev,
                          [spec.label]: updated,
                        };
                      });
                    }}
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        );
      }

      if (spec.type === 'text') {
        return (
          <div key={index} className={styles.inputRow}>
            <label>{spec.label}</label>
            <input
              type="text"
              className={styles.inputField}
              value={specSelections[spec.label] || ''}
              onChange={(e) =>
                setSpecSelections((prev) => ({
                  ...prev,
                  [spec.label]: e.target.value,
                }))
              }
            />
          </div>
        );
      }

      console.warn('Unbekannter Typ:', spec);
      return null;
    })}
  </div>
);

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export default function AngebotEinstellen() {
  const [files, setFiles] = useState<File[]>([]);
  const MAX_FILES = 8;
  const MAX_FILE_SIZE_MB = 5;  

  const [showTransportOption] = useState(false);
const [transportArt] = useState('');
const [bemerkung, setBemerkung] = useState('');

  

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };
  const stepIcons = [<Upload size={40} />, <Settings size={40} />, <FileText size={40} />];

  const handleUploadClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    addFiles(selectedFiles);
  };
  const [activeStep, setActiveStep] = useState(0);

  const [materialGuete, setMaterialGuete] = useState('');
const [customMaterial, setCustomMaterial] = useState('');
const [materialGueteError, setMaterialGueteError] = useState(false);

const [laenge, setLaenge] = useState('');
const [breite, setBreite] = useState('');
const [hoehe, setHoehe] = useState('');
const [masse, setMasse] = useState('');
const [abmessungError, setAbmessungError] = useState(false);


useEffect(() => {
  const interval = setInterval(() => {
    setActiveStep((prev) => (prev + 1) % 3);
  }, 5000); // alle 5 Sekunden

return () => clearInterval(interval);
}, []);

const searchParams = useSearchParams();
const firstFromUrl = searchParams.get('first') || '';
const [selectedOption1, setSelectedOption1] = useState(firstFromUrl);
const [selectedOption2, setSelectedOption2] = useState('');
const [selectedOption3, setSelectedOption3] = useState('');

const [specSelections, setSpecSelections] = useState<Record<string, string | string[]>>({});
useEffect(() => {
  if (
    selectedOption1 === 'Eloxieren' ||
    selectedOption2 === 'Eloxieren' ||
    selectedOption3 === 'Eloxieren'
  ) {
    setMaterialGuete('Aluminium');
  }
}, [selectedOption1, selectedOption2, selectedOption3]);



useEffect(() => {
  const currentFirst = searchParams.get('first') || '';
  setSelectedOption1(currentFirst);
}, [searchParams]);

useEffect(() => {
  if (selectedOption1 && specificationsMap[selectedOption1]) {
    const initialSelections: Record<string, string | string[]> = {};

    specificationsMap[selectedOption1].forEach(spec => {
      if (spec.type === 'checkbox') initialSelections[spec.label] = [];
      if (spec.type === 'radio') initialSelections[spec.label] = '';
      if (spec.type === 'text') initialSelections[spec.label] = '';
      if (spec.type === 'group') initialSelections[spec.label] = [];
    });

    setSpecSelections(initialSelections);
  }
}, [selectedOption1]);

useEffect(() => {
  const selectedVerfahren =
    specSelections['Verfahren wählen']?.toString() || '';

 const allNormLabels = [
  // Verzinken
  'Normen & Standards (nur bei Feuerverzinken)',
  'Normen & Standards (nur bei Galvanischem Verzinken)',
  'Normen & Standards (nur bei Diffusionsverzinken)',
  'Normen & Standards (nur bei Lamellenverzinken)',
  'Normen & Standards (nur bei Mechanischem Verzinken)',
  // Aluminieren
  'Standards für Feueraluminieren',
  'Standards für Thermisches Spritzen',
  'Standards für Packaluminieren',
  // Entaluminieren
  'Standards für Chemisches Entaluminieren',
  'Standards für Elektrochemisches Entaluminieren',
  'Standards für Mechanisches Entaluminieren',
   // Entnickeln
  'Standards für Chemisches Entnickeln',
  'Standards für Elektrochemisches Entnickeln',
  // Entzinken
  'Standards für Chemisches Entzinken',
  'Standards für Elektrochemisches Entzinken',
  // Enteloxieren
  
  'Standards für Chemisches Enteloxieren',
  'Standards für Elektrochemisches Enteloxieren',

  // Verzinnen
'Standards für Chemisches Verzinnen',
'Standards für Galvanisches Verzinnen',


    // Vernickeln
  'Standards für Chemisches Vernickeln',
  'Standards für Galvanisches Vernickeln'

];


  setSpecSelections((prev) => {
  const updated = { ...prev };

  allNormLabels.forEach((label) => {
    const isRelevant = (
  // Verzinken
  (label.includes('Feuerverzinken') && selectedVerfahren === 'Feuerverzinken') ||
  (label.includes('Galvanisch') && selectedVerfahren === 'Galvanisches Verzinken') ||
  (label.includes('Diffusions') && selectedVerfahren === 'Diffusionsverzinken (Sherardisieren)') ||
  (label.includes('Lamellen') && selectedVerfahren === 'Lamellenverzinken') ||
  (label.includes('Mechanisch') && selectedVerfahren === 'Mechanisches Verzinken') ||
  // Aluminieren
  (label.includes('Feueraluminieren') && selectedVerfahren === 'Feueraluminieren') ||
  (label.includes('Thermisches Spritzen') && selectedVerfahren === 'Thermisches Spritzen') ||
  (label.includes('Packaluminieren') && selectedVerfahren === 'Packaluminieren') ||
  // Entaluminieren
  (label.includes('Standards für Chemisches Entaluminieren') && selectedVerfahren === 'Chemisch') ||
  (label.includes('Standards für Elektrochemisches Entaluminieren') && selectedVerfahren === 'Elektrochemisch') ||
  (label.includes('Standards für Mechanisches Entaluminieren') && selectedVerfahren === 'Mechanisch') ||
  // Entzinken
      (label.includes('Chemisches Entzinken') && selectedVerfahren === 'Chemisch') ||
      (label.includes('Elektrochemisches Entzinken') && selectedVerfahren === 'Elektrochemisch') ||    

        // Vernickeln
  (label.includes('Chemisches Vernickeln') && selectedVerfahren === 'Chemisch') ||
  (label.includes('Galvanisches Vernickeln') && selectedVerfahren === 'Galvanisch') ||

  // Verzinnen
(label.includes('Chemisches Verzinnen') && selectedVerfahren === 'Chemisch') ||
(label.includes('Galvanisches Verzinnen') && selectedVerfahren === 'Galvanisch') ||


  // Enteloxieren
  (label.includes('Standards für Chemisches Enteloxieren') && selectedVerfahren === 'Chemisch') ||
  (label.includes('Standards für Elektrochemisches Enteloxieren') && selectedVerfahren === 'Elektrochemisch')
);


    if (!isRelevant) {
      updated[label] = [];
    }
  });

  return updated;
});

}, [specSelections['Verfahren wählen']]);

const [text, setText] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);
const [submitSuccess, setSubmitSuccess] = useState(false);

const [agbAccepted, setAgbAccepted] = useState(false);
const [agbError, setAgbError] = useState(false);
const [showDropdownError, setShowDropdownError] = useState(false);


const calculateProgress = () => {
  let progress = 0;
  if (files.length > 0) progress += 20;
  if (selectedOption1) progress += 20;
  if (selectedOption2) progress += 20;
  if (selectedOption3) progress += 20;
  if (agbAccepted) progress += 20;
  return progress;
};

const allOptions = [
  "Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren",
  "Verzinnen", "Entlacken", "Aluminieren", "Strahlen", "Folieren",
  "Isolierstegverpressen", "Einlagern", "Entzinken", "Entzinnen", "Entnickeln",
  "Vernickeln", "Entanodisieren", ,"Entaluminieren", "Enteloxieren"
];
const specificationsMap: Record<string, Specification[]> = {

  Verzinnen: [
  { type: 'title', label: 'Zertifizierungen' },
  { type: 'checkbox', label: 'ISO 9001' },
  { type: 'checkbox', label: 'ISO 14001' },
  { type: 'checkbox', label: 'RoHS / REACH' },

  { type: 'radio', label: 'Verfahren wählen', options: ['Chemisch', 'Galvanisch'] },

  {
    type: 'group',
    label: 'Standards für Chemisches Verzinnen',
    options: [
      { type: 'checkbox', label: 'DIN EN ISO 21874' },
      { type: 'checkbox', label: 'DIN EN ISO 2093' }
    ]
  },
  {
    type: 'group',
    label: 'Standards für Galvanisches Verzinnen',
    options: [
      { type: 'checkbox', label: 'DIN EN ISO 2093' },
      { type: 'checkbox', label: 'DIN EN ISO 2080' }
    ]
  }
],
  Nasslackieren: [
    { type: 'text', label: 'Lackhersteller' },
    { type: 'text', label: 'Farbbezeichnung' },
    {
    type: 'radio',
    label: 'Farbpalette',
    options: ['RAL', 'NCS', 'MCS', 'DB', 'BS', 'Munsell', 'Candy', 'Neon', 'Pantone', 'Sikkens', 'HKS', 'Klarlack', 'Sonderfarbe / Nach Vorlage', 'RAL D2-Design', 'RAL E4-Effekt']
  },
  {
    type: 'radio',
    label: 'Oberfläche',
    options: ['Glatt', 'Feinstruktur', 'Grobstruktur']
  },
   {
    type: 'radio',
    label: 'Glanzgrad',
    options: ['Hochglanz', 'Seidenglanz', 'Glanz', 'Matt', 'Seidenmatt', 'Stumpfmatt']
  },
  {
    type: 'radio',
    label: 'Qualität',
    options: ['Polyester', 'Epoxy-Polyester', 'Polyester für Feuerverzinkung', 'Thermoplast']
  },
  {
    type: 'group',
    label: 'Effekte',
    options: [
      { type: 'checkbox', label: 'Metallic' },
      { type: 'checkbox', label: 'Fluoreszierend' }
    ]},
  {
    type: 'group',
    label: 'Zusatz',
    options: [
      { type: 'checkbox', label: 'Ich brauche eine Duplexbeschichtung für erhöhten Korrosionsschutz (Grundierung & 2. Lackschicht)' },
      { type: 'checkbox', label: 'Ich möchte eine zweifärbige Beschichtung (Zweitfarbe bitte in der Beschreibung angeben)' },
      { type: 'checkbox', label: ' Ich stelle den Lack für meinen Auftrag in ausreichender Menge und Qualität bei' }]},      
    {
    type: 'group',
    label: 'Zertifizierungsanforderungen an den Beschichter:',
    options: [
      { type: 'checkbox', label: 'GSB (alle Stufen)' },
      { type: 'checkbox', label: 'Qualicoat (alle Stufen)' },
      { type: 'checkbox', label: 'Qualisteelcoat Zertifizierung' },
      { type: 'checkbox', label: 'ISO:9001 Zertifizierung' },
      { type: 'checkbox', label: 'DIN 55634-2' },
      { type: 'checkbox', label: 'DBS 918 340' },
      { type: 'checkbox', label: 'DIN EN 1090-2' },
    ]}, 
],
  Verzinken: [    
    { type: 'title', label: 'Zertifizierungen' }, // <-- Überschrift
    { type: 'checkbox', label: 'ISO 9001' },
    { type: 'checkbox', label: 'ISO 14001' },
    { type: 'checkbox', label: 'RoHS-Konformität' },
    { type: 'radio', label: 'Verfahren wählen', options: ['Feuerverzinken' ,'Diffusionsverzinken (Sherardisieren)', 'Galvanisches Verzinken', 'Lamellenverzinken', 'Mechanisches Verzinken'] },
    // Zusatzoptionen
  {
    type: 'group',
    label: 'Normen & Standards (nur bei Feuerverzinken)',
    options: [
      { type: 'checkbox', label: 'RAL-GZ 639 – Anforderungen an Verfahren' },
      { type: 'checkbox', label: 'DIN EN ISO 1461 – Anforderungen an Zinküberzüge' },      
    ]},
  {
    type: 'group',
    label: 'Normen & Standards (nur bei Galvanischem Verzinken)',
    options: [
      { type: 'checkbox', label: 'DIN EN ISO 2081 – Galvanische Überzüge aus Zink' },
      { type: 'checkbox', label: 'Korrosionsschutzklasse gemäß ISO 9227 (Salzsprühnebeltest)' },
      { type: 'checkbox', label: 'DIN EN ISO 198598 für Zink-Nickel-Schichten, Korrosionsschutzklasse C4-C5' }
    ]
  },
  {
    type: 'group',
    label: 'Normen & Standards (nur bei Diffusionsverzinken)',
    options: [
      { type: 'checkbox', label: 'DIN 50942 – Sherardisieren' },
      { type: 'checkbox', label: 'DIN EN ISO 14713-3 – Zinkdiffusionsüberzüge' }
    ]
  },
    {
    type: 'group',
    label: 'Normen & Standards (nur bei Lamellenverzinken)',
    options: [
      { type: 'checkbox', label: 'Schichtsysteme gemäß ISO 10683 (z. B. Zinklamellen)' },
      { type: 'checkbox', label: 'Reibungsbeiwert-Anforderungen (z. B. für Schrauben)' }
    ]
  },
  {
    type: 'group',
    label: 'Normen & Standards (nur bei Mechanischem Verzinken)',
    options: [
      { type: 'checkbox', label: 'ASTM B695 – Mechanisches Zinkbeschichten' },
      { type: 'checkbox', label: 'DIN EN ISO 14713-3 – Mechanisch aufgebrachte Zinküberzüge' }
    ]
  },
],
Aluminieren: [    
    { type: 'title', label: 'Zertifizierungen' }, // <-- Überschrift
    { type: 'checkbox', label: 'ISO 9001' },
    { type: 'checkbox', label: 'ISO 14001' },
    { type: 'checkbox', label: 'ISO 45001' },
    { type: 'checkbox', label: 'RoHS-Konformität' },
    { type: 'radio', label: 'Verfahren wählen', options: ['Feueraluminieren' ,'Thermisches Spritzen', 'Packaluminieren'] },
    // Zusatzoptionen
   // Nur für Thermisches Aluminieren
   // Nur für Feueraluminieren
  {
    type: 'group',
    label: 'Standards für Feueraluminieren',
    options: [
      { type: 'checkbox', label: 'ASTM A1059' },
      { type: 'checkbox', label: 'DIN EN 22063' }
    ]
  },// Nur für Thermisches Spritzen
  {
    type: 'group',
    label: 'Standards für Thermisches Spritzen',
    options: [
      { type: 'checkbox', label: 'DIN EN ISO 14918' },
      { type: 'checkbox', label: 'DIN EN ISO 2063' }
    ]},
  // Nur für Packaluminieren
  {
    type: 'group',
    label: 'Standards für Packaluminieren',
    options: [
      { type: 'checkbox', label: 'AMS 2415' },
      { type: 'checkbox', label: 'MIL-C-83488' }
    ]}],

    Vernickeln: [    
  { type: 'title', label: 'Zertifizierungen' },
  { type: 'checkbox', label: 'ISO 9001' },
  { type: 'checkbox', label: 'ISO 14001' },
  { type: 'checkbox', label: 'ISO 45001' },
  { type: 'checkbox', label: 'RoHS-Konformität' },

  { type: 'radio', label: 'Verfahren wählen', options: ['Chemisch', 'Galvanisch'] },

  {
    type: 'group',
    label: 'Standards für Chemisches Vernickeln',
    options: [
      { type: 'checkbox', label: 'DIN EN ISO 4526' },
      { type: 'checkbox', label: 'DIN EN ISO 9227' }
    ]
  },
  {
    type: 'group',
    label: 'Standards für Galvanisches Vernickeln',
    options: [
      { type: 'checkbox', label: 'DIN EN ISO 1456' },
      { type: 'checkbox', label: 'DIN EN ISO 2080' },
      { type: 'checkbox', label: 'DIN EN ISO 9227' }
    ]
  }
],





    Entaluminieren: [    
    { type: 'title', label: 'Zertifizierungen' }, // <-- Überschrift
    { type: 'checkbox', label: 'ISO 9001' },
    { type: 'checkbox', label: 'ISO 14001' },    
    { type: 'checkbox', label: 'RoHS-Konformität' },
    { type: 'radio', label: 'Verfahren wählen', options: ['Chemisch' ,'Elektrochemisch', 'Mechanisch'] },
    
  {
    type: 'group',
    label: 'Standards für Chemisches Entaluminieren',
    options: [
      { type: 'checkbox', label: 'ASTM B600' },
      { type: 'checkbox', label: 'DIN EN ISO 2812' }
    ]
  },
  
  {
    type: 'group',
    label: 'Standards für Elektrochemisches Entaluminieren',
    options: [
      { type: 'checkbox', label: 'DIN EN ISO 15730' },      
    ]},
    {
    type: 'group',
    label: 'Standards für Mechanisches Entaluminieren',
    options: [
    { type: 'checkbox', label: 'DIN EN ISO 8501-1 – Oberflächenvorbereitung durch Strahlen' },
    { type: 'checkbox', label: 'DIN EN ISO 11127 – Prüfmethoden für Strahlmittel' },
    { type: 'checkbox', label: 'DIN EN ISO 12944 – Korrosionsschutz von Stahlbauten durch Beschichtungssysteme' },
    
  ]}],

  Entzinken: [    
    { type: 'title', label: 'Zertifizierungen' }, // <-- Überschrift
    { type: 'checkbox', label: 'ISO 9001' },
    { type: 'checkbox', label: 'ISO 14001' },    
    { type: 'checkbox', label: 'RoHS / REACH-Konformität' },
    { type: 'radio', label: 'Verfahren wählen', options: ['Chemisch' ,'Elektrochemisch'] },
    
  {
    type: 'group',
    label: 'Standards für Chemisches Entzinken',
    options: [
      { type: 'checkbox', label: 'DIN EN ISO 1111x' },      
    ]
  }, 
  {
    type: 'group',
    label: 'Standards für Elektrochemisches Entzinken',
    options: [
      { type: 'checkbox', label: 'DIN EN ISO 15730' },      
    ]},
    ],



  Entzinnen: [    
    { type: 'title', label: 'Zertifizierungen' }, // <-- Überschrift
    { type: 'checkbox', label: 'ISO 9001' },
    { type: 'checkbox', label: 'ISO 14001' },    
    { type: 'checkbox', label: 'RoHS-Konformität' },
    { type: 'radio', label: 'Verfahren wählen', options: ['Chemisch' ,'Elektrochemisch'] },  
  
  
    ],

    Entnickeln: [    
    { type: 'title', label: 'Zertifizierungen' }, // <-- Überschrift
    { type: 'checkbox', label: 'ISO 9001' },
    { type: 'checkbox', label: 'ISO 14001' },    
    { type: 'checkbox', label: 'RoHS-Konformität' },
    { type: 'radio', label: 'Verfahren wählen', options: ['Chemisch' ,'Elektrochemisch'] },
    
  {
    type: 'group',
    label: 'Standards für Chemisches Entnickeln',
    options: [
      { type: 'checkbox', label: 'DIN EN 12472 ' },
      
    ]
  },  
  {
    type: 'group',
    label: 'Standards für Elektrochemisches Entnickeln',
    options: [
      { type: 'checkbox', label: 'DIN EN ISO 15730' },      
    ]},
    ],



  Enteloxieren: [    
    { type: 'title', label: 'Zertifizierungen' }, // <-- Überschrift
    { type: 'checkbox', label: 'ISO 9001' },
    { type: 'checkbox', label: 'ISO 14001' },    
    { type: 'checkbox', label: 'RoHS-Konformität' },
    { type: 'radio', label: 'Verfahren wählen', options: ['Chemisch' ,'Elektrochemisch'] },
    
  {
    type: 'group',
    label: 'Standards für Chemisches Enteloxieren',
    options: [
      { type: 'checkbox', label: 'Qualanod' },
      { type: 'checkbox', label: 'ISO 2819' },
      { type: 'checkbox', label: 'DIN EN ISO 7599' },
      { type: 'checkbox', label: 'DIN 50939' }
    ]
  },  
  {
    type: 'group',
    label: 'Standards für Elektrochemisches Enteloxieren',
    options: [
      { type: 'checkbox', label: 'DIN EN ISO 7599' },      
    ]},
    ],

    Eloxieren: [
    
  
  {
    type: 'group',
    label: 'Zertifizierungen',
    options: [
      { type: 'checkbox', label: 'ISO 9001' },
      { type: 'checkbox', label: 'ISO 14001' },
      { type: 'checkbox', label: 'RoHS / REACH' },
      { type: 'checkbox', label: 'Qualanod' },
      { type: 'checkbox', label: 'GSB International' },
      { type: 'checkbox', label: 'DIN EN 1090-2' }
    ]},
     {
    type: 'group',
    label: 'Standards',
    options: [
      { type: 'checkbox', label: 'DIN EN ISO 7599' },
      { type: 'checkbox', label: 'DIN EN ISO 2360' },
      { type: 'checkbox', label: 'DIN EN ISO 8993' },
      { type: 'checkbox', label: 'DIN 50939' },
      
    ]},
   
],

Anodisieren: [
    
  
  {
    type: 'group',
    label: 'Zertifizierungen',
    options: [
      { type: 'checkbox', label: 'ISO 9001' },
      { type: 'checkbox', label: 'ISO 14001' },
      { type: 'checkbox', label: 'RoHS / REACH' }
    ]},
     {
    type: 'group',
    label: 'Standards',
    options: [
      { type: 'checkbox', label: 'ISO 8080 – Anodisieren von Magnesium und Magnesiumlegierungen' },
      { type: 'checkbox', label: 'ISO 8077 – Anodisieren von Titan' },
      
      
    ]},
   
],


  Pulverbeschichten: [
    { type: 'text', label: 'Lackhersteller' },
    { type: 'text', label: 'Farbbezeichnung' },
    {
    type: 'radio',
    label: 'Farbpalette',
    options: ['RAL', 'NCS', 'MCS', 'DB', 'BS', 'Munsell', 'Candy', 'Neon', 'Pantone', 'Sikkens', 'HKS', 'Klarlack', 'Sonderfarbe / Nach Vorlage', 'RAL D2-Design', 'RAL E4-Effekt']
  },
  {
    type: 'radio',
    label: 'Oberfläche',
    options: ['Glatt', 'Feinstruktur', 'Grobstruktur']
  },
   {
    type: 'radio',
    label: 'Glanzgrad',
    options: ['Hochglanz', 'Seidenglanz', 'Glanz', 'Matt', 'Seidenmatt', 'Stumpfmatt']
  },
  {
    type: 'radio',
    label: 'Qualität',
    options: ['Polyester', 'Epoxy-Polyester', 'Polyester für Feuerverzinkung', 'Thermoplast']
  },
  {
    type: 'group',
    label: 'Effekte',
    options: [
      { type: 'checkbox', label: 'Metallic' },
      { type: 'checkbox', label: 'Fluoreszierend' }
    ]},
  {
    type: 'group',
    label: 'Zusatz',
    options: [
      { type: 'checkbox', label: 'Ich brauche eine Duplexbeschichtung für erhöhten Korrosionsschutz (Grundierung & 2. Lackschicht)' },
      { type: 'checkbox', label: 'Ich möchte eine zweifärbige Beschichtung (Zweitfarbe bitte in der Beschreibung angeben)' },
      { type: 'checkbox', label: ' Ich stelle den Lack für meinen Auftrag in ausreichender Menge und Qualität bei' }]},      
    {
    type: 'group',
    label: 'Zertifizierungsanforderungen an den Beschichter:',
    options: [
      { type: 'checkbox', label: 'GSB (alle Stufen)' },
      { type: 'checkbox', label: 'Qualicoat (alle Stufen)' },
      { type: 'checkbox', label: 'Qualisteelcoat Zertifizierung' },
      { type: 'checkbox', label: 'ISO 9001 Zertifizierung' },
      { type: 'checkbox', label: 'ISO 14001' },
      { type: 'checkbox', label: 'DIN 55634-2' },
      { type: 'checkbox', label: 'DBS 918 340' },
      { type: 'checkbox', label: 'DIN EN 1090-2' },
    ]}, 
],

Entanodisieren: [
    { type: 'title', label: 'Zertifizierungen' }, // <-- Überschrift
    { type: 'checkbox', label: 'ISO 9001' },
    { type: 'checkbox', label: 'ISO 14001' },    
    { type: 'checkbox', label: 'REACH & RoHS' },  
  ],
  Folieren: [
    { type: 'title', label: 'Zertifizierungen' }, // <-- Überschrift
    { type: 'checkbox', label: 'ISO 9001' },
    { type: 'checkbox', label: 'ISO 14001' },
    { type: 'checkbox', label: 'DIN EN 13523' },
    { type: 'checkbox', label: 'RAL-GZ 716' },
    { type: 'checkbox', label: 'DIN EN ISO 4892-2' },
    { type: 'checkbox', label: 'REACH & RoHS' },
    { type: 'checkbox', label: 'DIN EN 13501-1' },
    {
    type: 'radio',
    label: 'Anwendung',
    options: ['Innen ', 'Außen']
  },
  { type: 'text', label: 'Folienhersteller' },
  {
    type: 'radio',
    label: 'Verfahren',
    options: ['Thermisches Kaschieren ', 'Kaltlaminieren', 'Nassverkleben']
  },
  ],
  Isolierstegverpressen: [
    { type: 'title', label: 'Zertifizierungen' }, // <-- Überschrift
    { type: 'checkbox', label: 'ISO 9001' },
    { type: 'checkbox', label: 'ISO 14001' },
    { type: 'checkbox', label: 'DIN EN 14024' },
    { type: 'checkbox', label: 'DIN EN ISO 10077-2' },
    { type: 'checkbox', label: 'RAL-GZ 607/3' },
    { type: 'checkbox', label: 'DIN EN ISO 4892-2' },
    { type: 'checkbox', label: 'REACH & RoHS' },
    
  ],
  Einlagern: [
    
    { type: 'checkbox', label: 'Bitte im Trockenen lagern' },
  ],
  // Weitere Schritte ergänzen...
};

const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
const [lieferDatum, setLieferDatum] = useState('');
const [abholDatum, setAbholDatum] = useState('');
const [lieferArt, setLieferArt] = useState('');
const [abholArt, setAbholArt] = useState('');
const [logistikError, setLogistikError] = useState(false);

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  let hasError = false;

  // AGB prüfen
  if (!agbAccepted) {
    setAgbError(true);
    hasError = true;
  } else {
    setAgbError(false);
  }

  // Dropdown prüfen
  if (!selectedOption1) {
    setShowDropdownError(true);
    hasError = true;
  } else {
    setShowDropdownError(false);
  }

  // Logistik prüfen
  const today = new Date().toISOString().split('T')[0];
  const isLieferDatumValid = !!lieferDatum && new Date(lieferDatum) >= new Date(today);
  const isAbholDatumValid = !!abholDatum && new Date(abholDatum) >= new Date(lieferDatum);

  if (
    !lieferDatum ||
    !abholDatum ||
    !lieferArt ||
    !abholArt ||
    !isLieferDatumValid ||
    !isAbholDatumValid
  ) {
    setLogistikError(true);
    hasError = true;
  } else {
    setLogistikError(false);
  }
  // Materialgüte prüfen
if (!materialGuete || (materialGuete === 'Andere' && !customMaterial.trim())) {
  setMaterialGueteError(true);
  hasError = true;
} else {
  setMaterialGueteError(false);
}

// Abmessungen prüfen
if (!laenge || !breite || !hoehe || !masse) {
  setAbmessungError(true);
  hasError = true;
} else {
  setAbmessungError(false);
}


  // Wenn Fehler: abbrechen
  if (hasError) return;

  // Wenn alles OK
  setIsSubmitting(true);
  setSubmitSuccess(false);

  setTimeout(() => {
    setIsSubmitting(false);
    setSubmitSuccess(true);

    setTimeout(() => {
      setSubmitSuccess(false);
    }, 3000);
  }, 2000);
};


const validSecondOptions: { [key: string]: string[] } = {
    "Nasslackieren": ["Folieren", "Isolierstegverpressen", "Einlagern"],
    "Pulverbeschichten": ["Folieren", "Isolierstegverpressen", "Einlagern"],
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
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen","Einlagern"],
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
      "Pulverbeschichten": ["Folieren", "Einlagern", "Isolierstegverpressen"],
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
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen"],
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
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen","Einlagern"],
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
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen","Einlagern"],
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
    " ": {
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
  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`"${file.name}" ist größer als ${MAX_FILE_SIZE_MB} MB.`);
        return false;
      }
      return true;
    });

    if (files.length + validFiles.length > MAX_FILES) {
      alert(`Maximal ${MAX_FILES} Dateien erlaubt.`);
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

 const getPreviewIconComponent = (file: File) => {
  if (file.type.startsWith('image/')) return <FileImage size={40} color="#0f172a" />;
  if (file.type === 'application/pdf') return <FileText size={40} color="#dc2626" />;
  if (file.name.endsWith('.zip')) return <FileArchive size={40} color="#78350f" />;
  return <File size={40} color="#475569" />;
};
  const [showSteps, setShowSteps] = useState(true);

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  };
  return (    
    <div className={oswald.className}>        
    <><Navbar />            
   <form onSubmit={handleSubmit} className={styles.wrapper}>
      <motion.div {...fadeIn} className={styles.infoBox}>
        💡 Ab sofort ist das Einholen von Angeboten <strong>kostenlos</strong>!
          <a href="/mehr-erfahren" className={styles.infoLink}>Mehr erfahren</a>
      </motion.div>

      <motion.div {...fadeIn} className={styles.stepsAnimation}>
        <h3>Sag uns in 3 einfachen Schritten, was du <span className={styles.highlight}>erledigt</span> haben möchtest.
        <button
  type="button"
  onClick={() => setShowSteps(!showSteps)}
  className={styles.toggleButton}
>
  {showSteps ? '' : ''}{' '}
  {showSteps ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
</button></h3>
  <AnimatePresence initial={false}>
  {showSteps && (
    <motion.div
      className={styles.stepsBoxContainer}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      {[1, 2, 3].map((step, index) => (
        <motion.div
          key={step}
          className={styles.stepBox}
          animate={{
            borderColor: index === activeStep ? '#00b4d8' : '#00e5ff',
            boxShadow:
              index === activeStep
                ? '0 0 6px 2px rgba(0, 229, 255, 0.8)'
                : '0 0 0 0 rgba(0,0,0,0)',
            scale: index === activeStep ? 1.03 : 1.02,
          }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <div
            className={`${styles.stepNumber} ${step === 2 ? styles.stepNumberMobileMargin : ''}`}
          >
            {step}
          </div>
          <strong
            className={`${styles.stepTitle} ${
              index === 0 || index === 2 ? styles.mbMobile : ''
            }`}
          >
            {['Dateien hochladen', 'Verfahren & Logistik wählen', 'Beschreibung hinzufügen'][index]}
          </strong>


          <div className={styles.stepIcon}>{stepIcons[index]}</div>
          <p>
            {[
              'Laden Sie Skizzen, Zeichnungen oder Fotos Ihrer Teile hoch – ganz einfach per Drag & Drop oder Klick. Je genauer Ihre Daten, desto präziser das Angebot.',
              'Wählen Sie die gewünschten Bearbeitungsverfahren und geben Sie an, ob ihr Material abgeholt & geliefert werden soll, oder Sie es selbst bringen möchten.',
              'Teilen Sie mit, was Ihnen wichtig ist: besondere Anforderungen an Schichtdicke, Verpackung, Termine, Rückfragen – Ihr Beschichtungswunsch wird erfüllt, dafür stehen wir.'
            ][index]}
          </p>
        </motion.div>
      ))}
    </motion.div>
  )}
</AnimatePresence>
</motion.div>

      <motion.div {...fadeIn}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '2.5rem', marginBottom: '2.5rem' }}>
  <div className={styles.stepNumber}>1</div>
  <h2 className={styles.headingSection} style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
    Lade Fotos & Dateien zu deinem Auftrag hoch
    <span className={styles.iconTooltip}>
      <HelpCircle size={18} />
      <span className={styles.tooltipText}>
        Sie können bis zu 8 Dateien zu Ihrem Auftrag hinzufügen (alle gängigen Dateitypen).
        Beschichter möchten alle Details kennen, um alle Anforderungen an den Auftrag erfüllen zu können.
        Dies gibt Ihnen und dem Beschichter die nötige Sicherheit für die Produktion Ihres Auftrags.
      </span>
    </span>
  </h2>
</div>
<div
          className={styles.dropzone}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => e.preventDefault()}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <div className={styles.counter}>{files.length} / {MAX_FILES} Dateien hochgeladen</div>
          <p className={styles.dropText}>
            Dateien hierher ziehen oder <span className={styles.circleText}>klicken</span>
          </p>
          <input
            type="file"
            id="file-upload"
            multiple
            className={styles.input}
            onChange={handleUploadClick}
          />
        </div>

        {files.length > 0 && (
  <>
    <div className={styles.preview}>
      {files.map((file, index) => (
        <div className={styles.fileCard} key={index}>
          <div className={styles.fileIcon}>
            {getPreviewIconComponent(file)}
          </div>
          <p className={styles.fileName}>{file.name}</p>
          <button
            type="button"
            onClick={() => removeFile(index)}
            className={styles.removeButton}
          >
            ✖
          </button>
        </div>
      ))}
    </div>
    <button
      type="button"
      onClick={() => setFiles([])}
      className={styles.clearAllButton}
    >
      Alles entfernen
    </button>
  </>
)}
      </motion.div>
      <div className={styles.borderedContainer}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '2.5rem', marginBottom: '2.5rem' }}>
  <div className={styles.stepNumber}>2</div>
  <h2 className={styles.headingSection} style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
    Arbeitsschritte und Logistik wählen
    <span className={styles.iconTooltip}>
      <HelpCircle size={18} />
      <span className={styles.tooltipText}>
        Hier können Sie genaue Angaben zum gewünschten Verfahren machen.
      </span>
    </span>
  </h2>
</div>
<div className={styles.dropdownSection}>
  <label htmlFor="step1" className={styles.labelSmall}>Arbeitsschritt 1:</label>
 <select
  id="step1"
  className={`${styles.dropdown} ${showDropdownError ? styles.dropdownError : ''}`}
  value={selectedOption1}
  onChange={(e) => {
    const selected = e.target.value;
    setSelectedOption1(selected);
    setSelectedOption2('');
    setSelectedOption3('');
    setShowDropdownError(false); // Fehler zurücksetzen beim Ändern
  }}
>
  <option value="">Bitte wählen</option>
  {allOptions.map(option => (
    <option key={option} value={option}>{option}</option>
  ))}
</select>
 <AnimatePresence mode="wait">
  {selectedOption1 && specificationsMap[selectedOption1] && (
    <motion.div
      key={`spec-1-${selectedOption1}`}
      className={styles.specsBox}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <SpecBlock
        title={selectedOption1}
        specs={specificationsMap[selectedOption1]}
        specSelections={specSelections}
        setSpecSelections={setSpecSelections}
      />
    </motion.div>
  )}
</AnimatePresence>

</div>




{selectedOption1 && (
  <div className={styles.dropdownSection}>
    <label htmlFor="step2" className={styles.labelSmall}>Arbeitsschritt 2 (optional):</label>
    <select
      id="step2"
      className={styles.dropdown}
      value={selectedOption2}
      onChange={(e) => {
        setSelectedOption2(e.target.value);
        setSelectedOption3('');
      }}
    >
      <option value="">Bitte wählen</option>
      {(validSecondOptions[selectedOption1] || []).map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>

    <AnimatePresence mode="wait">
      {selectedOption2 && specificationsMap[selectedOption2] && (
        <motion.div
          key={`spec-2-${selectedOption2}`}
          className={styles.specsBox}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <SpecBlock
            title={selectedOption2}
            specs={specificationsMap[selectedOption2]}
            specSelections={specSelections}
            setSpecSelections={setSpecSelections}
          />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)}



{/* 3. Arbeitsschritt */}
{selectedOption1 && selectedOption2 && (
  <div className={styles.dropdownSection}>
    <label htmlFor="step3" className={styles.labelSmall}>Arbeitsschritt 3 (optional):</label>
    <select
      id="step3"
      className={styles.dropdown}
      value={selectedOption3}
      onChange={(e) => setSelectedOption3(e.target.value)}
    >
      <option value="">Bitte wählen</option>
      {(validThirdOptions[selectedOption1]?.[selectedOption2] || []).map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>

    <AnimatePresence mode="wait">
      {selectedOption3 && specificationsMap[selectedOption3] && (
        <motion.div
          key={`spec-3-${selectedOption3}`}
          className={styles.specsBox}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <SpecBlock
            title={selectedOption3}
            specs={specificationsMap[selectedOption3]}
            specSelections={specSelections}
            setSpecSelections={setSpecSelections}
          />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)}


<div className={styles.materialBox}>
  <div className={styles.materialBoxÜB}><p>Materialgüte wählen:</p></div>
  <div className={styles.radioGrid}>
    {[
      'Aluminium', 'Aluguss', 'Eloxiert', 'Anodisiert', 'Stahl',
      'Edelstahl', 'Kupfer', 'Zink', 'Zinn', 'Nickel',
       'Chrom', 'Andere'
    ].map(material => (
      <label
  key={material}
  className={`${styles.radioMaterial} ${
    materialGueteError && !materialGuete ? styles.radioError : ''
  }`}
>

        <input
          type="radio"
          name="materialGuete"
          value={material}
          checked={materialGuete === material}
          onChange={(e) => setMaterialGuete(e.target.value)}
          disabled={
            (selectedOption1 === 'Eloxieren' ||
             selectedOption2 === 'Eloxieren' ||
             selectedOption3 === 'Eloxieren') && material !== 'Aluminium'
          }
        />
        {material}
      </label>
    ))}
  </div>
  

  <AnimatePresence initial={false} mode="wait">
    {materialGuete === 'Andere' && (
      <motion.div
        key="custom-input"
        className={styles.customInputBox}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        <input
  type="text"
  placeholder="Bitte Material angeben"
  value={customMaterial}
  onChange={(e) => setCustomMaterial(e.target.value)}
  className={materialGueteError && materialGuete === 'Andere' && !customMaterial ? styles.inputError : ''}
/>

      </motion.div>
    )}
    <div className={styles.container}>
  {/* Linke Hälfte */}
  <div className={styles.half}>
    <h2>Abmessungen größtes Werkstück (mm):</h2>
    <div className={styles.rowGroup}>
      <div className={styles.labeledInput}>
        <label>Länge</label>
        <div className={styles.inputWithUnit}>
          <input
  type="number"
  value={laenge}
  onChange={(e) => setLaenge(e.target.value.replace(/\D/g, '').slice(0, 6))}
  className={`${styles.inputField} ${abmessungError && !laenge ? styles.inputError : ''}`}
  inputMode="numeric"
/>


          <span>mm</span>
        </div>
      </div>
      <div className={styles.labeledInput}>
        <label>Breite</label>
        <div className={styles.inputWithUnit}>
          <input
  type="number"
  value={breite}
  onChange={(e) => setBreite(e.target.value.replace(/\D/g, '').slice(0, 6))}
  className={`${styles.inputField} ${abmessungError && !breite ? styles.inputError : ''}`}
  inputMode="numeric"
/>


          <span>mm</span>
        </div>
      </div>
      <div className={styles.labeledInput}>
        <label>Höhe</label>
        <div className={styles.inputWithUnit}>
          <input
  type="number"
  value={hoehe}
  onChange={(e) => setHoehe(e.target.value.replace(/\D/g, '').slice(0, 6))}
  className={`${styles.inputField} ${abmessungError && !hoehe ? styles.inputError : ''}`}
  inputMode="numeric"
/>


          <span>mm</span>
        </div>
      </div>
    </div>
  </div>

  {/* Rechte Hälfte */}
  <div className={styles.half}>
    <h2>Masse schwerstes Werkstück (kg):</h2>
    <div className={styles.labeledInput}>
      
      <div className={styles.inputWithUnit}>
        <input
  type="number"
  value={masse}
  onChange={(e) => setMasse(e.target.value.replace(/\D/g, '').slice(0, 4))} // optional 4 statt 6 Stellen
  className={`${styles.inputField} ${abmessungError && !masse ? styles.inputError : ''}`}
  inputMode="numeric"
/>


        <span>kg</span>
      </div>
    </div>
  </div>
</div>

  </AnimatePresence> 
</div>
{selectedOption1 && (
<LogistikBox
  lieferDatum={lieferDatum}
  setLieferDatumAction={setLieferDatum}
  lieferArt={lieferArt}
  setLieferArtAction={setLieferArt}
  abholDatum={abholDatum}
  setAbholDatumAction={setAbholDatum}
  abholArt={abholArt}
  setAbholArtAction={setAbholArt}
  showErrors={logistikError}
/>)}
</div>
<div className={styles.borderedContainer}>
<div className={styles.textfeldContainer}>  
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '2.5rem', marginBottom: '2.5rem' }}>
  <div className={styles.stepNumber}>3</div>
  <h2 className={styles.headingSection} style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
    Beschreibung
    <span className={styles.iconTooltip}>
      <HelpCircle size={18} />
      <span className={styles.tooltipText}>
        Hier können Sie genaue Angaben zum gewünschten Verfahren machen.
      </span>
    </span>
  </h2>
</div>
  <textarea
    id="beschreibung"
    className={styles.oswaldTextarea}
    value={text}
    onChange={(e) => {
      if (e.target.value.length <= 400) {
        setText(e.target.value);
      }
    }}
    placeholder={`Um einen reibungslosen Ablauf zu gewährleisten, stellen Sie bitte sicher, dass Ihr Material:

- Den Angaben entspricht (keine qualitativen / quantitativen Abweichungen)
- Frei von Fremdstoffen ist (Rost, Zunder, Kleber, Fette, Öle, Lacke, Schmutz, Silikon, etc.)
- Bei thermischen Verfahren der Hitzeeinwirkung standhält
- Kontaktstellen zum Aufhängen / Einspannen verfügt; kennzeichnen Sie ggf. genau, an welcher Stelle ihr Material für die Beschichtung kontaktiert werden kann
- Dass die Verpackung Transportsicherheit und allg. Sicherheit gewährleistet`}
    rows={5}
  />
  <div
    className={styles.charCount}
    style={{ color: text.length > 370 ? '#dc2626' : '#64748b' }}
  >
    {text.length}/400 Zeichen
  </div>
</div>
</div>
      <motion.div {...fadeIn} className={styles.progressContainer}>
    <div className={styles.progressBarWrapper}>
  <div
    className={styles.progressBar}
    style={{ width: `${calculateProgress()}%` }}

  >
    <span className={styles.progressValue}>
      {calculateProgress()}%
    </span>
  </div>
</div>
  </motion.div>
  <motion.div {...fadeIn} className={styles.previewSection}>
    <h2>Live-Vorschau</h2>
    <ul>
  <li>Fotos & Dateien: {files.map(f => f.name).join(', ') || 'Keine'}</li>
  <li>Verfahren: {selectedOption1 || '–'}</li>
  {selectedOption2 && <li>2. Schritt: {selectedOption2}</li>}
  {selectedOption3 && <li>3. Schritt: {selectedOption3}</li>}
  <li>Materialgüte: {materialGuete === 'Andere' ? customMaterial || '–' : materialGuete || '–'}</li>
  <li>Max. Abmessungen: {laenge || '–'} × {breite || '–'} × {hoehe || '–'} mm</li>
  <li>Max. Masse: {masse || '–'} kg</li>
  <li>Lieferdatum: {lieferDatum || '–'}</li>
  <li>Anlieferart: {lieferArt || '–'}</li>
  <li>Abholdatum: {abholDatum || '–'}</li>
  <li>Abholart: {abholArt || '–'}</li>
  <li>Beschreibung: {text.trim() || '–'}</li>

  
</ul>

  </motion.div>
  <div className={styles.agbContainer}>
  <motion.label
  className={`${styles.agbLabel} ${agbError ? styles.agbError : ''}`}
  animate={agbError ? { x: [0, -4, 4, -4, 0] } : {}}
  transition={{ duration: 0.3 }}
>
 <input
  type="checkbox"
  checked={agbAccepted}
  onChange={(e) => {
    setAgbAccepted(e.target.checked);
    setAgbError(false);
  }}
  />
  <label htmlFor="agbCheckbox">
  Ich habe die{' '}
  <a href="/agb" className={styles.agbLink}>
    AGB
  </a>{' '}
  gelesen und bin damit einverstanden.
</label>


</motion.label>  
</div>
  <button type="submit" className={styles.submitButton}>
    Kostenlos Angebote einholen
  </button>
{submitSuccess && (
  <div className={styles.successMessage}>
    <CheckCircle size={20} style={{ marginRight: '0.5rem' }} />
    Ihre Anfrage wurde erfolgreich übermittelt.
  </div>

  
)}

</form>
</></div>
  );
}
