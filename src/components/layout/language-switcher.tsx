"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: Locale) {
    if (newLocale === locale) return;
    // Replace locale prefix in current path
    const segments = pathname.split("/");
    segments[1] = newLocale;
    const newPath = segments.join("/");
    // Persist preference to server
    fetch("/api/auth/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    });
    router.replace(newPath);
  }

  return (
    <div className="flex items-center gap-1">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            l === locale
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {localeNames[l]}
        </button>
      ))}
    </div>
  );
}
