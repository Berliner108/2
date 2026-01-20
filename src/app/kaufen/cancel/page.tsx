// src/app/kaufen/cancel/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

        // auch wenn’s fehlschlägt, wollen wir nicht hängen bleiben
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          console.error("cancel-reservation failed:", j);
        }
      } catch (e) {
        console.error(e);
      } finally {
        // zurück zum Artikel (UI zeigt wieder published=true)
        router.replace(`/kaufen/artikel/${articleId}?canceled=1`);
      }
    })();
  }, [router, sp]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Checkout abgebrochen</h2>
      <p>{msg}</p>
    </div>
  );
}
