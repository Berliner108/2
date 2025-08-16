// src/lib/log-login.ts
export async function logLogin(): Promise<void> {
  try {
    await fetch('/api/log-login', { method: 'POST', keepalive: true })
  } catch {
    // bewusst ignorieren – UI/Navi soll nicht scheitern
  }
}
