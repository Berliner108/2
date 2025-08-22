'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import Slideshow from './slideshow/slideshow';
import CookieBanner from './components/CookieBanner';
import { dummyAuftraege } from '@/data/dummyAuftraege';
import type { Auftrag as RawAuftrag } from '@/data/dummyAuftraege';
import styles from '../styles/Home.module.css';
import { artikelDaten as artikelDatenLackanfragen } from '@/data/ArtikelDatenLackanfragen';
import { artikelDaten as artikelDatenShop } from '@/data/ArtikelimShop';
import { MapPin } from 'lucide-react';
import SearchBox from './components/SearchBox';

// -------- helpers --------
const toDate = (v: unknown): Date | undefined => {
  if (v === undefined || v === null) return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  const d = new Date(v as any);
  return isNaN(d.getTime()) ? undefined : d;
};
const formatDate = (d?: Date) =>
  d instanceof Date && !isNaN(d.getTime()) ? d.toLocaleDateString('de-AT') : '-';

// Wir arbeiten direkt mit dem Typ aus den Dummies
type Auftrag = RawAuftrag;

// Initial: gesponserte aus den Dummies (unverändert)
const initialSponsored: Auftrag[] = dummyAuftraege
  .filter(a => a.gesponsert)
  .slice(0, 12);

