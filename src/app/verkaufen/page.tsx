"use client";

import { useState } from "react";
import "./verkaufsseite.css";
import Pager from "./navbar/pager"; // Pager importieren

export default function Verkaufsseite() {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("Elektronik");
  const [condition, setCondition] = useState("Neu");
  const [description, setDescription] = useState("");
  const [originalPackaging, setOriginalPackaging] = useState(false);
  const [warranty, setWarranty] = useState(false);
  const [title, setTitle] = useState(""); // Für den Titel des Produkts

  // Handle the drop event
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    setFiles(droppedFiles);
  };

  // Handle file click event
  const handleClick = () => {
    document.getElementById("fileInput")?.click();
  };

  // Handle file selection via input
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files ? Array.from(event.target.files) : [];
    setFiles(selectedFiles);
  };

  // Handle form submission
  const handleSubmit = () => {
    alert("Produkt eingestellt!");
  };

  // Button aktivieren/deaktivieren, wenn keine Dateien vorhanden sind
  const isButtonDisabled = files.length === 0;

  return (
    <>
      <Pager /> {/* Pager-Komponente wird hier oberhalb von "container" gerendert */}
      
      <div className="container">
        <h2>Produkt verkaufen</h2>

        

        <label>Kategorie wählen:</label>
        <select
          className="select-box"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>Elektronik</option>
          <option>Kleidung</option>
          <option>Möbel</option>
        </select>

        {/* Dropzone für das Ablegen von Dateien */}
        <div
          className="dropzone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={handleClick}
        >
          Datei hier ablegen oder klicken
        </div>
        <label>Titel des Produkts:</label>
        <input
          type="text"
          className="input-title"
          placeholder="Gib einen Titel ein"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Hidden File Input */}
        <input
          id="fileInput"
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        <label>
          <input
            type="checkbox"
            checked={originalPackaging}
            onChange={() => setOriginalPackaging(!originalPackaging)}
          />{" "}
          Originalverpackung
        </label>
        <label>
          <input
            type="checkbox"
            checked={warranty}
            onChange={() => setWarranty(!warranty)}
          />{" "}
          Garantie vorhanden
        </label>

        <label>Zustand:</label>
        <select
          className="select-box"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        >
          <option>Neu</option>
          <option>Gebraucht - wie neu</option>
          <option>Gebraucht - gut</option>
          <option>Gebraucht - akzeptabel</option>
        </select>

        <textarea
          className="textarea"
          placeholder="Beschreibe dein Produkt..."
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>

        <button
          className="button-primary"
          onClick={handleSubmit}
          disabled={isButtonDisabled} // Button wird deaktiviert, wenn keine Dateien vorhanden sind
        >
          Verkaufen
        </button>
      </div>
    </>
  );
}
