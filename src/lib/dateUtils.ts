// lib/dateUtils.ts

/** Heutiges Datum ohne Zeitanteil (lokal) */
export function todayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Date -> YYYY-MM-DD (lokal) */
export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Neue Instanz mit +n Tagen */
export function addDays(d: Date, n: number): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  c.setDate(c.getDate() + n);
  return c;
}

/** Samstag/Sonntag? */
export function isWeekend(d: Date): boolean {
  const dow = d.getDay(); // 0 So, 6 Sa
  return dow === 0 || dow === 6;
}

/** Ostersonntag (Meeus/Jones/Butcher) */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Nur Feiertage, die in **Deutschland UND Österreich bundesweit** gemeinsam sind.
 * -> Neujahr, Tag der Arbeit, 25./26. Dez, + bewegliche: Ostermontag, Christi Himmelfahrt, Pfingstmontag.
 */
export function gemeinsameFeiertageDEAT(year: number): Set<string> {
  const set = new Set<string>();
  // Fix:
  set.add(`${year}-01-01`);
  set.add(`${year}-05-01`);
  set.add(`${year}-12-25`);
  set.add(`${year}-12-26`);
  // Beweglich:
  const easter = easterSunday(year);
  const easterMonday = addDays(easter, 1);
  const ascension = addDays(easter, 39);
  const whitMonday = addDays(easter, 50);
  set.add(toYMD(easterMonday));
  set.add(toYMD(ascension));
  set.add(toYMD(whitMonday));
  return set;
}
