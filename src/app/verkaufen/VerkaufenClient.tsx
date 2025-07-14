"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Pager from "./navbar/pager";
import "./verkaufsseite.css";
import { buildVerkaufsdaten } from "@/utils/formData";
import { motion } from "framer-motion";
import { FaPaintRoller, FaSprayCan, FaToolbox } from "react-icons/fa";

const farbsysteme = [
  "RAL", "NCS", "Candy", "Neon", "Pantone",
  "Sikkens", "HKS", "Klarlack", "RAL D2-Design", "RAL E4-Effekt"
];


export default function Verkaufsseite() {
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState(1);
  
  const maxStep = 6;
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [surface, setSurface] = useState("");
  const [gloss, setGloss] = useState("");
  const [effect, setEffect] = useState("");
  const [quality, setQuality] = useState("");
  const [itemCondition, setItemCondition] = useState("");
  const [shippingTime, setShippingTime] = useState("");
  const [showPreview, setShowPreview] = useState(true); 

  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [shippingCost, setShippingCost] = useState("");

  const [description, setDescription] = useState("");
  const [selectedColorSystem, setSelectedColorSystem] = useState("");

  const [checkboxOptions, setCheckboxOptions] = useState<Record<string, boolean>>({
    gsb: false,
    qualicoat: false,
    innen: false,
    aussen: false,
    industrie: false,
    dbZulassung: false,
    hww: false,
    uhww: false,
    niedertemp: false,
    hocht: false,
    antiAusgasung: false,
    kratzresistent: false,
    elektrisch: false,
    antirutsch: false,
    quietsch: false,
    graffiti: false,
    chemie: false,
    solar: false,
    versand: false,
    abholung: false,
    hochschieben: false,
    faerben: false,
    wiederhoch: false,
    top: false,
  });
  const [uploadProgress, setUploadProgress] = useState(0);


  useEffect(() => {
    const selected = searchParams.get("kategorie");
    if (selected === "Nasslack") {
      setCategory("Nasslack");
      setQuality("Polyester");
      setSurface("Glatt");
      setGloss("Seidenglanz");
    } else if (selected === "Pulverlack") {
      setCategory("Pulverlack");
      setQuality("Epoxy-Polyester");
      setSurface("Feinstruktur");
      setGloss("Matt");
    } else if (selected === "Arbeitsmittel") {
      setCategory("Arbeitsmittel");
      setQuality("");
      setSurface("");
      setGloss("");
    }
  }, [searchParams]);
  const handleClearFiles = () => {
  setFiles([]);
  setUploadProgress(0); // optional: falls du Fortschritt anzeigen lässt
};
  const handleClick = () => {
    document.getElementById("fileInput")?.click();
  };
  const MAX_FILE_SIZE_MB = 5;
const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  const droppedFiles = Array.from(e.dataTransfer.files);
  validateAndAddFiles(droppedFiles);
};
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
  validateAndAddFiles(selectedFiles);
};
const validateAndAddFiles = (selectedFiles: File[]) => {
  const validFiles: File[] = [];
  for (const file of selectedFiles) {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`${file.name} ist größer als ${MAX_FILE_SIZE_MB} MB.`);
      continue;
    }
    validFiles.push(file);
  }

  if (files.length + validFiles.length > 8) {
    alert("Maximal 8 Dateien erlaubt.");
    return;
  }

  setFiles(prev => [...prev, ...validFiles]);
};


  const handleDeleteFile = (index: number) => {
  setFiles(prev => {
    const updated = prev.filter((_, i) => i !== index);
    if (updated.length === 0) setUploadProgress(0); // Fortschritt zurücksetzen
    return updated;
  });
};

  const handleCheckboxToggle = (key: string) => {
    setCheckboxOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = () => {
  const newErrors: Record<string, boolean> = {};
  if (!title.trim()) newErrors.title = true;
  if (!category) newErrors.category = true;
  if (!price) newErrors.price = true;
  if (!amount) newErrors.amount = true;

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  setErrors({}); // Fehlerzustand zurücksetzen

    const daten = buildVerkaufsdaten({
      title,
      brand,
      category,
      surface,
      gloss,
      effect,
      quality,
      itemCondition,
      shippingTime,
      amount,
      price,
      minAmount,
      shippingCost,
      description,
      selectedColorSystem,
      checkboxOptions
    });

    console.log("Formulardaten:", daten);
    alert("Produkt erfolgreich eingestellt!");
  };
  const calculateProgress = () => {
  const fields = [
    title, brand, category, selectedColorSystem, surface, gloss, effect, quality,
    itemCondition, shippingTime, amount, price, minAmount, shippingCost, description
  ];
  const filled = fields.filter(f => f && f.trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
};
const simulateUploadProgress = () => {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    setUploadProgress(progress);
    if (progress >= 100) clearInterval(interval);
  }, 100);
};



  return (
    <>
      <Pager />
      <div className="container">
        <h1>Angebot fertigstellen</h1>
        <div className="progress-container-fixed">
  <div
    className="progress-bar-fixed"
    style={{ width: `${calculateProgress()}%` }}
  >
    {calculateProgress()}%
  </div>
</div>

        
  {showPreview && (
  <div className="preview-box-enhanced">
    <button className="preview-close-button" onClick={() => setShowPreview(false)}>×</button>
    <h3>Live-Vorschau</h3>

    <div className="preview-content">
      <div className="preview-column">
        {title && <p><strong>{title}</strong></p>}
        {(brand || category) && <p>{brand} {brand && category && "–"} {category}</p>}
        {(selectedColorSystem || surface || gloss || effect || quality) && (
          <p>{[selectedColorSystem, surface, gloss, effect, quality].filter(Boolean).join(", ")}</p>
        )}
        {(amount || price || minAmount) && (
          <p>
            {amount && `${amount} kg`}
            {amount && price && " | "}
            {price && `${price} €`}
            {minAmount && ` | Mindestabnahme: ${minAmount} kg`}
          </p>
        )}
        {(itemCondition || shippingTime || shippingCost) && (
          <p>
            {itemCondition && `Zustand: ${itemCondition}`}
            {(itemCondition && shippingTime) && " | "}
            {shippingTime && `Versand: ${shippingTime}`}
            {(shippingTime && shippingCost) && ", "}
            {shippingCost && `${shippingCost} €`}
          </p>
        )}
        {description && <p>{description}</p>}
      </div>

      <div className="preview-column preview-images">
        <div className="preview-image-row">
        {files.map((file, index) =>
          file.type.startsWith("image/") ? (
            <img
              key={index}
              src={URL.createObjectURL(file)}
              alt={`Bild ${index + 1}`}
            />
          ) : null
        )}
      </div>
      </div>
    </div>
  </div>
)}


{!showPreview && (
  <button className="toggle-preview-button" onClick={() => setShowPreview(true)}>
    Vorschau anzeigen
  </button>
)}








    <p className="upload-hint">
  Erlaubt sind alle gängigen Dateitypen bis max. 5 MB. Maximal 8 Dateien insgesamt.
</p>

<div
  className="dropzone"
  onDrop={handleDrop}
  onDragOver={(e) => e.preventDefault()}
  onClick={handleClick}
>
  <p>Dateien & Fotos hier reinziehen oder klicken (max. 8)</p>
  <input
    id="fileInput"
    type="file"
    multiple
    hidden
    onChange={handleFileSelect}
  />
</div>

<div className="file-preview">
  {files.map((file, index) => (
    <div key={index} className="file-item">
      <span>{file.name}</span>
      {file.type.startsWith("image/") && (
        <img
          src={URL.createObjectURL(file)}
          alt={file.name}
          width={100}
          height={100}
        />
      )}
      <button className="delete-button" onClick={() => handleDeleteFile(index)}>
        Entfernen
      </button>
    </div>
  ))}

  {files.length > 0 && (
    <button
      onClick={handleClearFiles}
      className="button-secondary"
      style={{ marginTop: "1rem" }}
    >
      Alle Dateien löschen
    </button>
  )}
</div>



    {step >= 1 && (
  <div className="form-section">
    <h2>1. Allgemeine Angaben</h2>

    <label>Titel des Produkts:</label>
    <input
      value={title}
      onChange={(e) => {
        if (e.target.value.length <= 100) {
          setTitle(e.target.value);
          if (e.target.value.trim()) {
            setErrors(prev => ({ ...prev, title: false }));
            if (step === 1) setStep(2); // Weiter zu Schritt 2
          }
        }
      }}
      onBlur={() => {
        if (!title.trim()) {
          setErrors(prev => ({ ...prev, title: true }));
        }
      }}
      placeholder="Titel eingeben... (max. 100 Zeichen)"
      className={`input-title ${errors.title ? "input-error" : ""}`}
    />
    {errors.title && <div className="form-error">Titel ist erforderlich</div>}
  </div>
)}




        {step >= 2 && (
  <div className="form-section">
    <h2>2. Kategorie & Hersteller</h2>

    <label htmlFor="brand">Hersteller:</label>
    <input
      id="brand"
      value={brand}
      onChange={(e) => setBrand(e.target.value)}
      placeholder="Marke..."
      className="input-title"
    />

    <label>Kategorie wählen:</label>
    <div className={`icon-category-group ${errors.category ? "input-error" : ""}`}>
      <button
        type="button"
        className={`icon-category-button ${category === "Nasslack" ? "active" : ""}`}
        onClick={() => {
          setCategory("Nasslack");
          setErrors(prev => ({ ...prev, category: false }));
          if (step === 2) setStep(3); // Weiter zu Schritt 3
        }}
      >
        <FaSprayCan size={24} />
        <span>Nasslack</span>
      </button>

      <button
        type="button"
        className={`icon-category-button ${category === "Pulverlack" ? "active" : ""}`}
        onClick={() => {
          setCategory("Pulverlack");
          setErrors(prev => ({ ...prev, category: false }));
          if (step === 2) setStep(3);
        }}
      >
        <FaPaintRoller size={24} />
        <span>Pulverlack</span>
      </button>

      <button
        type="button"
        className={`icon-category-button ${category === "Arbeitsmittel" ? "active" : ""}`}
        onClick={() => {
          setCategory("Arbeitsmittel");
          setErrors(prev => ({ ...prev, category: false }));
          if (step === 2) setStep(3);
        }}
      >
        <FaToolbox size={24} />
        <span>Arbeitsmittel</span>
      </button>
    </div>

    {errors.category && <div className="form-error">Kategorie ist erforderlich</div>}
  </div>
)}


        {step >= 3 && (
  <div className="form-section">
    <h2>3. Farbe & Eigenschaften</h2>

    <label>Farbsystem:</label>
    <div className="radio-group">
      {farbsysteme.map((option) => (
        <label key={option}>
          <input
            type="radio"
            name="colorSystem"
            value={option}
            checked={selectedColorSystem === option}
            onChange={() => {
              setSelectedColorSystem(option);
              if (step === 3) setStep(4); // Weiter zu Schritt 4
            }}
          />
          {option}
        </label>
      ))}
    </div>

    {category !== "Arbeitsmittel" ? (
      <>
        <label>Oberfläche:</label>
        <select value={surface} onChange={(e) => setSurface(e.target.value)} className="select-box">
          <option value="">-- Bitte wählen --</option>
          <option>Glatt</option>
          <option>Feinstruktur</option>
          <option>Grobstruktur</option>
        </select>

        <label>Glanzgrad:</label>
        <select value={gloss} onChange={(e) => setGloss(e.target.value)} className="select-box">
          <option value="">-- Bitte wählen --</option>
          <option>Hochglanz</option>
          <option>Seidenglanz</option>
          <option>Glanz</option>
          <option>Matt</option>
          <option>Seidenmatt</option>
          <option>Stumpfmatt</option>
        </select>

        <label>Effekt:</label>
        <select value={effect} onChange={(e) => setEffect(e.target.value)} className="select-box">
          <option value="">-- Bitte wählen --</option>
          <option>Ohne Sondereffekt</option>
          <option>Metallic</option>
          <option>Fluoreszierend</option>
        </select>

        <label>Qualität:</label>
        <select value={quality} onChange={(e) => setQuality(e.target.value)} className="select-box">
          <option value="">-- Bitte wählen --</option>
          <option>Polyester</option>
          <option>Epoxy-Polyester</option>
          <option>Polyester für Feuerverzinkung</option>
          <option>Thermoplast</option>
        </select>
      </>
    ) : (
      <>
        <label>Verwendungszweck:</label>
        <input
          className="input-title"
          placeholder="z. B. für Maskierung, Verpackung, Schutz…"
          value={effect}
          onChange={(e) => setEffect(e.target.value)}
        />

        <label>Einheit:</label>
        <input
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
          className="input-title"
          placeholder="z. B. Paar, Stück, Karton, Liter…"
        />

        <label>Maße / Größe (optional):</label>
        <input
          value={gloss}
          onChange={(e) => setGloss(e.target.value)}
          className="input-title"
          placeholder="z. B. 10x15 cm"
        />
      </>
    )}
  </div>
)}




      {step >= 4 && (
  <div className="form-section">
    <h2>4. Zusatzeigenschaften</h2>
    <div className="checkbox-grid">
      {Object.entries(checkboxOptions).map(([key, value]) => (
        <label key={key} className="checkbox-item">
          <input
            type="checkbox"
            checked={value}
            onChange={() => {
              setCheckboxOptions(prev => ({ ...prev, [key]: !prev[key] }));
              if (step === 4) setStep(5); // Weiter zu Schritt 5
            }}
          />
          <span>{key}</span>
        </label>
      ))}
    </div>
  </div>
)}


        {step >= 5 && (
  <div className="form-section">
    <h2>5. Preis & Versand</h2>

    <div className="form-row">
      <div>
        <label>Menge [kg]:</label>
        <input
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (step === 5) setStep(6); // Weiter zu Schritt 6
          }}
          className="input-title"
          type="number"
        />
      </div>

      <div>
        <label>Preis (€):</label>
        <input
          value={price}
          onChange={(e) => {
            setPrice(e.target.value);
            if (step === 5) setStep(6);
          }}
          className="input-title"
          type="number"
        />
      </div>

      <div>
        <label>Mindestabnahme (kg):</label>
        <input
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
          className="input-title"
          type="number"
        />
      </div>
    </div>

    <div className="form-row">
      <div>
        <label>Versandkosten (€):</label>
        <input
          value={shippingCost}
          onChange={(e) => setShippingCost(e.target.value)}
          className="input-title"
          type="number"
        />
      </div>

      <div>
        <label>Zustand:</label>
        <select
          value={itemCondition}
          onChange={(e) => setItemCondition(e.target.value)}
          className="select-box"
        >
          <option value="">-- Bitte wählen --</option>
          <option>Neu und ungeöffnet</option>
          <option>Geöffnet und einwandfrei</option>
        </select>
      </div>

      <div>
        <label>Versanddauer:</label>
        <select
          value={shippingTime}
          onChange={(e) => setShippingTime(e.target.value)}
          className="select-box"
        >
          <option value="">-- Bitte wählen --</option>
          <option>Gleicher Werktag</option>
          <option>1 Werktag</option>
          <option>2 Werktage</option>
          <option>3 Werktage</option>
        </select>
      </div>
    </div>
  </div>
)}


        {step >= 6 && (
  <div className="form-section">
    <h2>6. Beschreibung & Vorschau</h2>

    <div className="description-preview-wrapper">
      <div className="description-wrapper">
        <label htmlFor="beschreibung">Artikelbeschreibung:</label>
        <textarea
          id="beschreibung"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="textarea"
          placeholder="Beschreibe dein Produkt..."
          rows={4}
        ></textarea>
      </div>

      
    </div>
  </div>
)}



        

        <div className="button-group">
  <button
    onClick={handleSubmit}
    className="button-primary"
    disabled={files.length === 0}
  >
    Verkaufen
  </button>

  <button
    type="button"
    onClick={() => {
      if (confirm("Möchtest du wirklich alle Eingaben zurücksetzen?")) {
        localStorage.removeItem("verkaufsdaten");
        location.reload();
      }
    }}
    className="button-secondary"
  >
    Zurücksetzen
  </button>
</div>
</div>

    </>
  );
}
