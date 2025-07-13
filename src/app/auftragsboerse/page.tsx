'use client';

import { useEffect, useState } from 'react';
import { dummyAuftraege } from './dummyAuftraege'; // Importieren der Dummy-Daten
import styles from './auftragsboerse.module.css';
import Link from 'next/link';
import Image from 'next/image';
import Pager from './navbar/pager';

export default function Page() {
  // Zustand initialisieren
  const [auftraege, setAuftraege] = useState<any[]>([]); // Aufträge zu Beginn als leer setzen
  const [selectedVerfahren, setSelectedVerfahren] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedUserType, setSelectedUserType] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // Schieberegler-Werte für Länge, Breite, Höhe und Masse
  const [length, setLength] = useState(20000);  // Länge
  const [width, setWidth] = useState(10000);    // Breite
  const [height, setHeight] = useState(5000);    // Höhe
  const [weight, setWeight] = useState(1000);     // Masse

  // useEffect-Hook, um die Daten zu setzen, wenn die Seite geladen wird
  useEffect(() => {
    setAuftraege(dummyAuftraege); // Setze die Dummy-Daten in den State
  }, []); // Der leere Abhängigkeits-Array sorgt dafür, dass dieser Code nur einmal ausgeführt wird

  // Funktion zum Parsen der Masse
  const parseWeight = (weight: string) => {
    return parseFloat(weight.replace(' kg', '')); // Entfernen von ' kg' und Umwandeln in eine Zahl
  };

  // Filterung nach Verfahren, Material und UserType (Privat/Gewerblich)
  const gefilterteAuftraege = auftraege.filter((auftrag) => {
    const verfahrenMatch = !selectedVerfahren || auftrag.verfahren.includes(selectedVerfahren);
    const materialMatch = !selectedMaterial || auftrag.material === selectedMaterial;
    const userTypeMatch = !selectedUserType || (selectedUserType === 'business' ? auftrag.isBusiness : !auftrag.isBusiness);

    const auftragWeight = parseWeight(auftrag.masse);  // Masse als Zahl umwandeln

    const lengthMatch = auftrag.length <= length;
    const widthMatch = auftrag.width <= width;
    const heightMatch = auftrag.height <= height;
    const weightMatch = auftragWeight <= weight;

    return verfahrenMatch && materialMatch && userTypeMatch && lengthMatch && widthMatch && heightMatch && weightMatch;
  });

  // Sortiere Aufträge nach "isSponsored" (gesponsert zuerst) und dann nach Lieferdatum
  const sortierteAuftraege = gefilterteAuftraege.sort((a, b) => {
    if (b.isSponsored === true && a.isSponsored === false) {
      return 1; // Gesponserte Aufträge nach oben
    } else if (b.isSponsored === false && a.isSponsored === true) {
      return -1; // Gesponserte Aufträge nach oben
    }

    const dateA = new Date(a.lieferDatum);
    const dateB = new Date(b.lieferDatum);

    if (sortOrder === 'ascending') {
      return dateA.getTime() - dateB.getTime();
    } else if (sortOrder === 'descending') {
      return dateB.getTime() - dateA.getTime();
    }
    return 0; // Wenn "neutral" (keine Sortierung)
  });

  // Berechne den Index für die Seitenanzeige
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortierteAuftraege.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(sortierteAuftraege.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(event.target.value);
  };

  const handleUserTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUserType(event.target.value);
  };

  return (
    <>
      <Pager />
      <div className={styles.wrapper}>
        {/* Filtercontainer links */}
        <aside className={styles.filterContainer}>
          <h3>Filter</h3>
          <label>
            Verfahren:
            <select value={selectedVerfahren} onChange={(e) => setSelectedVerfahren(e.target.value)}>
              <option value="">Alle</option>
              <option value="Pulverbeschichten">Pulverbeschichten</option>
              <option value="Eloxieren">Eloxieren</option>
              <option value="Entlacken">Entlacken</option>
              <option value="Nasslackieren">Nasslackieren</option>
              <option value="Verzinken">Verzinken</option>
              <option value="Anodisieren">Anodisieren</option>
              <option value="Vernickeln">Vernickeln</option>
              <option value="Verzinnen">Verzinnen</option>
              <option value="Strahlen">Strahlen</option>
              <option value="Folieren">Folieren</option>
              <option value="Verzinnen">Verzinnen</option>
              <option value="Entzinken">Entzinken</option>
              <option value="Entzinnen">Entzinnen</option>
              <option value="Enteloxieren">Enteloxieren</option>
              <option value="Entnickeln">Entnickeln</option>
              <option value="Aluminieren">Aluminieren</option>
              <option value="Isolierstegverpressen">Isolierstegverpressen</option>
              <option value="Einlagern">Einlagern</option>
              <option value="Entaluminieren">Entaluminieren</option>
            </select>
          </label>
          <label>
            Material:
            <select value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)}>
              <option value="">Alle</option>
              <option value="Aluminium">Aluminium</option>
              <option value="Stahl">Stahl</option>
            </select>
          </label>

          {/* Filter für die Abmessungen und Masse */}
          <label>
            Länge: {length} mm
            <input
              className={styles.range}
              type="range"
              min="0"
              max="20000"
              step="10"
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
            />
          </label>

          <label>
            Breite: {width} mm
            <input
              className={styles.range}
              type="range"
              min="0"
              max="10000"
              step="10"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </label>

          <label>
            Höhe: {height} mm
            <input
              className={styles.range}
              type="range"
              min="0"
              max="5000"
              step="5"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </label>

          <label>
            Masse: {weight} kg
            <input
              className={styles.range}
              type="range"
              min="0"
              max="1000"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
            />
          </label>

          {/* Nutzerstatus Filter */}
          <label>
            Nutzerstatus:
            <select value={selectedUserType} onChange={handleUserTypeChange}>
              <option value="">Alle</option>
              <option value="business">Gewerblich</option>
              <option value="private">Privat</option>
            </select>
          </label>

          {/* Dropdown für Sortierung */}
          <label>
            Sortieren nach Lieferdatum:
            <select value={sortOrder} onChange={handleSortChange}>
              <option value="">-</option>
              <option value="ascending">Aufsteigend</option>
              <option value="descending">Absteigend</option>
            </select>
          </label>
        </aside>

        {/* Rechte Spalte */}
        <section className={styles.rightColumn1}>
          {/* Dynamische Anzeige der Anzahl der Aufträge */}
          <section className={styles.auftragsInfo}>
            {gefilterteAuftraege.length} Aufträge sind aktuell in der Auftragsbörse
          </section>

          {/* Kartencontainer */}
          <section className={styles.auftragsListe}>
            {currentItems.map((auftrag) => (
              <Link key={auftrag.id} href={`/auftragsboerse/${auftrag.id}`} className={styles.karte}>
                <div className={styles.cardTop}>
                  {auftrag.isSponsored && (
                    <div className={styles.sponsored}>Gesponsert</div>
                  )}
                  <div className={styles.imageBox}>
                    <Image
                      src={auftrag.bilder[0]}
                      alt="Vorschaubild"
                      className={styles.previewImage}
                      width={400}
                      height={400}
                    />
                  </div>

                  <div className={styles.cardContent}>
                    <h4>{auftrag.verfahren.join(' & ')}</h4>
                    <div className={styles.cardGrid}>
                      <div className={styles.leftColumn1}>
                        <p><strong>Material:</strong> {auftrag.material}</p>
                        <p><strong>Standort:</strong> {auftrag.standort}</p> 
                        <p><strong>Abmessung:</strong> {auftrag.length} x {auftrag.width} x {auftrag.height} mm</p>
                        <p><strong>Masse:</strong> {auftrag.masse}</p>
                        <p><strong>Auftraggeber:</strong> {auftrag.benutzername} – ⭐ {auftrag.bewertung} 
                          {auftrag.isBusiness ? ' (Gewerblich)' : ' (Privat)'}
                        </p>
                      </div>
                      <div className={styles.rightColumn}>
                        <p><strong>Lieferdatum:</strong> {new Date(auftrag.lieferDatum).toLocaleDateString('de-AT')} ({auftrag.lieferArt})</p>
                        <p><strong>Abholdatum:</strong> {new Date(auftrag.abholDatum).toLocaleDateString('de-AT')} ({auftrag.abholArt})</p>
                        <ul className={styles.fileList}>
                          {auftrag.dateien.map((file: string, index: number) => (
                            <li key={index}>{file}</li>
                          ))}
                        </ul>
                        <button className={styles.detailButton}>Details</button>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </section>

          {/* Paginierung */}
          <div className={styles.pagination}>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => handlePageChange(pageNumber)}
                className={`${styles.pageButton} ${currentPage === pageNumber ? styles.activePage : ''}`}
              >
                {pageNumber}
              </button>
            ))}
          </div>

        </section>
      </div>
    </>
  );
}
