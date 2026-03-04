import type { Lang } from "@/lib/types";

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export function LanguageToggle({ lang, setLang }: Props) {
  return (
    <div className="lt">
      <button className={`lb ${lang === "en" ? "a" : ""}`} onClick={() => setLang("en")}>EN</button>
      <button className={`lb ${lang === "zh" ? "a" : ""}`} onClick={() => setLang("zh")}>中文</button>
    </div>
  );
}
