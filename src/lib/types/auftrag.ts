// src/lib/types/auftrag.ts
export type Auftrag = {
  id: string

  verfahren: { name: string; felder: Record<string, any> }[]

  material: string | null
  length: number
  width: number
  height: number
  masse: string

  warenausgabeDatum: Date
  warenannahmeDatum: Date
  warenausgabeArt: string | null
  warenannahmeArt: string | null

  bilder: string[]
  dateien: { name: string; url: string }[]

  standort: string | null
  gesponsert: boolean
  gewerblich: boolean
  privat: boolean

  beschreibung?: string | null

  // ✅ User + Rating
  user?: string | null
  userRatingAvg?: number | null
  userRatingCount?: number | null
}
