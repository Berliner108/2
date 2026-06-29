'use client';

import type React from 'react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import Image from 'next/image';
import styles from './detailseite.module.css';
import Navbar from '../../../components/navbar/Navbar';
import { LocalToastProvider, useLocalToast } from '../../../components/ui/local-toast';
import { FaFilePdf } from 'react-icons/fa';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { Auftrag } from '@/lib/types/auftrag';

type ConnectStatus = { ready: boolean; reason?: string | null; mode?: 'test' | 'live' };
const NDA_VERSION_LABEL = 'v1';
const NDA_STAND_LABEL = '29.06.2026';

const NDA_TEXT = `GEHEIMHALTUNGSVEREINBARUNG für NDA-pflichtige Aufträge auf der Plattform Beschichter Scout

Version: ${NDA_VERSION_LABEL}
Stand: ${NDA_STAND_LABEL}


1. Präambel

Beschichter Scout betreibt eine digitale Plattform, über die Auftraggeber Aufträge, Anfragen, technische Unterlagen und sonstige Informationen veröffentlichen können, damit geeignete Anbieter Angebote abgeben oder Aufträge durchführen können.

Bei bestimmten Aufträgen können vertrauliche Informationen, insbesondere technische Zeichnungen, Bilder, Dateien, Spezifikationen, Kundendaten, Materialangaben, Fertigungsparameter, Preise, Kalkulationsgrundlagen oder sonstige geschäftlich sensible Informationen offengelegt werden.

Der Zugriff auf solche NDA-pflichtigen Aufträge ist nur zulässig, wenn der jeweilige Nutzer diese Geheimhaltungsvereinbarung akzeptiert. Mit der digitalen Akzeptanz dieser Vereinbarung verpflichtet sich der Nutzer zur Einhaltung der nachfolgenden Bestimmungen.


2. Parteien und Geltungsbereich

Diese Geheimhaltungsvereinbarung gilt zwischen:

a) dem Nutzer, der auf einen NDA-pflichtigen Auftrag zugreifen möchte,

b) dem jeweiligen Auftraggeber, der vertrauliche Informationen über Beschichter Scout bereitstellt,

und

c) Beschichter Scout als Betreiber der Plattform.

Beschichter Scout ist nicht automatisch Eigentümer der vom Auftraggeber bereitgestellten vertraulichen Informationen. Die Rechte an diesen Informationen verbleiben beim jeweiligen Auftraggeber oder sonstigen berechtigten Rechteinhaber.

Diese Vereinbarung gilt für jeden einzelnen NDA-pflichtigen Auftrag, dessen Detailansicht, Dateien, Bilder oder sonstige geschützte Informationen der Nutzer über Beschichter Scout einsehen kann.


3. Zweck der Offenlegung

Die Offenlegung vertraulicher Informationen erfolgt ausschließlich zu folgendem Zweck:

Prüfung eines konkreten NDA-pflichtigen Auftrags, Abgabe eines Angebots, technische Klärung im Zusammenhang mit diesem Auftrag sowie, im Falle einer Beauftragung, ordnungsgemäße Durchführung und Abwicklung dieses konkreten Auftrags über Beschichter Scout.

Eine Nutzung der vertraulichen Informationen für andere Zwecke ist untersagt. Insbesondere ist es dem Nutzer untersagt, vertrauliche Informationen für eigene Projekte, fremde Projekte, Wettbewerbszwecke, Nachentwicklungen, Kopien, Marktanalysen, Kundenakquise oder zur Umgehung von Beschichter Scout zu verwenden.


4. Vertrauliche Informationen

Vertrauliche Informationen im Sinne dieser Vereinbarung sind alle Informationen, die dem Nutzer im Zusammenhang mit einem NDA-pflichtigen Auftrag über Beschichter Scout zugänglich gemacht werden und die nach ihrer Art, ihrem Inhalt oder den Umständen der Offenlegung als vertraulich anzusehen sind.

Dazu zählen insbesondere technische Zeichnungen, CAD-Dateien, Skizzen und Pläne, Bilder, Fotos, Musterbeschreibungen, Bauteildarstellungen, Materialangaben, Oberflächenanforderungen, Fertigungsparameter, Angaben zu Beschichtungsverfahren, Vorbehandlungen, Prüfanforderungen, Normen, Stückzahlen, Mengen, Liefertermine, Projektinformationen, Kundendaten, Lieferantendaten, Kontaktdaten, Preise, Kalkulationen, Angebotsgrundlagen, Rezepturen, Prozessdaten, Know-how, Geschäfts- und Betriebsgeheimnisse, hochgeladene Dateien, Anhänge, Nachrichten und sonstige Plattforminhalte.

Eine Information gilt auch dann als vertraulich, wenn sie nicht ausdrücklich als „vertraulich“ gekennzeichnet ist, sofern sich ihre Vertraulichkeit aus dem Zusammenhang ergibt.


5. Pflichten des Nutzers

Der Nutzer verpflichtet sich, vertrauliche Informationen streng vertraulich zu behandeln, ausschließlich für den in Punkt 3 genannten Zweck zu verwenden, nicht an Dritte weiterzugeben, nicht zu veröffentlichen, nicht hochzuladen, nicht zu verkaufen, nicht zu vervielfältigen und nicht anderweitig zugänglich zu machen.

Der Nutzer darf vertrauliche Informationen nur solchen eigenen Mitarbeitern, Erfüllungsgehilfen oder Beratern zugänglich machen, die diese Informationen für den konkreten Auftrag zwingend benötigen. Der Nutzer stellt sicher, dass diese Personen ebenfalls zur Geheimhaltung verpflichtet sind.

Der Nutzer verpflichtet sich außerdem, angemessene technische und organisatorische Maßnahmen zum Schutz der vertraulichen Informationen zu treffen. Vertrauliche Informationen dürfen nicht in öffentlich zugängliche Systeme, ungesicherte Cloud-Speicher, offene KI-Tools, öffentliche Chatbots, soziale Netzwerke, Messenger-Gruppen oder sonstige ungeschützte Dienste hochgeladen werden.

Vertrauliche Informationen dürfen nicht für Reverse Engineering, Nachbau, Dekompilierung, Ableitung eigener Produkte oder Entwicklung konkurrierender Leistungen verwendet werden.

Jeder unbefugte Zugriff, Verlust oder Verdacht auf Missbrauch ist unverzüglich an Beschichter Scout und, soweit bekannt, an den betroffenen Auftraggeber zu melden.


6. Verbot der Plattformumgehung

Der Nutzer darf vertrauliche Informationen nicht dazu verwenden, den Auftraggeber außerhalb von Beschichter Scout direkt zu kontaktieren, den Auftrag außerhalb von Beschichter Scout abzuwickeln oder eine sonstige Umgehung der Plattform herbeizuführen.

Dies gilt insbesondere, wenn der Kontakt, das Projekt, die technischen Unterlagen oder die geschäftliche Möglichkeit erst durch die Einsicht in den NDA-pflichtigen Auftrag über Beschichter Scout bekannt geworden sind.


7. Begrenzung des Empfängerkreises

Der Nutzer darf vertrauliche Informationen nur an Personen innerhalb seines Unternehmens oder seiner Organisation weitergeben, wenn diese Personen die Informationen zwingend für die Angebotsprüfung oder Auftragsdurchführung benötigen.

Eine Weitergabe an externe Dritte, Subunternehmer, Berater oder verbundene Unternehmen ist nur zulässig, wenn dies für den konkreten Auftrag erforderlich ist und diese Personen zuvor mindestens gleichwertig zur Geheimhaltung verpflichtet wurden.

Der Nutzer haftet für Verstöße solcher Personen wie für eigene Verstöße.


8. Ausnahmen von der Geheimhaltungspflicht

Die Geheimhaltungspflicht gilt nicht für Informationen, bei denen der Nutzer nachweisen kann, dass sie zum Zeitpunkt der Offenlegung bereits öffentlich bekannt waren, nach der Offenlegung ohne Verstoß gegen diese Vereinbarung öffentlich bekannt wurden, dem Nutzer bereits vor der Offenlegung rechtmäßig und ohne Geheimhaltungspflicht bekannt waren, dem Nutzer von einem berechtigten Dritten rechtmäßig und ohne Geheimhaltungspflicht offengelegt wurden, vom Nutzer unabhängig und ohne Nutzung vertraulicher Informationen entwickelt wurden oder vom Auftraggeber oder einem sonstigen Berechtigten schriftlich zur Offenlegung freigegeben wurden.

Die Beweislast für das Vorliegen einer Ausnahme trägt der Nutzer.


9. Gesetzliche oder behördliche Offenlegungspflichten

Ist der Nutzer aufgrund gesetzlicher Vorschriften, gerichtlicher Entscheidung oder behördlicher Anordnung verpflichtet, vertrauliche Informationen offenzulegen, darf die Offenlegung nur im gesetzlich erforderlichen Umfang erfolgen.

Soweit rechtlich zulässig, hat der Nutzer Beschichter Scout und den betroffenen Auftraggeber vorab unverzüglich schriftlich zu informieren, damit geeignete Schutzmaßnahmen geprüft werden können.


10. Keine Rechteeinräumung

Durch die Offenlegung vertraulicher Informationen erhält der Nutzer keine Eigentumsrechte, Nutzungsrechte, Lizenzrechte oder sonstigen Rechte an den vertraulichen Informationen.

Alle Rechte an Zeichnungen, Dateien, Designs, technischen Unterlagen, Know-how, Geschäftsgeheimnissen, Marken, Urheberrechten, Daten und sonstigen Schutzrechten verbleiben beim jeweiligen Auftraggeber oder Rechteinhaber.

Die Einsichtnahme über Beschichter Scout berechtigt ausschließlich zur zweckgebundenen Prüfung und Bearbeitung des konkreten Auftrags.


11. Rückgabe und Löschung

Der Nutzer ist verpflichtet, vertrauliche Informationen auf Aufforderung von Beschichter Scout oder des Auftraggebers unverzüglich zu löschen, zurückzugeben oder dauerhaft unzugänglich zu machen.

Dies gilt insbesondere, wenn kein Angebot abgegeben wird, der Auftrag nicht zustande kommt, der Nutzer nicht beauftragt wird, der Auftrag abgeschlossen ist und keine weitere Aufbewahrung erforderlich ist oder der Auftraggeber oder Beschichter Scout die Löschung verlangt.

Gesetzliche Aufbewahrungspflichten bleiben unberührt. Soweit Informationen aufgrund gesetzlicher Pflichten oder technisch unvermeidbarer Sicherungskopien nicht sofort gelöscht werden können, sind sie weiterhin vertraulich zu behandeln und dürfen nicht aktiv genutzt werden.


12. Dauer der Geheimhaltung

Die Verpflichtungen aus dieser Geheimhaltungsvereinbarung beginnen mit der digitalen Akzeptanz durch den Nutzer auf der Plattform Beschichter Scout.

Die Geheimhaltungspflichten gelten für einen Zeitraum von fünf Jahren ab der letzten Einsichtnahme des Nutzers in vertrauliche Informationen des jeweiligen NDA-pflichtigen Auftrags.

Soweit die vertraulichen Informationen Geschäftsgeheimnisse, technische Zeichnungen, Rezepturen, Fertigungsparameter, Konstruktionsdaten, Kundendaten, Lieferantendaten, Preis- oder Kalkulationsgrundlagen oder sonstige nicht öffentlich bekannte Informationen von wirtschaftlichem Wert enthalten, bestehen die Geheimhaltungspflichten darüber hinaus so lange fort, wie diese Informationen nicht allgemein bekannt oder rechtmäßig öffentlich zugänglich geworden sind.


13. Folgen einer Verletzung

Verstößt der Nutzer schuldhaft gegen diese Geheimhaltungsvereinbarung, insbesondere durch unbefugte Weitergabe, Veröffentlichung, Nutzung außerhalb des vorgesehenen Zwecks, Speicherung, Vervielfältigung, Weiterleitung oder Plattformumgehung, ist er verpflichtet, die Verletzung unverzüglich einzustellen.

Der Nutzer hat in diesem Fall sämtliche betroffenen vertraulichen Informationen unverzüglich zu löschen oder zurückzugeben und Beschichter Scout sowie den betroffenen Auftraggeber unverzüglich schriftlich über Art, Umfang und Zeitpunkt der Verletzung zu informieren.

Der Nutzer haftet für sämtliche Schäden, Nachteile, Kosten und Aufwendungen, die Beschichter Scout, dem Auftraggeber oder sonstigen betroffenen Dritten durch die Verletzung der Geheimhaltungspflichten entstehen. Dies umfasst insbesondere Kosten der Rechtsverfolgung, Schäden aus dem Verlust von Geschäftsgeheimnissen, Produktions- oder Wettbewerbsschäden sowie sonstige wirtschaftliche Nachteile.

Für jeden schuldhaften Verstoß gegen diese Geheimhaltungsvereinbarung verpflichtet sich der Nutzer zur Zahlung einer Vertragsstrafe in Höhe von EUR 10.000,00.

Die Vertragsstrafe stellt keine Begrenzung der Haftung dar. Beschichter Scout, der betroffene Auftraggeber und sonstige betroffene Rechteinhaber bleiben berechtigt, einen darüberhinausgehenden Schadenersatz geltend zu machen, insbesondere wenn durch die Verletzung Geschäftsgeheimnisse, technische Unterlagen, Kundendaten, Fertigungsinformationen oder sonstige Informationen von erheblichem wirtschaftlichem Wert offengelegt, verwertet oder entwertet werden.

Eine bezahlte Vertragsstrafe wird auf einen darüberhinausgehenden Schadenersatzanspruch angerechnet, soweit gesetzlich erforderlich. Die Vertragsstrafe unterliegt, soweit gesetzlich zwingend vorgesehen, einer allfälligen richterlichen Mäßigung.


14. Sperre und Maßnahmen durch Beschichter Scout

Bei Verdacht auf eine Verletzung dieser Vereinbarung ist Beschichter Scout berechtigt, den Zugriff des Nutzers auf den betroffenen Auftrag, auf weitere NDA-pflichtige Aufträge oder auf die Plattform ganz oder teilweise vorübergehend zu sperren.

Bei schwerwiegenden oder wiederholten Verstößen ist Beschichter Scout berechtigt, das Nutzerkonto dauerhaft zu sperren oder zu löschen, soweit dies nach den Nutzungsbedingungen und gesetzlichen Vorschriften zulässig ist.

Weitergehende Ansprüche von Beschichter Scout oder des betroffenen Auftraggebers bleiben unberührt.


15. Datenschutz

Soweit im Rahmen eines NDA-pflichtigen Auftrags personenbezogene Daten zugänglich gemacht werden, verpflichtet sich der Nutzer, diese Daten ausschließlich im Rahmen des konkreten Auftrags und unter Einhaltung der anwendbaren Datenschutzvorschriften, insbesondere der DSGVO, zu verarbeiten.

Eine Nutzung personenbezogener Daten für Werbung, Direktkontakt, eigene Kundendatenbanken, Weitergabe an Dritte oder sonstige zweckfremde Verarbeitung ist untersagt.


16. Kartellrecht und unzulässiger Informationsaustausch

Diese Vereinbarung erlaubt keinen Austausch von Informationen, der gegen kartellrechtliche oder sonstige gesetzliche Vorschriften verstößt.

Insbesondere dürfen wettbewerbssensible Informationen nur insoweit eingesehen, verwendet oder weitergegeben werden, wie dies für den konkreten Auftrag erforderlich und rechtlich zulässig ist.


17. Digitale Akzeptanz und Nachweis

Die Akzeptanz dieser Geheimhaltungsvereinbarung erfolgt digital über Beschichter Scout.

Beschichter Scout ist berechtigt, die Akzeptanz zu dokumentieren, insbesondere durch Speicherung von Nutzer-ID, Auftrag-ID, Zeitpunkt der Akzeptanz, Version der Vereinbarung sowie weiteren technischen Nachweisdaten, soweit dies zur Dokumentation und Durchsetzung der Vereinbarung erforderlich ist.

Mit Anklicken der entsprechenden Schaltfläche oder Checkbox bestätigt der Nutzer, diese Geheimhaltungsvereinbarung gelesen und akzeptiert zu haben.


18. Anwendbares Recht und Gerichtsstand

Diese Vereinbarung unterliegt österreichischem Recht unter Ausschluss der Kollisionsnormen und des UN-Kaufrechts.

Für Streitigkeiten aus oder im Zusammenhang mit dieser Vereinbarung ist, soweit gesetzlich zulässig, das sachlich zuständige Gericht am Sitz von Beschichter Scout ausschließlich zuständig.


19. Schlussbestimmungen

Sollten einzelne Bestimmungen dieser Vereinbarung ganz oder teilweise unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.

Anstelle der unwirksamen oder undurchführbaren Bestimmung gilt eine wirksame und durchführbare Regelung als vereinbart, die dem wirtschaftlichen Zweck der ursprünglichen Bestimmung möglichst nahekommt.

Änderungen oder Ergänzungen dieser Vereinbarung bedürfen der Textform, soweit nicht eine strengere Form gesetzlich vorgeschrieben ist.

Diese Vereinbarung gilt ergänzend zu den Nutzungsbedingungen, Datenschutzbestimmungen und sonstigen Plattformregelungen von Beschichter Scout. Im Falle eines Widerspruchs gehen für den Schutz vertraulicher Informationen die strengeren Regelungen vor.`;
const labelWarenausgabeArt = (v?: string | null) => {
  const s = (v ?? '').trim().toLowerCase();
  if (s === 'abholung') return 'Abholung';
  if (s === 'selbst') return 'Selbstanlieferung';
  return '—';
};

