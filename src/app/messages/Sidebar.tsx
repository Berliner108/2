import Link from 'next/link';
import styles from './messages.module.css';

const konversationen = [
  { id: '1', name: 'Max Mustermann', letzteNachricht: 'Wie teuer ist das?' },
  { id: '2', name: 'Anna Beispiel', letzteNachricht: 'Wann ist Versand möglich?' },
];

export default function Sidebar({ activeId }: { activeId?: string }) {
  return (
    <nav className={styles.sidebar}>
      <h1>Nachrichten</h1>
      <ul>
        {konversationen.map(({ id, name, letzteNachricht }) => (
          <li key={id} className={id === activeId ? styles.active : undefined}>
            <Link href={`/messages/${id}`} className={styles.link}>
              <strong>{name}</strong><br />
              <small>{letzteNachricht}</small>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
