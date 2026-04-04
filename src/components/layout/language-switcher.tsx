"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: Locale) {
    if (newLocale === locale) return;
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.replace(segments.join("/"));
    fetch("/api/auth/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    });
  }

  return (
    <div className="relative flex items-center">
      <Globe className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <select
        value={locale}
        onChange={(e) => switchLocale(e.target.value as Locale)}
        className="h-9 pl-7 pr-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
