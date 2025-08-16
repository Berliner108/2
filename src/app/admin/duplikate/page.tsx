export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/supabase-admin";

type Row = { ip_hash: string; user_id: string; created_at: string };

export default async function DuplikatePage() {
  const admin = supabaseAdmin();

  // Rohdaten holen (klein halten, bei Bedarf Limit erhöhen)
  const { data, error } = await admin
    .from("user_ip_hashes")
    .select("ip_hash,user_id,created_at")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) return <div className="p-6">DB-Fehler: {error.message}</div>;
  const rows = (data ?? []) as Row[];

  // Gruppieren nach Hash
  const groups = new Map<string, { users: Set<string>; last: string }>();
  for (const r of rows) {
    const g = groups.get(r.ip_hash) ?? { users: new Set<string>(), last: r.created_at };
    g.users.add(r.user_id);
    if (new Date(r.created_at) > new Date(g.last)) g.last = r.created_at;
    groups.set(r.ip_hash, g);
  }

  // Nur echte Duplikate (>=2 Nutzer)
  const items = Array.from(groups.entries())
    .map(([ip_hash, g]) => ({ ip_hash, count: g.users.size, last: g.last, userIds: Array.from(g.users) }))
    .filter(x => x.count >= 2)
    .sort((a,b) => b.count - a.count || +new Date(b.last) - +new Date(a.last));

  // Optional: Usernames nachladen
  const allUserIds = items.flatMap(i => i.userIds);
  const { data: profs } = allUserIds.length
    ? await admin.from("profiles").select("id,username").in("id", allUserIds)
    : { data: [] as any[] };
  const nameById = new Map<string, string>((profs ?? []).map(p => [p.id, p.username ?? p.id]));

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Duplikate nach IP-Hash</h1>
      <p className="text-sm text-gray-500">Gruppiert (IPv4 /24, IPv6 /48). Nur Hash – keine Klartext-IP.</p>

      <table className="w-full text-sm border-separate border-spacing-y-1">
        <thead>
          <tr className="text-left">
            <th>IP-Hash</th>
            <th>Anzahl Nutzer</th>
            <th>Zuletzt gesehen</th>
            <th>Nutzer</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.ip_hash} className="bg-white/50 hover:bg-white/70">
              <td className="font-mono">{item.ip_hash.slice(0, 12)}…</td>
              <td>{item.count}</td>
              <td>{new Date(item.last).toLocaleString()}</td>
              <td className="max-w-[520px]">
                <div className="flex flex-wrap gap-2">
                  {item.userIds.map(id => (
                    <span key={id} className="px-2 py-1 rounded bg-gray-200">
                      {nameById.get(id) ?? id}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={4} className="py-8 text-center text-gray-500">Keine Duplikate gefunden.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
