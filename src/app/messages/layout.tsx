'use client'

import { usePathname } from 'next/navigation'

import Navbar from '../components/navbar/Navbar'
import Sidebar from './Sidebar'
import ChatRealtimeBridge from './ChatRealtimeBridge'
import styles from './messages.module.css'

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isMessagesRoot =
    pathname === '/messages'

  return (
    <>
      <Navbar />

      <ChatRealtimeBridge />

      <div
        className={`${styles.container} ${
          isMessagesRoot
            ? styles.messagesRoot
            : styles.messagesDetail
        }`}
      >
        <Sidebar />

        <main className={styles.content}>
          {children}
        </main>
      </div>
    </>
  )
}