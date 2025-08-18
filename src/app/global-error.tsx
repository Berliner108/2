// src/app/global-error.tsx
'use client'

import React from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ padding: 24, fontFamily: 'system-ui' }}>
        <h1>Unerwarteter Fehler</h1>
        <p>Etwas ist schiefgelaufen. Du kannst es noch einmal versuchen.</p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            background: '#111',
            color: '#0f0',
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
            maxWidth: 900,
            overflow: 'auto',
          }}
        >
{String(error?.message || error)}
{error?.digest ? `\n\ndigest: ${error.digest}` : ''}
        </pre>
        <button
          onClick={() => reset()}
          style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc' }}
        >
          Nochmal laden
        </button>
      </body>
    </html>
  )
}
