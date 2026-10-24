'use client';
import React, { useState, useRef, useEffect } from 'react';
import styles from './VerfahrenUndLogistik.module.css';
import { HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
export interface Specification {
  type: 'checkbox' | 'text' | 'radio' | 'group' | 'title' | 'dropdown' | 'note';
  label: string;
  name: string;
  options?: string[];
  position?: 'left' | 'top';
  tooltip?: string;
  maxLength?: number;     // 👈 NEU
  showCounter?: boolean;  // 👈 NEU
  required?: boolean;
  dependsOn?: {
    name: string;
    value: string;
  };
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
  requiredErrors: Record<string, boolean>;
  clearRequiredError: (selectionKey: string) => void;
}
const allOptions = [
  'Nasslackieren',
  'Pulverbeschichten',
  'Verzinken',
  'Eloxieren',
  'Anodisieren',
  'KTL-Beschichten',
  'Zinkphosphatieren',
  'Mn-Phosphatieren',
  'Eisenphosphatieren',
  'Beizen',
  'Entgraten',
  'Verrunden',
  'Glätten',
  'Mattieren',
  'Schleifen',
  'Polieren',
  'Bürsten',
  'Trowalisieren',
  'Chemisches Glänzen',
  'Strahlen',
  'Entlacken',
  'Brünieren',
  'Verzinnen',
  'Aluminieren',
  'Vernickeln',
  'Aluminium-Passivieren',
  'Edelstahl-Passivieren',
  'Elektropolieren',
  'Verchromen',
  'Vermessingen',
  'Verkupfern',
  'Bronzebeschichten',
  'Vergolden',
  'Versilbern',
  'Folieren',
  'Isolierstegverpressen',
  'Einlagern',
  'Entzinken',
  'Enteloxieren',
  'Entanodisieren',
  'Entzinnen',
  'Entaluminieren',
  'Entnickeln',
  'Entchromen',
  'Entkupfern',
  'Entmessingen',
  'Entbronzieren',
  'Entgolden',
  'Entsilbern',
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
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
  ],
  Eloxieren: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
  ],
  'KTL-Beschichten': [
    'Nasslackieren',
    'Pulverbeschichten',
    'Einlagern',
  ],
  Zinkphosphatieren: [
    'KTL-Beschichten',
    'Nasslackieren',
    'Pulverbeschichten',
    'Einlagern',
  ],
  'Mn-Phosphatieren': [
    'Nasslackieren',
    'Pulverbeschichten',
    'Einlagern',
  ],
  Beizen: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Zinkphosphatieren',
    'Mn-Phosphatieren',
    'Eloxieren',
    'KTL-Beschichten',
    'Aluminium-Passivieren',
    'Vernickeln',
    'Verchromen',
    'Verkupfern',
    'Verzinnen',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Elektropolieren',
    'Folieren',
    'Einlagern',
  ],
  Entgraten: [
    'Verrunden',
    'Glätten',
    'Mattieren',
    'Schleifen',
    'Polieren',
    'Bürsten',
    'Trowalisieren',
    'Strahlen',
    'Beizen',
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Zinkphosphatieren',
    'Mn-Phosphatieren',
    'Eloxieren',
    'KTL-Beschichten',
    'Aluminium-Passivieren',
    'Vernickeln',
    'Verchromen',
    'Verkupfern',
    'Verzinnen',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Folieren',
    'Einlagern',
  ],
  Verrunden: [
    'Glätten',
    'Mattieren',
    'Schleifen',
    'Polieren',
    'Bürsten',
    'Trowalisieren',
    'Strahlen',
    'Beizen',
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Zinkphosphatieren',
    'Mn-Phosphatieren',
    'Eloxieren',
    'KTL-Beschichten',
    'Aluminium-Passivieren',
    'Vernickeln',
    'Verchromen',
    'Verkupfern',
    'Verzinnen',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Folieren',
    'Einlagern',
  ],
  Glätten: [
    'Mattieren',
    'Schleifen',
    'Polieren',
    'Bürsten',
    'Beizen',
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Zinkphosphatieren',
    'Mn-Phosphatieren',
    'Eloxieren',
    'KTL-Beschichten',
    'Aluminium-Passivieren',
    'Vernickeln',
    'Verchromen',
    'Verkupfern',
    'Verzinnen',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Folieren',
    'Einlagern',
  ],
  Mattieren: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Eloxieren',
    'Aluminium-Passivieren',
    'Vernickeln',
    'Verchromen',
    'Verkupfern',
    'Verzinnen',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Folieren',
    'Einlagern',
  ],
  Schleifen: [
    'Polieren',
    'Bürsten',
    'Mattieren',
    'Strahlen',
    'Beizen',
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Zinkphosphatieren',
    'Mn-Phosphatieren',
    'Eloxieren',
    'KTL-Beschichten',
    'Aluminium-Passivieren',
    'Vernickeln',
    'Verchromen',
    'Verkupfern',
    'Verzinnen',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Folieren',
    'Einlagern',
  ],
  Polieren: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Eloxieren',
    'Aluminium-Passivieren',
    'Vernickeln',
    'Verchromen',
    'Verkupfern',
    'Verzinnen',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Folieren',
    'Einlagern',
  ],
  Bürsten: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Eloxieren',
    'Aluminium-Passivieren',
    'Vernickeln',
    'Verchromen',
    'Verkupfern',
    'Verzinnen',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Folieren',
    'Einlagern',
  ],
  Trowalisieren: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Zinkphosphatieren',
    'Mn-Phosphatieren',
    'Eloxieren',
    'KTL-Beschichten',
    'Aluminium-Passivieren',
    'Vernickeln',
    'Verchromen',
    'Verkupfern',
    'Verzinnen',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Folieren',
    'Einlagern',
  ],
  'Chemisches Glänzen': [
    'Eloxieren',
    'Aluminium-Passivieren',
    'Folieren',
    'Einlagern',
  ],
  Entlacken: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Zinkphosphatieren',
    'Mn-Phosphatieren',
    'KTL-Beschichten',
    'Eloxieren',
    'Aluminium-Passivieren',
    'Elektropolieren',
    'Vernickeln',
    'Verchromen',
    'Vermessingen',
    'Verkupfern',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Strahlen',
    'Beizen',
    'Entgraten',
    'Verrunden',
    'Glätten',
    'Mattieren',
    'Schleifen',
    'Polieren',
    'Bürsten',
    'Trowalisieren',
    'Chemisches Glänzen',
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
  Brünieren: [
    'Folieren',
    'Einlagern',
  ],
  Strahlen: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Zinkphosphatieren',
    'Mn-Phosphatieren',
    'KTL-Beschichten',
    'Eloxieren',
    'Aluminium-Passivieren',
    'Vernickeln',
    'Verchromen',
    'Vermessingen',
    'Verkupfern',
    'Verzinnen',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Beizen',
    'Entgraten',
    'Verrunden',
    'Glätten',
    'Mattieren',
    'Schleifen',
    'Polieren',
    'Bürsten',
    'Trowalisieren',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
    'Anodisieren',
    'Aluminieren',
  ],
  Folieren: ['Isolierstegverpressen', 'Einlagern'],
  Isolierstegverpressen: ['Einlagern'],
  Einlagern: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Verzinken',
    'Mn-Phosphatieren',
    'Eloxieren',
    'Aluminium-Passivieren',
    'Elektropolieren',
    'Strahlen',
    'Entlacken',
    'Folieren',
    'Vernickeln',
    'Verchromen',
    'Vermessingen',
    'Verkupfern',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
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
    'Vernickeln',
    'Verchromen',
    'Vermessingen',
    'Verkupfern',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
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
    'Vernickeln',
    'Verchromen',
    'Vermessingen',
    'Verkupfern',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Folieren',
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
    'Verchromen',
    'Vermessingen',
    'Verkupfern',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
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
    'Verchromen',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Nasslackieren',
    'Pulverbeschichten',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
  ],
  Verchromen: [
    'Folieren',
    'Einlagern',
  ],
  Vermessingen: [
    'Folieren',
    'Einlagern',
  ],
  Verkupfern: [
    'Vernickeln',
    'Verchromen',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Folieren',
    'Einlagern',
  ],
  Bronzebeschichten: [
    'Vergolden',
    'Versilbern',
    'Folieren',
    'Einlagern',
  ],
  Vergolden: [
    'Folieren',
    'Einlagern',
  ],
  Versilbern: [
    'Folieren',
    'Einlagern',
  ],
  'Aluminium-Passivieren': [
    'Nasslackieren',
    'Pulverbeschichten',
    'Folieren',
    'Einlagern',
  ],
  Elektropolieren: [
    'Folieren',
    'Einlagern',
  ],
  Aluminieren: [
    'Nasslackieren',
    'Pulverbeschichten',
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
    'Verchromen',
    'Vermessingen',
    'Verkupfern',
    'Bronzebeschichten',
    'Vergolden',
    'Versilbern',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
    'Verzinnen',
    'Aluminieren',
  ],
  Enteloxieren: [
    'Nasslackieren',
    'Pulverbeschichten',
    'Eloxieren',
    'Aluminium-Passivieren',
    'Strahlen',
    'Folieren',
    'Einlagern',
    'Isolierstegverpressen',
  ],
};
// 🔹 Hilfsfunktion für eindeutige Keys
const makeSelectionKey = (
  blockPrefix: string,      // "v1" oder "v2"
  verfahrenName: string,    // z.B. "Pulverbeschichten"
  fieldName: string,        // z.B. "zertifizierungen"
) => `${blockPrefix}__${verfahrenName}__${fieldName}`;
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
  requiredErrors,
  clearRequiredError,
}) => {
  const secondOptions = validSecondOptions[selectedOption1] || [];
  const searchParams = useSearchParams();

  const firstParam = searchParams.get('first');
  useEffect(() => {
    if (firstParam && allOptions.includes(firstParam)) {
      setSelectedOption1(firstParam);
    }
  }, [firstParam, setSelectedOption1]);
  // 🔹 Spezifikationen rendern, jetzt mit Prefix + Verfahren
  const renderSpecs = (
    specs: Specification[],
    blockPrefix: string,   // "v1" oder "v2"
    verfahrenName: string, // z.B. "Pulverbeschichten"
  ) =>
    specs
      .filter((spec) => spec.type !== 'checkbox')
      .filter((spec) => {
        if (!spec.dependsOn) return true;
        const dependencyKey = makeSelectionKey(
          blockPrefix,
          verfahrenName,
          spec.dependsOn.name,
        );
        return specSelections[dependencyKey] === spec.dependsOn.value;
      })
      .map((spec, index) => {
        const selectionKey = makeSelectionKey(
          blockPrefix,
          verfahrenName,
          spec.name,
        );
               if (spec.type === 'text') {
          const maxLen = spec.maxLength ?? 255;
          const value = (specSelections[selectionKey] as string) || '';
          return (
            <div
              key={selectionKey}
              className={styles.inputRow}
              data-spec-key={selectionKey}
            >
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
                className={`${styles.inputField2} ${
                  requiredErrors[selectionKey] ? styles.inputError : ''
                }`}
                value={value}
                maxLength={maxLen} // 👈 Begrenzung greift hier
                aria-invalid={requiredErrors[selectionKey] || undefined}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  if (nextValue.trim()) clearRequiredError(selectionKey);
                  setSpecSelections((prev) => {
                    const next = { ...prev };
                    if (nextValue.trim()) {
                      next[selectionKey] = nextValue;
                    } else {
                      delete next[selectionKey];
                    }
                    return next;
                  });
                }}
              />
              {requiredErrors[selectionKey] && (
                <p className={styles.feldFehlerText}>
                  Bitte fülle dieses Pflichtfeld aus.
                </p>
              )}
              {spec.showCounter && (
                <div className={styles.charCounter}>
                  {value.length}/{maxLen}
                </div>
              )}
            </div>
          );
        }
        if (spec.type === 'dropdown') {
          const currentValue = (specSelections[selectionKey] as string) || '';
          return (
            <div
              key={selectionKey}
              className={styles.inputRow}
              data-spec-key={selectionKey}
            >
              <label>
                {spec.label}
                {spec.required && <span className={styles.requiredStar}>*</span>}
              </label>
              <select
                className={`${styles.inputField2} ${
                  requiredErrors[selectionKey] ? styles.inputError : ''
                }`}
                value={currentValue}
                aria-invalid={requiredErrors[selectionKey] || undefined}
                onChange={(e) => {
                  const nextValue = e.target.value;

                  if (nextValue.trim()) {
                    clearRequiredError(selectionKey);
                  }

                  setSpecSelections((prev) => {
                    const next = { ...prev };
                    if (nextValue.trim()) {
                      next[selectionKey] = nextValue;
                    } else {
                      delete next[selectionKey];
                    }
                    return next;
                  });
                }}
              >
                <option value="">Bitte wählen</option>
                {spec.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              {requiredErrors[selectionKey] && (
                <p className={styles.feldFehlerText}>
                  Bitte wähle eine Option aus.
                </p>
              )}
            </div>
          );
        }
        if (spec.type === 'radio') {
          return (
            <div
              key={selectionKey}
              className={styles.radioGroup}
              data-spec-key={selectionKey}
            >
              <div className={styles.radioLabel}>
                {spec.label}
                {spec.required && <span className={styles.requiredStar}>*</span>}
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
                {spec.options?.map((opt, i) => {
                  const id = `${selectionKey}__${i}`;
                  return (
                    <label key={id} className={styles.radioItem} htmlFor={id}>
                      <input
                        id={id}
                        type="radio"
                        name={selectionKey} // 🔹 wichtig: Name = selectionKey → pro Verfahren getrennt
                        value={opt}
                        checked={specSelections[selectionKey] === opt}
                        aria-invalid={requiredErrors[selectionKey] || undefined}
                        onChange={() => {
                          clearRequiredError(selectionKey);
                          setSpecSelections((prev) => {
                            const next = { ...prev };
                            if (String(opt ?? '').trim()) {
                              next[selectionKey] = opt;
                            } else {
                              delete next[selectionKey];
                            }
                            // Abhängige Felder löschen, sobald ihre Bedingung
                            // durch die neue Auswahl nicht mehr erfüllt ist.
                            specs.forEach((dependentSpec) => {
                              if (
                                dependentSpec.dependsOn?.name === spec.name &&
                                dependentSpec.dependsOn.value !== opt
                              ) {
                                delete next[
                                  makeSelectionKey(
                                    blockPrefix,
                                    verfahrenName,
                                    dependentSpec.name,
                                  )
                                ];
                              }
                            });
                            return next;
                          });
                        }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
              {requiredErrors[selectionKey] && (
                <p className={styles.feldFehlerText}>
                  Bitte wähle eine Option aus.
                </p>
              )}
            </div>
          );
        }
        if (spec.type === 'group') {
          const selectedValues = Array.isArray(specSelections[selectionKey])
            ? (specSelections[selectionKey] as string[])
            : [];
          return (
            <div key={selectionKey} className={styles.checkboxGroup}>
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
                {spec.options?.map((opt, i) => {
                  const id = `${selectionKey}__${i}`;
                  const checked = selectedValues.includes(opt);
                  return (
                    <label
                      key={id}
                      className={styles.checkboxRow}
                      htmlFor={id}
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...selectedValues, opt]
                            : selectedValues.filter(
                                (val: string) => val !== opt,
                              );
                          setSpecSelections((prev) => {
                            const next = { ...prev };
                            if (updated.length > 0) {
                              next[selectionKey] = updated;
                            } else {
                              delete next[selectionKey];
                            }
                            return next;
                          });
                        }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        }
        if (spec.type === 'title') {
          return (
            <h5 key={selectionKey} className={styles.sectionTitle}>
              {spec.label}
            </h5>
          );
        }

        if (spec.type === 'note') {
          return (
            <div key={selectionKey} className={styles.inputRow}>
              <p className={styles.groupLabel}>
                <strong>Hinweis:</strong> {spec.label}
              </p>
            </div>
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
  <span>
    Verfahren 1:
    <span className={styles.requiredStar}>*</span>
  </span>
  <span className={styles.verfahrenTooltipIcon}>
    <HelpCircle size={18} />
    <span className={styles.verfahrenTooltipText}>
      Wähle das Hauptverfahren, mit dem dein Auftrag beginnt.
      Übersicht und weitere Infos zu den Verfahren findest du{' '}
      <Link href="/wissenswertes#Verfahren" className={styles.tooltipLink}>
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
                setSelectedOption2('');
              }}
              className={`${styles.verfahrenSelect} ${
                verfahrenError && !selectedOption1 ? styles.inputError : ''
              }`}
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
                <h4 className={styles.specTitle}>Spezifikationen Stufe 1:</h4>
                {renderSpecs(
                  specificationsMap[selectedOption1],
                  'v1',              // 🔹 Prefix für Verfahren 1
                  selectedOption1,   // 🔹 Name des Verfahrens
                )}
              </div>
            )}
        </div>
      </div>
      {/* VERFAHREN 2 (optional) */}
      {selectedOption1 && secondOptions.length > 0 && (
        <div className={styles.dropdownContainer}>
          <div className={styles.inputGroup}>
            <label>Verfahren 2:</label>
            <select
              value={selectedOption2}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedOption2(value);
              }}
              className={styles.verfahrenSelect}
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
                <h4 className={styles.specTitle}>Spezifikationen Stufe 2:</h4>
                {renderSpecs(
                  specificationsMap[selectedOption2],
                  'v2',              // 🔹 Prefix für Verfahren 2
                  selectedOption2,   // 🔹 Name des Verfahrens
                )}
              </div>
            )}
        </div>
      )}
    </section>
  );
};
export default VerfahrenUndLogistik;
