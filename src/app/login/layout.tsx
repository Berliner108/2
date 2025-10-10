// /src/app/login/layout.tsx
export const dynamic = 'force-static' // optional

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  // KEIN Header/Footer – nur ein neutraler, zentrierter Bereich
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'grid',
        placeItems: 'center',
        background: '#0b0c10',
        padding: 16,
      }}
    >
      {children}
    </div>
  )
}
