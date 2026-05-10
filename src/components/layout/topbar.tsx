"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, LogOut, Moon, Sun } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
  back?: boolean | string;
  right?: React.ReactNode;
  brand?: boolean;
  className?: string;
}

export function TopBar({
  title,
  back,
  right,
  brand = false,
  className,
}: TopBarProps) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-2 bg-background/95 px-3 pt-safe backdrop-blur",
        className
      )}
    >
      {back ? (
        typeof back === "string" ? (
          <Link
            href={back}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-md text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-md text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )
      ) : null}
      {brand ? (
        <span className="text-base font-extrabold tracking-tight">JPR Farm</span>
      ) : title ? (
        <h1 className="truncate text-base font-semibold">{title}</h1>
      ) : null}
      {right && <div className="ml-auto flex items-center gap-1">{right}</div>}
    </header>
  );
}

interface TopbarShimProps {
  title?: string;
  showBack?: boolean;
}

export function Topbar({ title, showBack }: TopbarShimProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(`/${locale}/login`);
  }

  return (
    <TopBar
      title={title}
      back={showBack ? true : undefined}
      brand={!showBack && !title}
      right={
        <>
          <LanguageSwitcher />
          <button
            type="button"
            onClick={toggleDark}
            className="h-9 w-9 flex items-center justify-center rounded-md bg-secondary text-muted-foreground"
            title={dark ? "Light mode" : "Dark mode"}
            aria-label={dark ? "Light mode" : "Dark mode"}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="h-9 w-9 flex items-center justify-center rounded-md bg-secondary text-muted-foreground"
            title={t("logout")}
            aria-label={t("logout")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </>
      }
    />
  );
}
