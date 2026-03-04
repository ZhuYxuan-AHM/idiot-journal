import { en } from "./en";
import { zh } from "./zh";
import type { Lang } from "@/lib/types";

const translations = { en, zh } as const;

export type T = typeof en;

export function useT(lang: Lang): T {
  return translations[lang];
}
