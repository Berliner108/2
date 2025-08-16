import crypto from "node:crypto";

// Akzeptiert alles mit .get(name) -> passt für Request.headers und Next ReadonlyHeaders
type HeaderLike = { get(name: string): string | null | undefined };

export function getClientIp(h: HeaderLike): string {
  const keys = [
    "cf-connecting-ip",
    "x-real-ip",
    "x-vercel-forwarded-for",
    "x-client-ip",
    "x-forwarded-for",
    "forwarded",
  ];
  for (const k of keys) {
    const v = h.get(k);
    if (v) return v.split(",")[0].trim();
  }
  return "0.0.0.0";
}

/** IPv4 → /24, IPv6 → /48 */
export function normalizeIp(ip: string): string {
  if (ip === "::1") return "127.0.0.1";
  if (ip.includes(":")) return ip.split(":").slice(0, 4).join(":") + "::/48";
  const p = ip.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.${p[2]}.0/24` : ip;
}

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT!;
  const norm = normalizeIp(ip);
  return crypto.createHmac("sha256", salt).update(norm).digest("hex").slice(0, 32);
}