const labelWarenrueckgabeArt = (v?: string | null) => {
  const s = (v ?? '').trim().toLowerCase();
  if (s === 'anlieferung') return 'Anlieferung';
  if (s === 'selbst') return 'Selbstabholung';
  return '—';
};

/* ===== Fancy Top Loader ===== */
function TopLoader() {
  return (
    <div className={styles.topLoader} aria-hidden>
      <div className={styles.topLoaderInner} />
    </div>
  );
}

/* ===== Skeleton ===== */
function DetailSkeleton() {
  return (
    <div
      className={styles.skeletonPage}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={styles.skelHeader}>
        <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
        <div className={styles.skelLine} />
      </div>
      <div className={styles.skelTwoCols}>
        <div className={styles.skelDrop} />
        <div className={styles.skelGrid}>
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
        </div>
      </div>
      <div className={styles.skelBlock} />
      <div className={styles.skelBlockSmall} />
            <div className={styles.skelTallOnly}>
        <div className={styles.skelGrid}>
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
        </div>

        <div className={styles.skelBlock} />

        <div className={styles.skelTwoCols}>
          <div className={styles.skelDropSmall} />
          <div className={styles.skelGrid}>
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
          </div>
        </div>

        <div className={styles.skelBlock} />
        <div className={styles.skelBlockSmall} />
      </div>
      
    </div>
  );
}

