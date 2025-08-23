'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './messages.module.css';
import Navbar from '../components/navbar/Navbar'

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
          <Navbar />
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2>Nachrichten</h2>
        <nav>
          <ul>
            <li>
              <Link
                href="/messages/chat1"
                className={pathname === '/messages/chat1' ? styles.activeLink : ''}
              >
                Max Mustermann
              </Link>
            </li>
            <li>
              <Link
                href="/messages/chat2"
                className={pathname === '/messages/chat2' ? styles.activeLink : ''}
              >
                Anna Beispiel
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
    </>
  );
}
