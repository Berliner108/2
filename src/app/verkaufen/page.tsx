"use client";

import { useState } from "react";
import "./verkaufsseite.css";
import Pager from "./navbar/pager";

export default function Verkaufsseite() {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("Elektronik");
  const [condition, setCondition] = useState("Neu");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState(""); // Einzeiliges Textfeld für den Titel
  const [selectedOption, setSelectedOption] = useState<string>("");

  const [checkboxOptions, setCheckboxOptions] = useState({
    optionA: false,
    optionB: false,
    optionC: false,
    optionD: false,
  });

  const options = [
    "RAL", "NCS", "Candy", "Neon", "Pantone",
    "Sikkens", "HKS", "Klarlack", "RAL D2-Design", "RAL E4-Effekt"
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
        <div className="dropzone" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={handleClick}>
          Dateien & Fotos hier reinziehen oder klicken
        </div>
        

        <label>Titel des Produkts:</label>
        <input
          type="text"
          className="input-title"
          placeholder="Titel eingeben..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label>Kategorie wählen:</label>
        <select className="select-box" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>Nasslack</option>
          <option>Pulverlack</option>
          <option>Arbeitsmittel</option>
        </select>
        <label>Marke:</label>
        <input
          type="text"
          className="input-title"
          placeholder="Hersteller eingeben..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

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
        <br></br>
        
        <label>Oberfläche:</label>
        <select className="select-box" value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option>Glatt</option>
          <option>Feinstruktur</option>
          <option>Grobstruktur</option>          
        </select>
        <label>Glanzgrad:</label>
        <select className="select-box" value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option>Hochglanz</option>          
          <option>Seidenglanz</option>
          <option>Glanz</option>
          <option>Matt</option> 
          <option>Seidenmatt</option> 
          <option>Stumpfmatt</option>                   
        </select>
        <label>Effekt:</label>
        <select className="select-box" value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option>Ohne Sondereffekt</option> 
          <option>Metallic</option>          
          <option>Fluoreszierend</option>                            
        </select>
        <label>Qualität:</label>
        <select className="select-box" value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option>Polyester</option> 
          <option>Epoxy-Polyester</option>          
          <option>Polyester für Feuerverzinkung</option>                            
        </select>
        
        <label>Weitere Optionen (Mehrfachauswahl möglich):</label>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionA}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionA: !checkboxOptions.optionA })}
            />
            GSB Zulassung
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            Qualicoat Zulassung
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Innenqualität
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Aussenqualität
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Industrie
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            DB-Zulassung
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Hochwetterfest
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Ultra-Hochwetterfest
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Niedrigtemperaturpulver
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Hochtemperaturpulver
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Anti-Ausgasung
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Kratzresistent
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Elektrisch ableitfähig
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Anti-Rutsch
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Anti-Quietsch
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Anti-Grafitti
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Chemiebeständig
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Solar
          </label>
        </div>
        <label><br></br>Artikelzustand:</label>
        <select className="select-box" value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option>Neu und ungeöffnet</option> 
          <option>Angebraucht und einwandfrei</option>                                     
        </select>
        <label>Menge [kg]:</label>
        <input
          type="text"
          className="input-title"
          placeholder="Auf Lager oder Menge eingeben..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label>Preis (auch gestaffelt angeben):</label>
        <input
          type="text"
          className="input-title"
          placeholder="Pro angegebener Mengeneinheit..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label>Mindestabnahmemenge (optional):</label>
        <input
          type="text"
          className="input-title"
          placeholder="für den Versand..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label>Weitere Optionen (Mehrfachauswahl möglich):</label>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionA}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionA: !checkboxOptions.optionA })}
            />
            Versand
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            Abholung
          </label>          
        </div>
        <label><br></br>Bearbeitungszeit für den Versand:</label>
        <select className="select-box" value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option>Gleicher Werktag</option> 
          <option>1 Werktag</option> 
          <option>2 Werktage</option>  
          <option>3 Werktage</option>  
                                               
        </select>
        <label>Versandkosten:</label>
        <input
          type="text"
          className="input-title"
          placeholder="Pro angegebener Mengeneinheit..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <br></br><h2>Artikelbeschreibung:</h2>

        <textarea className="textarea" placeholder="Beschreibe dein Produkt..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)}></textarea>

        
        <label>Angebot bewerben und erfolgreicher verkaufen</label>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionA}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionA: !checkboxOptions.optionA })}
            />
            Anzeige hochschieben [2,49€]
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            Anzeige färben [3,95€]
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Wiederholtes Hochschieben [16,95€]
          </label>  
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionD}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionD: !checkboxOptions.optionD })}
            />
            Top Anzeige [34,95€]
          </label>            
        </div>
        <br></br>
        <button className="button-primary" onClick={handleSubmit} disabled={isButtonDisabled}>
          Verkaufen
        </button>
      </div>
    </>
  );
}
