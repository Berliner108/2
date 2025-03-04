"use client";

import { useState } from "react";
import "./angebote.css";
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
    optionE: false,
    optionF: false,
    optionG: false,
    optionH: false,
    optionI: false,
  });

  const options = [
    "Selbstanlieferung", "Abholung gewünscht", "Mein Auftrag ist kein Einzelauftrag", 
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
      <h1>Erhalte in Minuten Top Angebote für deinen Auftrag</h1>
        <div className="dropzone" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={handleClick}>
          Dateien & Fotos zum Auftrag hier reinziehen oder klicken
        </div>
        <label>Welche Arbeiten sollen durchgeführt werden</label>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionA}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionA: !checkboxOptions.optionA })}
            />
            Lackieren
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            Pulverbeschichten
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Verzinken
          </label>  
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionD}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionD: !checkboxOptions.optionD })}
            />
            Eloxieren
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionE}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionE: !checkboxOptions.optionE })}
            />
            Strahlen
          </label>  
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionF}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionF: !checkboxOptions.optionF })}
            />
            Entlacken
          </label>  
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionG}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionG: !checkboxOptions.optionG })}
            />
            Einlagern
          </label>  
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionH}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionH: !checkboxOptions.optionH })}
            />
            Isolierstegverpressen
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionI}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionI: !checkboxOptions.optionI })}
            />
            Folieren
          </label>                
        </div>
        <label><br></br>Logistik für die Warenausgabe:</label>
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
        
        

        <label><br></br>Datum:</label>
        <input
          type="text"
          className="input-title"
          placeholder="Titel eingeben..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label><br></br>Logistik für die Warenannahme:</label>
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
        <label><br></br>Datum:</label>
        <input
          type="text"
          className="input-title"
          placeholder="Titel eingeben..."
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
            Lack wird dem Material beigestellt
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            Duplexbeschichtung (mit Grundierung) gewünscht
          </label>     
        </div>       
        <label><br></br>Genaue Farbtonbezeichnung:</label>
        <input
          type="text"
          className="input-title"
          placeholder="Farbton oder Artikelnummer des Herstellers eingeben..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionA}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionA: !checkboxOptions.optionA })}
            />
            RAL
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            NCS
          </label>  
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            Candy
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            Neon
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            Pantone
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            Sikkens
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            HKS
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            Nach Vorlage
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            Klarlack
          </label>  
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            Sonderfarbe
          </label>  
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            RAL D2-Design
          </label>  
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionB}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionB: !checkboxOptions.optionB })}
            />
            RAL E4-Effekt
          </label>     
        </div><br></br> 
        <label>Oberfläche:</label>
        <select className="select-box" value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option>Glatt</option>
          <option>Feinstruktur</option>
          <option>Grobstruktur</option>          
        </select>

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
        <br></br>
        <label>Gesamte m2 für den Auftrag:</label>
        <input
          type="text"
          className="input-title"
          placeholder="Auf Lager oder Menge eingeben..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label>Zwingende Qualitätsanforderungen an den Beschichter:</label>
        <div className="checkbox-group">
          
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            GSB Zertifizierung
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Qualicoat Zertifizierung
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            ISO:9001 Zertifizierung
          </label>
        </div>
        <br></br>
        <label>Materialgüte der Werkstücke:</label>
        <div className="checkbox-group">
          
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Aluminium
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Aluguss
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Eloxal
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Stahl
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Edelstahl
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Kupfer
          </label>
          <label>
            <input
              type="checkbox"
              checked={checkboxOptions.optionC}
              onChange={() => setCheckboxOptions({ ...checkboxOptions, optionC: !checkboxOptions.optionC })}
            />
            Andere
          </label>
          
        </div>
        
        
        
        <br></br><h2>Detaillierte Verfahrensanweisungen:</h2>

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
          Angebote einholen
        </button>
      </div>
    </>
  );
}
