"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition, useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

const DEBOUNCE_MS = 200;

interface Props {
  placeholder?: string;
}

export function ListSearch({ placeholder }: Props) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) {
        params.set("q", next);
      } else {
        params.delete("q");
      }
      params.delete("page");
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [router, pathname, searchParams]
  );

  const queueApply = useCallback(
    (next: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => apply(next), DEBOUNCE_MS);
    },
    [apply]
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          queueApply(e.target.value);
        }}
        placeholder={placeholder ?? t("search")}
        className="h-11 w-full rounded-lg bg-secondary pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            if (timerRef.current) clearTimeout(timerRef.current);
            apply("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
          aria-label={t("clearSearch")}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
