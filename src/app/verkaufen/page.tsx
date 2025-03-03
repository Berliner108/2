"use client";

import { useState } from "react";
import "./verkaufsseite.css";
import Pager from "./navbar/pager"; // Pager importieren

export default function Verkaufsseite() {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("Elektronik");
  const [condition, setCondition] = useState("Neu");
  const [description, setDescription] = useState("");
  const [selectedOption, setSelectedOption] = useState<string>("");

  const options = [
    "RAL", "NCS", "Candy", "Neon", "Pantone",
    "Sikkens", "HKS", "Klarlack", "RAL D2-Design", "RAL E4-Efffekt"
  ];

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);
  };

  const handleClick = () => {
    document.getElementById("fileInput")?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files ? Array.from(event.target.files) : [];
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
  };

  const handleDeleteFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
  };

  const handleSubmit = () => {
    alert("Produkt eingestellt!");
  };

  const isButtonDisabled = files.length === 0;

  return (
    <>
      <Pager />

      <div className="container">
        <h1>Angebot fertigstellen</h1>

        <label>Kategorie wählen:</label>
        <select className="select-box" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>Elektronik</option>
          <option>Kleidung</option>
          <option>Möbel</option>
        </select>

        <div className="dropzone" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={handleClick}>
          Datei hier ablegen oder klicken
        </div>

        <input id="fileInput" type="file" multiple style={{ display: "none" }} onChange={handleFileSelect} />

        <div className="file-preview">
          {files.length > 0 && (
            <ul>
              {files.map((file, index) => (
                <li key={index} className="file-item">
                  <span>{file.name}</span>
                  {file.type.startsWith("image/") && (
                    <img src={URL.createObjectURL(file)} alt={file.name} width={100} height={100} />
                  )}
                  <button className="delete-button" onClick={() => handleDeleteFile(index)}>Entfernen</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label>Zustand:</label>
        <select className="select-box" value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option>Neu</option>
          <option>Gebraucht - wie neu</option>
          <option>Gebraucht - gut</option>
          <option>Gebraucht - akzeptabel</option>
        </select>

        <label>Wähle eine Option:</label>
        <div className="radio-group">
          {options.map((option, index) => (
            <label key={index}>
              <input
                type="radio"
                name="radioOptions"
                value={option}
                checked={selectedOption === option}
                onChange={() => setSelectedOption(option)}
              />
              {option}
            </label>
          ))}
        </div>
        <h3>Beschreibung:</h3>

        <textarea className="textarea" placeholder="Beschreibe dein Produkt..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)}></textarea>

        <button className="button-primary" onClick={handleSubmit} disabled={isButtonDisabled}>
          Verkaufen
        </button>
      </div>
    </>
  );
}