/* ===== Deadline-Helper – IDENTISCH zu Lackanfragen ===== */
function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ date }: { date: Date | null }) {
  if (!date) return null;
  const d = daysUntil(date);
  let text = '';
  if (d < 0)
    text = `abgeschlossen seit ${Math.abs(d)} Tag${
      Math.abs(d) === 1 ? '' : 'en'
    }`;
  else if (d === 0) text = 'heute';
  else if (d === 1) text = 'morgen';
  else text = `in ${d} Tagen`;
  const variant =
    d < 0 ? styles.badgeDanger : d <= 3 ? styles.badgeWarn : styles.badgeOk;
  return (
    <span
      className={`${styles.badge} ${styles.deadline} ${variant}`}
      title={`Lieferfrist: ${date.toLocaleDateString('de-DE')}`}
      aria-label={`Lieferfrist ${text}`}
    >
      {text}
    </span>
  );
}

function parseMoneyOrNull(raw: string): number | null {
  if (!raw) return null;

  let v = raw.replace(/\s/g, '').replace(',', '.');
  if (!v) return null;

  const n = Number(v);

  // ungültig oder negativ -> Fehler
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }

  // keine künstliche Obergrenze mehr
  return n;
}

function formatMoney(n: number): string {
  return n.toFixed(2);
}
function toCentsFromMoneyInput(raw: string): number | null {
  const n = parseMoneyOrNull(raw);
  if (n === null) return null;
  // € -> cents (sauber runden)
  return Math.round(n * 100);
}

