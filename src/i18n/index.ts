import { en } from "./en";
import { zh } from "./zh";
import type { Lang } from "@/lib/types";

export type T = typeof en;

const translations: Record<Lang, T> = { en, zh };

export function useT(lang: Lang): T {
  return translations[lang];
}
