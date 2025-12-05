'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './VerfahrenUndLogistik.module.css';
import { HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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
  specificationsMap: Record<string, Specification[]>;
  specSelections: Record<string, string | string[]>;
  setSpecSelections: React.Dispatch<
    React.SetStateAction<Record<string, string | string[]>>
  >;
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
  Pulverbeschichten: [
    'Nasslackieren',
    'Folieren',
    'Isolierstegverpressen',
    'Einlagern',
  ],
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

const VerfahrenUndLogistik: React.FC<VerfahrenUndLogistikProps> = ({
  specificationsMap,
  selectedOption1,
  setSelectedOption1,
  selectedOption2,
  setSelectedOption2,
  specSelections,
  setSpecSelections,
  verfahrenError,
  verfahrenRef,
}) => {
  const secondOptions = validSecondOptions[selectedOption1] || [];

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const searchParams = useSearchParams();
  const firstParam = searchParams.get('first');

  useEffect(() => {
    if (firstParam && allOptions.includes(firstParam)) {
      setSelectedOption1(firstParam);
    }
  }, [firstParam, setSelectedOption1]);

  // Click-Outside & ESC nur für die internen Spezifikations-Dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setOpenDropdown(null);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

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
          const selectedValues = Array.isArray(specSelections[selectionKey])
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

          <div className={styles.inputGroup}>
            <select
              value={selectedOption1}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedOption1(value);
                // Verfahren 2 zurücksetzen, wenn Verfahren 1 neu gewählt wird
                setSelectedOption2('');
              }}
              className={
                verfahrenError && !selectedOption1 ? styles.inputError : ''
              }
            >
              <option value="">Bitte wählen</option>
              {allOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {selectedOption1 &&
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

      {/* VERFAHREN 2 (optional) */}
      {selectedOption1 && (
        <div className={styles.dropdownContainer}>
          <label className={styles.labelRow}>Verfahren 2 (optional):</label>

          <div className={styles.inputGroup}>
            <label>Verfahren 2</label>
            <select
              value={selectedOption2}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedOption2(value);
              }}
            >
              <option value="">Bitte wählen</option>
              {secondOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
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
        </div>
      )}
    </section>
  );
};

export default VerfahrenUndLogistik;
