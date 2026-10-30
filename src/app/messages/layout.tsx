'use client'

import Navbar from '../components/navbar/Navbar'
import Sidebar from './Sidebar'
import styles from './messages.module.css'

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />

      <div className={styles.container}>
        <Sidebar />

        <main className={styles.content}>
          {children}
        </main>
      </div>
    </>
  )
}