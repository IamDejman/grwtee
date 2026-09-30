export const OCCASIONS = [
  "Concerts",
  "Brunches",
  "Club/Nightlife",
  "Parties",
  "Dinner"
] as const;

export const STYLE_WORDS = [
  "Classic",
  "Minimal",
  "Glamorous",
  "Edgy",
  "Romantic",
  "Streetwear",
  "Relaxed",
  "Bold colour"
] as const;

export type LookCount = 5 | 10;

export interface DecemberEvent {
  day: number; // 1-31, December
  title: string;
}

export interface DecemberBrief {
  name: string;
  email: string;
  country: string; // ISO 3166-1 alpha-2, "" when not chosen
  whatsapp: string; // national or international input, validated per country
  occasions: string[];
  otherOccasion: string;
  looks: LookCount | null;
  events: DecemberEvent[];
  plans: string;
  styleWords: string[];
  styleNotes: string;
  styleLinks: string[];
  consent: boolean;
  comments: string;
  slotStart: string | null; // ISO UTC
}

export const emptyBrief = (country: string): DecemberBrief => ({
  name: "",
  email: "",
  country,
  whatsapp: "",
  occasions: [],
  otherOccasion: "",
  looks: null,
  events: [],
  plans: "",
  styleWords: [],
  styleNotes: "",
  styleLinks: [""],
  consent: false,
  comments: "",
  slotStart: null
});

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
