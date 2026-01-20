// src/app/kaufen/cancel/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./cancel.module.css";

export default function CancelPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState("Storno wird verarbeitet...");

  useEffect(() => {
    const orderId = sp.get("order") ?? "";
    const articleId = sp.get("article") ?? "";

    if (!orderId || !articleId) {
      setMsg("Fehlende Parameter (order/article).");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/shop/cancel-reservation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orderId }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          console.error("cancel-reservation failed:", j);
          setMsg("Abbruch erkannt – wir leiten dich zurück. (Hinweis: Reservierung konnte evtl. nicht aufgehoben werden.)");
        } else {
          setMsg("Reservierung wird aufgehoben – du wirst zurückgeleitet...");
        }
      } catch (e) {
        console.error(e);
        setMsg("Netzwerkfehler – wir leiten dich zurück...");
      } finally {
        router.replace(`/kaufen/artikel/${articleId}?canceled=1`);
      }
    })();
  }, [router, sp]);

  return (
    <main className={styles.page}>
      <section className={styles.card} role="status" aria-live="polite">
        <div className={styles.iconWrap} aria-hidden="true">
          <div className={styles.icon} />
        </div>

        <h2 className={styles.title}>Checkout abgebrochen</h2>
        <p className={styles.text}>{msg}</p>

        <div className={styles.hint}>
          Falls der Artikel kurzzeitig nicht sichtbar ist: bitte einmal neu laden.
        </div>
      </section>
    </main>
  );
}