/* ===== Limits ===== */
const MAX_PRICE_CHARS = 8; // z. B. "99999,99"

/**
 * Erlaubt NUR Ziffern + EIN Dezimaltrennzeichen (Komma oder Punkt),
 * max. 2 Nachkommastellen, max. Länge.
 */
function normalizeMoneyInput(raw: string, maxChars: number): string {
  // Nur Ziffern und ,/. zulassen
  let v = raw.replace(/[^\d.,]/g, '');

  if (!v) return '';

  // Nur EIN Dezimaltrennzeichen erlauben
  const firstSep = v.search(/[.,]/);
  if (firstSep !== -1) {
    const before = v.slice(0, firstSep + 1);
    const after = v.slice(firstSep + 1).replace(/[.,]/g, '');
    v = before + after;
  }

  // Maximal 2 Nachkommastellen
  const match = v.match(/^(\d+)([.,])?(\d{0,2})?/);
  if (!match) return '';

  let result = match[1]; // ganzzahliger Teil
  if (match[2]) result += match[2]; // Trenner
  if (match[3]) result += match[3]; // Nachkommastellen

  // Länge begrenzen
  if (result.length > maxChars) {
    result = result.slice(0, maxChars);
  }

  return result;
}

function hasMinWholeDigits(value: string, minDigits: number): boolean {
  // nur Ziffern und Trennzeichen
  const cleaned = value.replace(/[^\d.,]/g, '');
  const [wholePart] = cleaned.split(/[.,]/);
  return wholePart.length >= minDigits;
}
function formatSerienDatum(value: unknown): string {
  if (!value) return '—';

  const raw = String(value).trim();
  const date = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);

  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
