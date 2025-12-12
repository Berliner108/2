// src/lib/types/auftrag.ts

export type Auftrag = {
  id: string; // UUID aus jobs.id

  verfahren: {
    name: string;
    felder: Record<string, any>;
  }[];

  material: string | null;
  length: number;
  width: number;
  height: number;
  masse: string;

  warenausgabeDatum: Date;
  warenannahmeDatum: Date;
  warenausgabeArt: string | null;
  warenannahmeArt: string | null;

  bilder: string[]; // später aus job_files
  dateien: { name: string; url: string }[];

  standort: string | null; // später aus profiles
  gesponsert: boolean;
  gewerblich: boolean;
  privat: boolean;

  beschreibung?: string | null;
  user?: string | null;
};