export default function Page() {
  // scroll-Refs
  const scrollRefAuftraege = useRef<HTMLDivElement>(null);
  const scrollRefShop = useRef<HTMLDivElement>(null);
  const scrollRefLackanfragen = useRef<HTMLDivElement>(null);

  // Aufträge
  const [auftraege, setAuftraege] = useState<Auftrag[]>(initialSponsored);

  useEffect(() => {
    const fetchAuftraege = async () => {
      try {
        const res = await fetch('/api/auftraege?sponsored=true&limit=12');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = (await res.json()) as any[];

        // Sanftes Merging: wir behalten alle bisherigen (Dummy-)Einträge
        // und überschreiben nur Felder, die die API wirklich liefert.
        setAuftraege(prev => {
          // Map per id für schnellen Zugriff
          const apiById = new Map<any, any>(data.map(x => [x.id, x]));
          return prev.map(old => {
            const a = apiById.get(old.id) ?? {};

            // Nur setzen, wenn API-Werte vorhanden sind,
            // sonst die Dummy-Werte aus `old` behalten.
            const warenausgabeDatum =
              toDate(a.warenausgabeDatum) ?? old.warenausgabeDatum;
            const warenannahmeDatum =
              toDate(a.warenannahmeDatum) ?? old.warenannahmeDatum;

            // Abhol-/Lieferarten NICHT leeren, nur überschreiben, wenn vorhanden
            const patch: Partial<Auftrag> = {
              ...(a.verfahren ? { verfahren: a.verfahren } : {}),
              ...(a.material ? { material: a.material } : {}),
              ...(a.length ? { length: a.length } : {}),
              ...(a.width ? { width: a.width } : {}),
              ...(a.height ? { height: a.height } : {}),
              ...(a.masse ? { masse: a.masse } : {}),
              ...(a.standort ? { standort: a.standort } : {}),
              ...(a.user ? { user: a.user } : {}),
              ...(Array.isArray(a.bilder) ? { bilder: a.bilder } : {}),
              ...(typeof a.gesponsert === 'boolean' ? { gesponsert: a.gesponsert } : {}),
              ...(typeof a.gewerblich === 'boolean' ? { gewerblich: a.gewerblich } : {}),
              ...(typeof a.privat === 'boolean' ? { privat: a.privat } : {}),
              ...(a.beschreibung ? { beschreibung: a.beschreibung } : {}),
              // Datumsfelder separat, damit sie auch dann gesetzt bleiben,
              // wenn API sie nicht liefert:
              warenausgabeDatum,
              warenannahmeDatum,
            };

            // Nur wenn API eine Art liefert, überschreiben – sonst Dummy behalten
            if (a.warenausgabeArt) patch.warenausgabeArt = a.warenausgabeArt;
            if (a.warenannahmeArt) patch.warenannahmeArt = a.warenannahmeArt;

            return { ...old, ...patch };
          });
        });
      } catch {
        // Fallback: Dummies behalten
        setAuftraege(initialSponsored);
      }
    };
    fetchAuftraege();
  }, []);

  // Lackanfragen
  type Lackanfrage = {
    id: string | number;
    titel: string;
    bilder: string[];
    menge: number;
    lieferdatum: Date;
    hersteller: string;
    zustand: string;
    kategorie: string;
    ort: string;
    preis?: number;
    gesponsert?: boolean;
  };

  const [lackanfragen, setLackanfragen] = useState<Lackanfrage[]>(
    artikelDatenLackanfragen
      .filter(a => a.gesponsert)
      .slice(0, 12)
      .map(a => ({ ...a, lieferdatum: toDate(a.lieferdatum)! }))
  );
  useEffect(() => {
    const fetchLack = async () => {
      try {
        const res = await fetch('/api/lackanfragen?limit=12');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        setLackanfragen((data as any[]).map(a => ({ ...a, lieferdatum: toDate(a.lieferdatum)! })));
      } catch { /* keep dummy */ }
    };
    fetchLack();
  }, []);

  // Shop-Artikel
  const [shopArtikel, setShopArtikel] = useState(
    artikelDatenShop
      .filter(a => a.gesponsert)
      .slice(0, 12)
      .map(a => ({ ...a, lieferdatum: toDate(a.lieferdatum)! }))
  );
  useEffect(() => {
    const fetchShop = async () => {
      try {
        const res = await fetch('/api/artikel?gesponsert=true&limit=12');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        setShopArtikel((data as any[]).map(a => ({ ...a, lieferdatum: toDate(a.lieferdatum)! })));
      } catch { /* keep dummy */ }
    };
    fetchShop();
  }, []);

  // Scroll-Helper
  const handleScroll = (ref: React.RefObject<HTMLDivElement>, dir: number) => {
    if (ref.current) ref.current.scrollLeft += dir * 200;
  };

  return (
    <Suspense fallback={<div>Seite lädt...</div>}>
      <div className={styles.wrapper}>
        <nav className={styles.navbar}>
          <ul className={styles.navList}>
            {[
              { title: 'Angebote einholen', href: '/angebote', links: [
                { href: '/angebote?first=Nasslackieren', text: 'Nasslackieren' },
                { href: '/angebote?first=Pulverbeschichten', text: 'Pulverbeschichten' },
                { href: '/angebote?first=Verzinken', text: 'Verzinken' },
                { href: '/angebote?first=Eloxieren', text: 'Eloxieren' },
                { href: '/angebote?first=Strahlen', text: 'Strahlen' },
                { href: '/angebote?first=Entlacken', text: 'Entlacken' },
                { href: '/angebote?first=Einlagern', text: 'Einlagern' },
                { href: '/angebote?first=Isolierstegverpressen', text: 'Isolierstegverpressung' },
                { href: '/angebote?first=Folieren', text: 'Folieren' },
                { href: '/angebote', text: 'Kombiniert' },
              ]},
              { title: 'Shop', href: '/kaufen', links: [
                { href: '/kaufen?kategorie=Nasslack', text: 'Nasslacke' },
                { href: '/kaufen?kategorie=Pulverlack', text: 'Pulverlacke' },
                { href: '/kaufen?kategorie=Arbeitsmittel', text: 'Arbeitsmittel' },
              ]},
              { title: 'Lacke anfragen', href: '/sonderlacke', links: [
                { href: '/sonderlacke?kategorie=nasslack', text: 'Nasslack' },
                { href: '/sonderlacke?kategorie=pulverlack', text: 'Pulverlack' },
              ]},
              { title: 'Auftragsbörse', href: '/auftragsboerse', links: [
                { href: '/auftragsboerse?verfahren=Nasslackieren', text: 'Nasslackieren' },
                { href: '/auftragsboerse?verfahren=Pulverbeschichten', text: 'Pulverbeschichten' },
                { href: '/auftragsboerse?verfahren=Verzinken', text: 'Verzinken' },
                { href: '/auftragsboerse?verfahren=Eloxieren', text: 'Eloxieren' },
                { href: '/auftragsboerse?verfahren=Strahlen', text: 'Strahlen' },
                { href: '/auftragsboerse?verfahren=Entlacken', text: 'Entlacken' },
                { href: '/auftragsboerse?verfahren=Einlagern', text: 'Einlagern' },
                { href: '/auftragsboerse?verfahren=Isolierstegverpressung', text: 'Isolierstegverpressung' },
                { href: '/auftragsboerse?verfahren=Folieren', text: 'Folieren' },
                { href: '/auftragsboerse', text: 'Alle' },
              ]},
              { title: 'Verkaufen', href: '/verkaufen', links: [
                { href: '/verkaufen?kategorie=nasslack', text: 'Nasslacke' },
                { href: '/verkaufen?kategorie=pulverlack', text: 'Pulverlacke' },
                { href: '/verkaufen?kategorie=arbeitsmittel', text: 'Arbeitsmittel' },
              ]},
              { title: 'Lackanfragen-Börse', href: '/lackanfragen', links: [
                { href: '/lackanfragen?kategorie=Nasslack', text: 'Nasslack' },
                { href: '/lackanfragen?kategorie=Pulverlack', text: 'Pulverlack' },
              ]},
              { title: 'Wissenswertes', href: '/wissenswertes', links: [
                { href: '/wissenswertes', text: 'Vision und Mission' },
                { href: '/wissenswertes#Sofunktioniert’s', text: 'So funktioniert’s' },
                { href: '/wissenswertes#Beschichtungstechnik', text: 'Beschichtungstechnik' },
                { href: '/wissenswertes#Verfahren', text: 'Verfahren' },
                { href: '/wissenswertes#Nasslackieren', text: 'Nasslackieren' },
                { href: '/wissenswertes#Pulverbeschichten', text: 'Pulverbeschichten' },
                { href: '/wissenswertes#Eloxieren', text: 'Eloxieren/Anodisieren' },
                { href: '/wissenswertes#Verzinken', text: 'Verzinken' },
                { href: '/wissenswertes#Verzinnen', text: 'Verzinnen' },
                { href: '/wissenswertes#Aluminieren', text: 'Aluminieren' },
                { href: '/wissenswertes#Vernickeln', text: 'Vernickeln' },
                { href: '/wissenswertes#Entlacken', text: 'Entlacken' },
                { href: '/wissenswertes#Strahlen', text: 'Strahlen' },
                { href: '/wissenswertes#Folieren', text: 'Folieren' },
                { href: '/wissenswertes#Isolierstegverpressen', text: 'Isolierstegverpressen' },
              ]},
              { title: 'Mein Konto', href: '/konto', links: [
                { href: '/konto/angebote', text: 'Angebote' },
                { href: '/konto/auftraege', text: 'Auftrags-Deals' },
                { href: '/konto/bestellungen', text: 'Bestellungen' },
                { href: '/konto/lackanfragen', text: 'Lackanfragen' },
                { href: '/konto/lackangebote', text: 'Lackangebote-Deals' },
                { href: '/konto/verkaufen', text: 'Verkaufen' },
                { href: '/konto/einstellungen', text: 'Kontoeinstellungen' },
                { href: '/konto/nachrichten', text: 'Nachrichten' },
              ]},
            ].map((item, index) => (
              <li key={index} className={styles.navItem}>
                <Link href={item.href} className={styles.navButton}>
                  {item.title}
                </Link>
                <div className={styles.dropdown}>
                  {item.links.map((link, linkIndex) => (
                    <Link key={linkIndex} href={link.href} className={styles.dropdownLink}>
                      {link.text}
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </nav>

        {/* Suchformular */}
        <Suspense fallback={<div>Suchfeld lädt...</div>}>
          <SearchBox />
        </Suspense>

        <Slideshow />

        {/* Auftragsbörse */}
        <section className={styles.sectionWrapper}>
          <div className={styles.articleLinkContainer}>
            <Link href="/auftragsboerse" className={styles.articleLink}>
              Top Deals aus der <span className={styles.colored}>Auftragsbörse</span>
            </Link>
          </div>

          <div className={styles.scrollContainer}>
            <div className={styles.scrollContent} ref={scrollRefAuftraege}>
              {auftraege.map((a) => (
                <Link key={a.id} href={`/auftragsboerse/auftraege/${a.id}`} className={styles.articleBox}>
                  <img
                    src={a.bilder?.[0] ?? '/images/platzhalter.jpg'}
                    alt={a.verfahren?.map(v => v.name).join(' & ') || 'Auftrag'}
                    className={styles.articleImg}
                  />
                  <div className={styles.articleText}>
                    <h3>{a.verfahren?.map(v => v.name).join(' & ') || 'Verfahren unbekannt'}</h3>
                    <p><strong>Material:</strong> {a.material}</p>
                    <p><strong>Maße:</strong> {a.length} x {a.width} x {a.height} mm</p>
                    <p><strong>Max. Masse:</strong> {a.masse}</p>
                    <p><strong>Lieferdatum:</strong> {formatDate(toDate(a.warenausgabeDatum))}</p>
                    <p><strong>Abholdatum:</strong> {formatDate(toDate(a.warenannahmeDatum))}</p>
                    <p><strong>Warenausgabe per:</strong> {a.warenausgabeArt || '-'}</p>
                    <p>
                      <MapPin size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      {a.standort}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <button className={styles.arrowLeft} onClick={() => handleScroll(scrollRefAuftraege, -1)}>
              <ChevronLeftIcon className="h-6 w-6 text-black" />
            </button>
            <button className={styles.arrowRight} onClick={() => handleScroll(scrollRefAuftraege, 1)}>
              <ChevronRightIcon className="h-6 w-6 text-black" />
            </button>
          </div>

          <div className={styles.imageContainer}>
            <img src="/images/snake79.jpg" alt="Artikelbild" className={styles.articleImage} />
          </div>
        </section>

        {/* Shop */}
        <section className={styles.sectionWrapper}>
          <div className={styles.articleLinkContainer}>
            <Link href="/kaufen" className={styles.articleLink}>
              Top Deals aus unserem <span className={styles.colored}>Shop</span>
            </Link>
          </div>
          <div className={styles.scrollContainer}>
            <div className={styles.scrollContent} ref={scrollRefShop}>
              {shopArtikel.map((art: any) => (
                <Link key={art.id} href={`/kaufen/artikel/${art.id}`} className={styles.articleBox2}>
                  <img src={art.bilder?.[0] ?? '/images/platzhalter.jpg'} alt={art.titel} className={styles.articleImg} />
                  <div className={styles.articleText}>
                    <h3>{art.titel}</h3>
                    <p><strong>Menge:</strong> {art.menge} kg</p>
                    <p><strong>Lieferdatum:</strong> {formatDate(art.lieferdatum)}</p>
                    <p><strong>Hersteller:</strong> {art.hersteller}</p>
                    <p><strong>Zustand:</strong> {art.zustand}</p>
                    <p><strong>Kategorie:</strong> {art.kategorie}</p>
                    <p style={{ fontSize: '1rem', fontWeight: 500, color: 'gray' }}>
                      <strong>Preis ab:</strong> {art.preis?.toFixed?.(2) ?? '–'} €
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <button className={styles.arrowLeft} onClick={() => handleScroll(scrollRefShop, -1)}>
              <ChevronLeftIcon className="h-6 w-6 text-black" />
            </button>
            <button className={styles.arrowRight} onClick={() => handleScroll(scrollRefShop, 1)}>
              <ChevronRightIcon className="h-6 w-6 text-black" />
            </button>
          </div>
        </section>

        <div className={styles.imageContainer}>
          <img src="/images/sonderlacke.jpg" alt="Artikelbild" className={styles.articleImage} />
        </div>

        {/* Lackanfragen */}
        <section className={styles.sectionWrapper}>
          <div className={styles.articleLinkContainer}>
            <Link href="/lackanfragen" className={styles.articleLink}>
              Top Deals aus der <span className={styles.colored}>Lackanfragen-Börse</span>
            </Link>
          </div>
          <div className={styles.scrollContainer}>
            <div className={styles.scrollContent} ref={scrollRefLackanfragen}>
              {lackanfragen.map((anfrage) => (
                <Link key={anfrage.id} href={`/lackanfragen/artikel/${anfrage.id}`} className={styles.articleBox3}>
                  <img
                    src={anfrage.bilder?.[0] ?? '/images/placeholder.jpg'}
                    alt="Lackanfrage-Bild"
                    className={styles.articleImg}
                  />
                  <div className={styles.articleText}>
                    <h3>{anfrage.titel}</h3>
                    <p><strong>Menge:</strong> {anfrage.menge} kg</p>
                    <p><strong>Lieferdatum:</strong> {formatDate(anfrage.lieferdatum)}</p>
                    <p><strong>Hersteller:</strong> {anfrage.hersteller}</p>
                    <p><strong>Zustand:</strong> {anfrage.zustand}</p>
                    <p><strong>Kategorie:</strong> {anfrage.kategorie}</p>
                    <p>
                      <MapPin size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      {anfrage.ort}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <button className={styles.arrowLeft} onClick={() => handleScroll(scrollRefLackanfragen, -1)}>
              <ChevronLeftIcon className="h-6 w-6 text-black" />
            </button>
            <button className={styles.arrowRight} onClick={() => handleScroll(scrollRefLackanfragen, 1)}>
              <ChevronRightIcon className="h-6 w-6 text-black" />
            </button>
          </div>
        </section>

        <CookieBanner />
      </div>
    </Suspense>
  );
}