function labelSerienRhythmus(value: unknown): string {
  const s = String(value ?? '').trim().toLowerCase();

  if (!s) return '';

  if (s === 'taeglich' || s === 'täglich' || s === 'daily') {
    return 'täglich';
  }

  if (s === 'woechentlich' || s === 'wöchentlich' || s === 'weekly') {
    return 'wöchentlich';
  }

  if (
    s === 'alle_zwei_wochen' ||
    s === 'alle-2-wochen' ||
    s === 'alle zwei wochen' ||
    s === 'zweiwoechentlich' ||
    s === 'zweiwöchentlich' ||
    s === 'biweekly'
  ) {
    return 'alle zwei Wochen';
  }

  if (s === 'monatlich' || s === 'monthly') {
    return 'monatlich';
  }

  return String(value);
}
function AuftragDetailClientBody({ auftrag }: { auftrag: Auftrag }) {
  // später: beim echten Backend auf true setzen
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [ndaChecked, setNdaChecked] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    window.history.scrollRestoration = 'manual';

    const scrollTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollTop();

    const raf = requestAnimationFrame(scrollTop);
    const t1 = window.setTimeout(scrollTop, 50);
    const t2 = window.setTimeout(scrollTop, 250);
    const t3 = window.setTimeout(scrollTop, 600);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [auftrag.id]);
  

  const { error: toastError, success: toastSuccess } = useLocalToast();

  // Connect (Stripe) Status – identisch zur Lackanfragen-Detailseite
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [connectLoaded, setConnectLoaded] = useState(false);
  const [accountType, setAccountType] = useState<string>('');
  const [profileLoaded, setProfileLoaded] = useState(false);

  const fetchConnect = useCallback(async () => {
    try {
      const r = await fetch('/api/connect/status', { cache: 'no-store', credentials: 'include' });
      const j: ConnectStatus = await r.json().catch(() => ({ ready: false } as ConnectStatus));
      setConnect(r.ok ? j : { ready: false });
    } finally {
      setConnectLoaded(true);
    }
  }, []);
  const fetchProfile = useCallback(async () => {
  try {
    const r = await fetch('/api/profile', {
      cache: 'no-store',
      credentials: 'include',
    });

    const j = await r.json().catch(() => ({} as any));

    if (r.ok) {
      setAccountType(String(j?.profile?.account_type || '').toLowerCase());
    } else {
      setAccountType('');
    }
  } finally {
    setProfileLoaded(true);
  }
}, []);

  useEffect(() => {
  fetchConnect();
  fetchProfile();
}, [fetchConnect, fetchProfile]);

  useEffect(() => {
    const onFocus = () => fetchConnect();
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onFocus);
    };
  }, [fetchConnect]);

  const goToStripeOnboarding = useCallback(async () => {
    try {
      const r = await fetch('/api/connect/account-link', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_to: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      });

      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.url) {
        const msg = j?.reason || j?.error || 'Onboarding-Link konnte nicht erstellt werden.';
        const extra = [j?.code, j?.mode].filter(Boolean).join(' · ');
        throw new Error(extra ? `${msg} (${extra})` : msg);
      }

      window.location.assign(j.url as string);
    } catch (e: any) {
      toastError(String(e?.message || 'Onboarding-Link konnte nicht erstellt werden.'));
    }
  }, [toastError]);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  useEffect(() => {
  setPhotoIndex(0);
  setLightboxOpen(false);
}, [auftrag.id]);

  // Preisbereich: 2 Felder
  const [gesamtPreis, setGesamtPreis] = useState<string>('');
  const [logistikPreis, setLogistikPreis] = useState<string>('');
  const [preisError, setPreisError] = useState<string | null>(null);

  const username = auftrag.user ?? '';
  const messageTarget = encodeURIComponent(username);

  const reviewsHref = username
    ? `/u/${encodeURIComponent(username)}/reviews`
    : null;

  const ratingValue =
    typeof auftrag.userRatingAvg === 'number' && Number.isFinite(auftrag.userRatingAvg)
      ? auftrag.userRatingAvg
      : 0;

  const ratingCount =
    typeof auftrag.userRatingCount === 'number' && Number.isFinite(auftrag.userRatingCount)
      ? auftrag.userRatingCount
      : 0;

  const slides = auftrag.bilder?.map((src) => ({ src })) || [];

  // Logistik-Bedingung: nur wenn NICHT beides "Selbst..."
  const warenausgabeArtRaw = (auftrag.warenausgabeArt ?? '').trim().toLowerCase();
  const warenannahmeArtRaw = (auftrag.warenannahmeArt ?? '').trim().toLowerCase();

  // ✅ Rohwerte: 'selbst' | 'abholung' | 'anlieferung'
  const selbstAnlieferung = warenausgabeArtRaw === 'selbst';
  const selbstAbholung = warenannahmeArtRaw === 'selbst';

  // ✅ nur wenn beides "selbst" ist, braucht man keinen Logistikpreis
  const brauchtLogistikPreis = !(selbstAnlieferung && selbstAbholung);

  const handleGesamtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreisError(null);
    const sanitized = normalizeMoneyInput(e.target.value, MAX_PRICE_CHARS);
    setGesamtPreis(sanitized);
  };

  const handleLogistikChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreisError(null);
    const sanitized = normalizeMoneyInput(e.target.value, MAX_PRICE_CHARS);
    setLogistikPreis(sanitized);
  };

  const handleGesamtBlur = () => {
    if (!gesamtPreis.trim()) return;
    const n = parseMoneyOrNull(gesamtPreis);
    if (n === null) {
      setPreisError('Bitte gib einen gültigen Gesamtpreis ein.');
      setGesamtPreis('');
      return;
    }
    setGesamtPreis(formatMoney(n));
  };

  const handleLogistikBlur = () => {
    if (!logistikPreis.trim()) return;
    const n = parseMoneyOrNull(logistikPreis);
    if (n === null) {
      setPreisError('Bitte gib einen gültigen Logistikpreis ein.');
      setLogistikPreis('');
      return;
    }
    setLogistikPreis(formatMoney(n));
  };

  const isGesamtPreisValid = (() => {
    if (!gesamtPreis.trim()) return false;

    // mind. 2 Ziffern vor dem Komma/Punkt
    if (!hasMinWholeDigits(gesamtPreis, 1)) return false;

    const n = parseMoneyOrNull(gesamtPreis);
    if (n === null) return false;

    return true;
  })();

  const isLogistikPreisValid = (() => {
    if (!brauchtLogistikPreis) return true; // wenn nicht nötig, einfach ok
    if (!logistikPreis.trim()) return false;

    const n = parseMoneyOrNull(logistikPreis);
    if (n === null) return false;

    return true;
  })();

  const onPreisSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPreisError(null);

    if (offerSent) {
      toastError('Du hast für diesen Auftrag bereits ein Angebot abgegeben.');
      return;
    }

    const artikelCents = toCentsFromMoneyInput(gesamtPreis);
    if (artikelCents === null) {
      setPreisError('Bitte die Gesamtkosten für den Auftrag eingeben.');
      return;
    }

    let versandCents = 0;
    if (brauchtLogistikPreis) {
      const lCents = toCentsFromMoneyInput(logistikPreis);
      if (lCents === null) {
        setPreisError('Bitte einen gültigen Logistikpreis angeben.');
        return;
      }
      versandCents = lCents;
    }

    const gesamtCents = artikelCents + versandCents;

