'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './navbar.module.css'
import { NAV_ITEMS } from './nav.config'

export default function Navbar() {
  const pathname = usePathname()

  return (
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item, i) => {
            const isActive = pathname?.startsWith(item.href)
            return (
              <li key={i} className={styles.navItem}>
                <Link
                  href={item.href}
                  className={`${styles.navButton} ${isActive ? styles.navButtonActive : ''}`}
                >
                  {item.title}
                </Link>
                <div className={styles.dropdown}>
                  {item.links.map((link, j) => (
                    <Link key={j} href={link.href} className={styles.dropdownLink}>
                      {link.text}
                    </Link>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
