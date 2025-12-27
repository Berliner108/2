import React, { Suspense } from 'react'
import Navbar from '../components/navbar/Navbar'
import Verkaufsseite from './VerkaufenClient'
import styles from './verkaufsseite.module.css'

function FancyFallback() {
  return (
    <>
      {/* Fancy Loader / Skeleton (OHNE Navbar!) */}
      <div className={styles.topLoader} aria-hidden>
        <div className={styles.topLoaderInner} />
      </div>

      <div className={styles.container} role="status" aria-live="polite" aria-busy="true">
        <div className={styles.skeletonPage}>
          <div className={styles.skelHeader}>
            <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
            <div className={styles.skelLine} />
          </div>

          <div className={styles.skelBlock} />

          <div className={styles.skelDrop} />
          <div className={styles.skelDropSmall} />

          <div className={styles.skelThreeCols}>
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
          </div>

          <div className={styles.skelGrid}>
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
          </div>

          <div className={styles.skelThreeCols}>
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
          </div>
        </div>
      </div>
    </>
  )
}

export default function Page() {
  return (
    <>
      {/* ✅ Navbar ist IMMER sichtbar */}
      <Navbar />

      {/* ✅ Fancy Loader nur wenn VerkaufenClient noch lädt */}
      <Suspense fallback={<FancyFallback />}>
        <Verkaufsseite />
      </Suspense>
    </>
  )
}