// Profil prüfen: Nur gewerbliche Nutzer dürfen Angebote abgeben
try {
  const profileRes = await fetch('/api/profile', {
    cache: 'no-store',
    credentials: 'include',
  });

  const profileJson = await profileRes.json().catch(() => ({} as any));

  if (!profileRes.ok) {
    toastError('Dein Profil konnte nicht geprüft werden. Bitte erneut anmelden.');
    return;
  }

  const accountType = String(profileJson?.profile?.account_type || '').toLowerCase();

  if (accountType !== 'business') {
    toastError('Nur gewerbliche Nutzer können Angebote abgeben.');
    return;
  }
} catch {
  toastError('Dein Profil konnte nicht geprüft werden.');
  return;
}
// Connect-Ready prüfen (wie bei Lackanfragen)
try {
      const stRes = await fetch('/api/connect/status', { cache: 'no-store', credentials: 'include' });
      const st: ConnectStatus = await stRes.json().catch(() => ({ ready: false } as ConnectStatus));

      if (!stRes.ok) {
        toastError('Dein Anbieter-Status konnte nicht geprüft werden. Bitte erneut versuchen.');
        return;
      }

      if (!st.ready) {
        await goToStripeOnboarding();
        return;
      }
    } catch {
      toastError('Dein Anbieter-Status konnte nicht geprüft werden.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(String(auftrag.id))}/offers`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artikel_cents: artikelCents,
          versand_cents: versandCents,
          gesamt_cents: gesamtCents,
        }),
      });

      const j = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const code = String(j?.error || '');

        if (code === 'already_offered') {
          toastError('Du hast für diesen Auftrag bereits ein Angebot abgegeben.');
          setOfferSent(true);
          return;
        }
        if (code === 'offer_window_closed') {
          toastError('Angebotsfrist vorbei: Angebote nur bis 24h vor Warenausgabe möglich.');
          setOfferSent(true);
          return;
        }
        if (code === 'job_not_open') {
          toastError('Dieser Auftrag ist nicht mehr offen.');
          setOfferSent(true);
          return;
        }
        if (code === 'cannot_offer_on_own_job') {
          toastError('Du kannst kein Angebot für deinen eigenen Auftrag abgeben.');
          setOfferSent(true);
          return;
        }

        if (code === 'only_business_users_can_offer') {
          toastError('Nur gewerbliche Nutzer können Angebote abgeben.');
          return;
        }

        toastError(j?.message || 'Angebot konnte nicht gesendet werden.');
        return;}

        // ✅ ok
        setOfferSent(true); // optional, aber sinnvoll damit clientseitig 2. Versuch sofort Toast gibt
        toastSuccess('Angebot wurde erfolgreich abgegeben.');
      

        // wenn du keinen Success-Toast hast: wir lassen es still oder du machst hier optional ein kleines alert
        // alert('Angebot wurde gesendet.');
      } catch (err: any) {
        toastError(String(err?.message || 'Angebot konnte nicht gesendet werden.'));
      } finally {
        setLoading(false);
      }
    };

  const isSubmitDisabled =
    loading || !!preisError || !isGesamtPreisValid || !isLogistikPreisValid;

  const verfahrenName = auftrag.verfahren.map((v) => v.name).join(' & ');
  const vermittelt = auftrag.published === false;
  const darfAngebotAbgeben =
  profileLoaded &&
  accountType === 'business' &&
  connectLoaded &&
  connect?.ready === true;

const stripeBlockiertAngebot =
  profileLoaded &&
  accountType === 'business' &&
  connectLoaded &&
  connect?.ready === false;

const istPrivaterNutzer =
  profileLoaded &&
  accountType !== 'business';
  const serienauftragAktiv =
  Boolean((auftrag as any).serienauftrag_aktiv) ||
  Boolean((auftrag as any).serienauftrag);

const serienRhythmus =
  (auftrag as any).serien_rhythmus ||
  (auftrag as any).serienauftrag_rhythmus ||
  '';
