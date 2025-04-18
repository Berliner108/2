"use client";
import React, { useState } from "react";
import styles from "./angebote.module.css";
import Pager from "./navbar/pager";

const Angebote = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [dropdown1, setDropdown1] = useState("");
  const [dropdown2, setDropdown2] = useState("");
  const [dropdown3, setDropdown3] = useState("");
  const maxFiles = 8;

  // 19 Auswahlmöglichkeiten
  const allOptions = [
    "Nasslackieren",
    "Pulverbeschichten",
    "Verzinken",
    "Eloxieren",
    "Entlacken",
    "Strahlen",
    "Folieren",
    "Einlagern",
    "Isolierstegverpressen",
    "Entzinken",
    "Entzinnen",
    "Entbleien",
    "Entaluminieren",
    "Anodisieren",
    "Verzinnen",
    "Verbleien",
    "Aluminieren",
    "Entanodisieren",
    "Enteloxieren"
  ];

  // Konfiguration der Auswahlmöglichkeiten direkt im Code
  const config = {
    dropdown1: {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen", "Einlagern"],
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen", "Einlagern"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Entlacken": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Entzinken", "Entzinnen", "Entbleien", "Entaluminieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Entzinken", "Entzinnen", "Entbleien", "Entaluminieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren", "Entlacken", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Folieren": ["Isolierstegverpressen", "Einlagern"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Entzinken", "Entzinnen", "Entbleien", "Entaluminieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren", "Entlacken", "Folieren", "Strahlen", "Isolierstegverpressen"],
      "Isolierstegverpressen": ["Folieren", "Einlagern"],
      "Entzinken": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Entzinnen": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Entbleien": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Entaluminieren": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Verbleien": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Isolierstegverpressen"],
      "Enteloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Eloxieren", "Isolierstegverpressen"],
      "Entanodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Einlagern", "Anodisieren", "Isolierstegverpressen"],
    },
    
    dropdown2: {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Entlacken": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Entzinken", "Entzinnen", "Entbleien", "Entaluminieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Entzinken", "Entzinnen", "Entbleien", "Entaluminieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren", "Entlacken", "Folieren", "Isolierstegverpressen"],
      "Folieren": ["Isolierstegverpressen"],
      "Einlagern": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Entzinken", "Entzinnen", "Entbleien", "Entaluminieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren", "Entlacken", "Folieren", "Strahlen", "Isolierstegverpressen"],
      "Isolierstegverpressen": ["Folieren"],
      "Entzinken": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Entzinnen": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Entbleien": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Entaluminieren": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Verbleien": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Enteloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Eloxieren", "Isolierstegverpressen"],
      "Entanodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Anodisieren", "Isolierstegverpressen"],
    },
    dropdown3: {
      "Nasslackieren": ["Folieren", "Isolierstegverpressen"],
      "Pulverbeschichten": ["Folieren", "Isolierstegverpressen"],
      "Verzinken": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Eloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Entlacken": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Entzinken", "Entzinnen", "Entbleien", "Entaluminieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Strahlen": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Entzinken", "Entzinnen", "Entbleien", "Entaluminieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Entanodisieren", "Enteloxieren", "Entlacken", "Folieren", "Isolierstegverpressen"],
      "Folieren": ["Isolierstegverpressen"],      
      "Isolierstegverpressen": ["Folieren"],
      "Entzinken": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Entzinnen": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Entbleien": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Entaluminieren": ["Nasslackieren", "Pulverbeschichten", "Verzinken", "Eloxieren", "Anodisieren", "Verzinnen", "Verbleien", "Aluminieren", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Anodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Verzinnen": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Verbleien": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Aluminieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Isolierstegverpressen"],
      "Enteloxieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Eloxieren", "Isolierstegverpressen"],
      "Entanodisieren": ["Nasslackieren", "Pulverbeschichten", "Strahlen", "Folieren", "Anodisieren", "Isolierstegverpressen"],
    }
  };
   // Typenhilfe für Dropdown-Zugriffe
  type DropdownKey = keyof typeof config.dropdown1;

  // Option anzeigen basierend auf der ersten Auswahl
  const getDropdown2Options = () => {
    if (!dropdown1 || !(dropdown1 in config.dropdown1)) return [];
    return config.dropdown1[dropdown1 as DropdownKey] || [];
  };

  // Option anzeigen basierend auf der zweiten Auswahl
  const getDropdown3Options = () => {
    if (!dropdown2 || !(dropdown2 in config.dropdown2)) return [];
    return config.dropdown2[dropdown2 as keyof typeof config.dropdown2] || [];
  };

  // Funktion für Drag & Drop Dateien
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    if (files.length + dropped.length > maxFiles) return;
    setFiles((prev) => [...prev, ...dropped].slice(0, maxFiles));
  };

  // Funktion zum Hinzufügen von Dateien
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > maxFiles) return;
    setFiles((prev) => [...prev, ...selected].slice(0, maxFiles));
  };

  // Funktion zum Entfernen von Dateien
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

 

  

  // Module anzeigen
  const renderModule = (id: string) => (
    <div key={id} className={styles["modul"]}>
      <h4>Modul für: {id}</h4>
      <p>Details zu dieser Auswahl folgen hier.</p>
    </div>
  );

  return (
    <div>
      <Pager />
      <div className={styles["angebot-container"]}>
        <h2>Dateien hochladen (max. {maxFiles})</h2>

        <div
          className={styles["dropzone-wrapper"]}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            type="file"
            id="fileInput"
            multiple
            onChange={handleFileChange}
            className={styles["file-input"]}
          />
          <div className={styles["dropzone"]}>
            <label htmlFor="fileInput">
              <strong>Dateien hierher ziehen</strong> <br />
              oder klicken zum Hochladen
            </label>
          </div>
        </div>

        {files.length >= maxFiles && (
          <p className={styles["limit-hinweis"]}>
            Maximal {maxFiles} Dateien erlaubt.
          </p>
        )}

        {files.length > 0 && (
          <div className={styles["preview-container"]}>
            <h4>Ausgewählte Dateien:</h4>
            <div className={styles["preview-list"]}>
              {files.map((file, index) => (
                <div key={index} className={styles["preview-item"]}>
                  <p>{file.name}</p>
                  <button onClick={() => removeFile(index)}>Entfernen</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles["dropdowns"]}>
          <label>
            Auswahl 1:
            <select
              value={dropdown1}
              onChange={(e) => {
                setDropdown1(e.target.value);
                setDropdown2(""); // reset
                setDropdown3(""); // reset
              }}
            >
              <option value="">Bitte wählen</option>
              {allOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {dropdown1 && (
            <label>
              Auswahl 2:
              <select
                value={dropdown2}
                onChange={(e) => {
                  setDropdown2(e.target.value);
                  setDropdown3(""); // reset
                }}
              >
                <option value="">Bitte wählen</option>
                {getDropdown2Options().map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}

          {dropdown2 && (
            <label>
              Auswahl 3:
              <select
                value={dropdown3}
                onChange={(e) => setDropdown3(e.target.value)}
              >
                <option value="">Bitte wählen</option>
                {getDropdown3Options().map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className={styles["module-container"]}>
          {[dropdown1, dropdown2, dropdown3]
            .filter(Boolean)
            .map((value) => renderModule(value))}
        </div>

        <button className={styles["submit-button"]}>Artikel einstellen</button>
      </div>
    </div>
  );
};

export default Angebote;
