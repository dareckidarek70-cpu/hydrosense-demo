"use client";

import { Check, Leaf, Palette } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useLocale } from "./locale";
import { defaultTheme, readTheme, setTheme, subscribeToTheme } from "@/lib/theme";

const options = [
  { theme: "nature", Icon: Leaf, label: "themeNature" },
  { theme: "graphite", Icon: Palette, label: "themeGraphite" },
] as const;

export function ThemeSwitcher() {
  const { t } = useLocale();
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, () => defaultTheme);

  return (
    <div className="theme-switch" role="group" aria-label={t("theme")}>
      {options.map(({ theme: option, Icon, label }) => (
        <button
          key={option}
          type="button"
          data-theme-option={option}
          aria-label={t(label)}
          aria-pressed={theme === option}
          title={t(label)}
          onClick={() => setTheme(option)}
        >
          <Icon size={18} aria-hidden="true" />
          <Check className="theme-check" size={10} strokeWidth={3} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
