// app/components/KaufenSeite.tsx
import { useState } from 'react';
import Link from 'next/link';

interface Artikel {
  id: string;
  titel: string;
  hersteller: string;
  zustand: string;
  bewertet: number;
  kategorie: string;
  lieferdatum: Date;
  bild: string;
  gesponsert: boolean;
  gewerblich: boolean;
  privat: boolean;
}

interface Props {
  artikelDaten: Artikel[];
}

const KaufenSeiten: React.FC<Props> = ({ artikelDaten }) => {
  const [suchbegriff, setSuchbegriff] = useState('');

  return (
    <div>
      <h1>Unsere Artikel</h1>
      {artikelDaten.map((artikel) => (
        <div key={artikel.id} style={{ marginBottom: '20px' }}>
          <Link href={`/lackanfragen/artikel/${artikel.id}`}>
            <a>
              <h3>{artikel.titel}</h3>
              <p>{artikel.hersteller}</p>
              <img src={artikel.bild} alt={artikel.titel} width="200" />
            </a>
          </Link>
        </div>
      ))}
    </div>
  );
};

export default KaufenSeiten;
