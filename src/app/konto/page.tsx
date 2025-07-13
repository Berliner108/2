// /src/app/konto/page.tsx
import Link from 'next/link';
import { PencilIcon, ShoppingCartIcon, CogIcon, EnvelopeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';  // Heroicons v2

import styles from './konto.module.css';
import Pager from './navbar/pager';

export default function Page() {
  return (
    <>
      <Pager />
      <div className={styles.wrapper}>
        <h2>Mein Konto</h2>
        <div className={styles.kontoContainer}>
          <div className={styles.kontoList}>
            {[ 
              { href: '/konto/angebote', text: 'Angebote', icon: <PencilIcon className="w-6 h-6 text-blue-500 fill-current stroke-current" /> },
              { href: '/konto/auftraege', text: 'Aufträge', icon: <DocumentTextIcon className="w-6 h-6 text-red-500 fill-current stroke-current" /> },
              { href: '/konto/bestellungen', text: 'Bestellungen', icon: <ShoppingCartIcon className="w-6 h-6 text-green-500 fill-current stroke-current" /> },
              { href: '/konto/lackanfragen', text: 'Lackanfragen', icon: <DocumentTextIcon className="w-6 h-6 text-red-500 fill-current stroke-current" /> },
              { href: '/konto/verkaufen', text: 'Verkaufen', icon: <PencilIcon className="w-6 h-6 text-yellow-500 fill-current stroke-current" /> },
              { href: '/konto/einstellungen', text: 'Kontoeinstellungen', icon: <CogIcon className="w-6 h-6 text-purple-500 fill-current stroke-current" /> },
              { href: '/konto/nachrichten', text: 'Nachrichten', icon: <EnvelopeIcon className="w-6 h-6 text-blue-600 fill-current stroke-current" /> }
            ].map((item, index) => (
              <Link key={index} href={item.href} className={styles.kontoItem}>
                <div className={styles.kontoBox}>
                  <div className={styles.kontoIcon}>{item.icon}</div>
                  {item.text}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
