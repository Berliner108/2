// /src/app/konto/page.tsx
import Link from 'next/link';
import { PencilIcon, ShoppingCartIcon, CogIcon, EnvelopeIcon, DocumentTextIcon, ShoppingBagIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';  // Heroicons v2

import styles from './konto.module.css';
import Pager from './navbar/pager';

export default function Page() {
  return (
    <>
      <Pager />
      <div className={styles.wrapper}>
        <h2 className={styles.headline}>Mein Konto</h2>

        <div className={styles.kontoContainer}>
          <div className={styles.kontoList}>
            {[
  {
    href: '/konto/angebote',
    text: 'Auftrags-Angebote',
    sub: 'Übersicht über deine eingeholten und abgegebenen Angebote für Beschichtungsaufträge',
    icon: <PencilIcon className="w-6 h-6 text-blue-500 fill-current stroke-current" />
  },
  {
    href: '/konto/auftraege',
    text: 'Aufträge',
    sub: 'Abgeschlossene und Aufträge die noch gefertigt werden findest du hier',
    icon: <ClipboardDocumentCheckIcon className="w-6 h-6 text-red-500" />
  },
  {
    href: '/konto/bestellungen',
    text: 'Bestellungen',
    sub: 'Deine Einkäufe',
    icon: <ShoppingCartIcon className="w-6 h-6 text-green-500 fill-current stroke-current" />
  },
  {
    href: '/konto/lackanfragen',
    text: 'Lackanfragen',
    sub: 'Übersicht über deine eingeholten und abgegebenen Angebote für Lacke',
    icon: <DocumentTextIcon className="w-6 h-6 text-teal-500" />
  },
  {
    href: '/konto/verkaufen',
    text: 'Verkaufen',
    sub: 'Verwalte deine zum Verkauf stehenden Produkte',
    icon: <ShoppingBagIcon className="w-6 h-6 text-yellow-500" />
  },
  {
    href: '/konto/einstellungen',
    text: 'Kontoeinstellungen',
    sub: 'Hier kannst du Änderungen zu deinem Profil & Sicherheit vornehmen',
    icon: <CogIcon className="w-6 h-6 text-purple-500 fill-current stroke-current" />
  },
  {
    href: '/konto/nachrichten',
    text: 'Nachrichten',
    sub: 'Kontakt & Kommunikation',
    icon: <EnvelopeIcon className="w-6 h-6 text-blue-600 fill-current stroke-current" />
  }
]
.map((item, index) => (
              <Link key={index} href={item.href} className={styles.kontoItem}>
                <div className={styles.kontoBox}>
                <div className={styles.kontoIcon}>{item.icon}</div>
                <div>
                  <div className={styles.kontoTitle}>{item.text}</div>
<div className={styles.kontoSub}>{item.sub}</div>

                </div>
              </div>

              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