const serienRhythmusLabel = labelSerienRhythmus(serienRhythmus);
const serienTermine = Array.isArray((auftrag as any).serien_termine)
  ? (auftrag as any).serien_termine
  : [];

  const handleAcceptNda = async () => {
    if (!ndaChecked) {
  toastError('Bitte bestätige zuerst, dass du die Geheimhaltungsvereinbarung gelesen und akzeptiert hast.');
  return;
}
  try {
    setLoading(true);

    const res = await fetch(`/api/jobs/${encodeURIComponent(String(auftrag.id))}/nda/accept`, {
      method: 'POST',
      credentials: 'include',
    });

    const payload = await res.json().catch(() => ({} as any));

    if (!res.ok) {
      if (payload?.error === 'not_authenticated') {
        toastError('Bitte melde dich an, um die Geheimhaltungsvereinbarung zu akzeptieren.');
        return;
      }

      toastError(payload?.error || 'Die Geheimhaltungsvereinbarung konnte nicht akzeptiert werden.');
      return;
    }

    window.location.reload();
  } catch (error: any) {
    toastError(error?.message || 'Die Geheimhaltungsvereinbarung konnte nicht akzeptiert werden.');
  } finally {
    setLoading(false);
  }
};
if ((auftrag as any).ndaLocked) {
  return (
    <>
      <Navbar />

      {loading && <TopLoader />}

    <div className={`${styles.container} ${styles.ndaPageContainer}`}>
    <div className={styles.ndaGate}>
          <h1 className={styles.title}>Geheimhaltungsvereinbarung erforderlich</h1>

          <p className={styles.preserveNewlines}>
            Dieser Auftrag enthält vertrauliche Informationen. Um die vollständige Detailansicht,
            Bilder, Dateien und technischen Angaben zu sehen, musst du zuerst die
            Geheimhaltungsvereinbarung lesen und akzeptieren.
          </p>

          <div className={styles.ndaTextBox}>
            <pre className={styles.ndaLegalText}>{NDA_TEXT}</pre>
          </div>

          <label className={styles.ndaCheckboxRow}>
            <input
              type="checkbox"
              checked={ndaChecked}
              onChange={(e) => setNdaChecked(e.target.checked)}
              disabled={loading}
            />
            <span>
              Ich habe die Geheimhaltungsvereinbarung gelesen und akzeptiere sie verbindlich.
            </span>
          </label>

          <div className={styles.ndaActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleAcceptNda}
              disabled={loading || !ndaChecked}
            >
              Geheimhaltungsvereinbarung akzeptieren
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => router.push('/auftragsboerse')}
              disabled={loading}
            >
              Zurück zur Auftragsbörse
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

  return (
    <>
      <Navbar />

      {loading && <TopLoader />}

      <div className={styles.container}>
      <div className={styles.grid}>
            {/* Bilder */}
            <div className={styles.leftColumn}>
              <div className={styles.imageWrapper}>
                <Image
                  src={auftrag.bilder?.[photoIndex] || '/images/platzhalter.jpg'}
                  alt={verfahrenName}
                  width={500}
                  height={500}
                  className={styles.image}
                  loading="lazy"
                  onClick={() => setLightboxOpen(true)}
                />
              </div>

              <div className={styles.thumbnails}>
                {(auftrag.bilder ?? []).map((bild, i) => (
                  <img
                    key={i}
                    src={bild}
                    alt={`Bild ${i + 1}`}
                    className={`${styles.thumbnail} ${
                      i === photoIndex ? styles.thumbnailActive : ''
                    }`}
                    onClick={() => setPhotoIndex(i)}
                  />
                ))}
              </div>
            </div>

            {/* Rechte Spalte */}
            <div className={styles.rightColumn}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{verfahrenName}</h1>
                <div className={styles.badges}>
                  {auftrag.gesponsert && (
                    <span className={`${styles.badge} ${styles.gesponsert}`}>
                      Gesponsert
                    </span>
                  )}
                  {auftrag.gewerblich && (
                    <span className={`${styles.badge} ${styles.gewerblich}`}>
                      Gewerblich
                    </span>
                  )}
                  {auftrag.privat && (
                    <span className={`${styles.badge} ${styles.privat}`}>
                      Privat
                    </span>
                  )}
                </div>
              </div>

              {/* Meta-Grid: alle allgemeinen Eingaben */}
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Material:</span>
                  <span className={styles.value}>{auftrag.material}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Warenausgabe per:</span>
                  <span className={styles.value}>
                    {labelWarenausgabeArt(auftrag.warenausgabeArt)}
                  </span>
                </div>

                <div className={styles.metaItem1}>
                  <span className={styles.label}>Datum Warenausgabe:</span>
                  <span className={styles.value}>
                    {auftrag.warenausgabeDatum
                      ? auftrag.warenausgabeDatum.toLocaleDateString('de-DE')
                      : '—'}
                  </span>
                  <DeadlineBadge date={auftrag.warenausgabeDatum} />
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.label}>Warenrückgabe per:</span>
                  <span className={styles.value}>
                    {labelWarenrueckgabeArt(auftrag.warenannahmeArt)}
                  </span>
                </div>

                <div className={styles.metaItem1}>
                  <span className={styles.label}>Datum Warenrückgabe:</span>
                  <span className={styles.value}>
                    {auftrag.warenannahmeDatum.toLocaleDateString('de-DE')}
                    <DeadlineBadge date={auftrag.warenannahmeDatum} />
                  </span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.label}>Standort:</span>
                  <span className={styles.value}>{auftrag.standort}</span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.label}>Maße größtes Werkstück:</span>
                  <span className={styles.value}>
                    {auftrag.length} × {auftrag.width} × {auftrag.height} mm
                  </span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.label}>Masse schwerstes Werkstück :</span>
                  <span className={styles.value}>{auftrag.masse} kg</span>
                </div>
                {auftrag.user && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>User:</span>

                    <span className={styles.value}>
                      {reviewsHref ? (
                        <Link href={reviewsHref} className={styles.kontaktLink} title="Zu den Bewertungen">
                          {auftrag.user}
                        </Link>
                      ) : (
                        auftrag.user
                      )}
                    </span>

                    <div className={styles.userRating} style={{ marginTop: 6 }}>
                      {ratingCount > 0 ? (
                        <>
                          Bewertung: {ratingValue.toFixed(1)}/5 · {ratingCount} Bewertung{ratingCount === 1 ? '' : 'en'}
                        </>
                      ) : (
                        <>Bewertung: Noch keine Bewertungen</>
                      )}
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <Link href={`/messages?empfaenger=${messageTarget}`} className={styles.kontaktLink}>
                        User kontaktieren
                      </Link>
                    </div>
                  </div>
                )}                {serienauftragAktiv && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Auftragsrhythmus:</span>
                    <span className={styles.value}>
                      {serienRhythmusLabel || '—'}
                    </span>
                  </div>
                )}
                </div>
                <div>
{serienauftragAktiv && serienTermine.length > 0 && (
  <div className={`${styles.metaItem} ${styles.serienTermineBox}`}>
    <span className={styles.label}>Serientermine:</span>

    <div className={styles.serienTerminListe}>
      {serienTermine.map((termin: any, index: number) => (
        <div key={termin.nr ?? index} className={styles.serienTerminEintrag}>
          <span className={styles.serienTerminNr}>
            {termin.nr ?? index + 1}.
          </span>

          <span className={styles.serienTerminText}>
            Lieferung: {formatSerienDatum(termin.liefer)}
          </span>

          <span className={styles.serienTerminText}>
            Abholung: {formatSerienDatum(termin.abhol)}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
              </div>

                

              {/* Downloads */}
              {auftrag.dateien && auftrag.dateien.length > 0 && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Downloads:</span>
                  <ul className={styles.downloadList}>
                    {auftrag.dateien.map((file, i) => (
                      <li key={i} className={styles.downloadItem}>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.downloadLink}
                        >
                          <FaFilePdf className={styles.fileIcon} />
                          {file.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Beschreibung (aus Formular) */}
              {auftrag.beschreibung && (
                <div className={styles.beschreibung}>
                  <h2>Beschreibung</h2>
                  <p className={styles.preserveNewlines}>{auftrag.beschreibung}</p>
                </div>
              )}

              {/* Dynamische Spezifikationen je Verfahren – NUR wenn es Felder gibt */}
              {auftrag.verfahren.map((v, idx) => {
                const entries = Object.entries(v.felder ?? {});
                if (!entries.length) return null;
                

                return (
                  <div key={idx} className={styles.verfahrenBlock}>
                    <h3 className={styles.verfahrenTitel}>
                      Spezifikationen zum&nbsp;{v.name}
                    </h3>

                    <div className={styles.verfahrenGrid}>
                      {entries.map(([key, val]) => (
                        <div key={key} className={styles.metaItem}>
                          <span className={styles.label}>
                            {key
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^\w/, (c) => c.toUpperCase())}
                            :
                          </span>
                          <span className={styles.value}>
                            {Array.isArray(val) ? val.join(', ') : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Angebotsbereich / Vermittelt-Box */}
{vermittelt ? (
  <div
    className={styles.patchVermittelt}
    role="status"
    aria-live="polite"
    style={{
      display: 'block',
      marginTop: 16,
      padding: '16px 20px',
      border: '3px solid #52c41a',
      background: '#f6ffed',
      color: '#135200',
      fontWeight: 700,
      textAlign: 'center',
      borderRadius: 14,
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,.06)',
    }}
  >
    <strong>Auftrag erfolgreich vermittelt</strong>
  </div>
) : (
  <div className={`${styles.metaItem} ${styles.priceSection}`}>
    <h2 className={styles.priceHeading}>Mach ein Angebot für diesen Auftrag</h2>

    {istPrivaterNutzer && (
      <div className={styles.connectNotice} role="status" aria-live="polite">
        <p>Nur gewerbliche Nutzer können Angebote für Aufträge abgeben.</p>
      </div>
    )}

    {stripeBlockiertAngebot && (
      <div className={styles.connectNotice} role="status" aria-live="polite">
        <p>
          Bevor du ein Angebot abgeben kannst, musst du dein Stripe-Auszahlungskonto vollständig einrichten.
        </p>

        <div className={styles.connectActions}>
          <button
            type="button"
            className={styles.connectBtn}
            onClick={goToStripeOnboarding}
          >
            Jetzt bei Stripe verifizieren
          </button>
        </div>
      </div>
    )}

    {darfAngebotAbgeben && (
      <form id="pricePanel" onSubmit={onPreisSubmit} className={styles.priceForm}>
        <label htmlFor="gesamtpreis" className={styles.label}>
          Gesamtkosten für den Auftrag (inkl. Steuern und Gebühren exkl. Logistik) in €
        </label>

        <div className={styles.priceRow}>
          <input
            id="gesamtpreis"
            type="text"
            inputMode="decimal"
            placeholder="mind. 60 € - z. B. 1450,00 €"
            value={gesamtPreis}
            onChange={handleGesamtChange}
            onBlur={handleGesamtBlur}
            className={`${styles.priceInput} ${preisError ? styles.isInvalid : ''}`}
            autoComplete="off"
            maxLength={MAX_PRICE_CHARS}
            disabled={loading}
          />
        </div>

        {brauchtLogistikPreis && (
          <>
            <label
              htmlFor="logistikpreis"
              className={styles.label}
              style={{ marginTop: '0.75rem' }}
            >
              Logistikkosten (für Transport/Spedition; inkl. Steuern und Gebühren) in €
            </label>

            <div className={styles.priceRow}>
              <input
                id="logistikpreis"
                type="text"
                inputMode="decimal"
                placeholder="mind. 20 € - z. B. 180,00 € "
                value={logistikPreis}
                onChange={handleLogistikChange}
                onBlur={handleLogistikBlur}
                className={`${styles.priceInput} ${preisError ? styles.isInvalid : ''}`}
                autoComplete="off"
                maxLength={MAX_PRICE_CHARS}
                disabled={loading}
              />
            </div>
          </>
        )}

        {preisError ? (
          <div role="alert" className={styles.priceError} aria-live="polite">
            {preisError}
          </div>
        ) : (
          <div className={styles.priceHint}>
            Mit der Angebotsabgabe bestätigst du, alle Kundenanforderungen zum Auftrag vollständig erfüllen zu können und unsere AGB zu akzeptieren.
            Dein Angebot ist 72&nbsp;h oder bis zum Tag der Warenausgabe gültig.
          </div>
        )}

        <div className={styles.priceTotal}>
          Gesamt:{' '}
          {(
            (parseMoneyOrNull(gesamtPreis) ?? 0) +
            (brauchtLogistikPreis ? parseMoneyOrNull(logistikPreis) ?? 0 : 0)
          ).toLocaleString('de-DE', {
            style: 'currency',
            currency: 'EUR',
          })}
        </div>

        <button type="submit" className={styles.buyButton} disabled={isSubmitDisabled}>
          {offerSent ? 'Angebot erfolgreich abgegeben' : loading ? 'Sende…' : 'Angebot abgeben'}
        </button>
      </form>
    )}
  </div>
)}

            </div>
          </div>
        
      </div>
      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={slides}
          index={photoIndex}
          plugins={[Thumbnails]}
          thumbnails={{ vignette: true }}
          on={{ view: ({ index }) => setPhotoIndex(index) }}
        />
      )}
    </>
  );
}

export default function AuftragDetailClient(props: { auftrag: Auftrag }) {
  return (
    <LocalToastProvider>
      <AuftragDetailClientBody {...props} />
    </LocalToastProvider>
  );
}
