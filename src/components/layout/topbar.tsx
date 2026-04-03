"use client";

import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import { LogOut } from "lucide-react";

interface TopbarProps {
  title?: string;
  showBack?: boolean;
}

export function Topbar({ title, showBack }: TopbarProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(`/${locale}/login`);
  }

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center h-14 px-4 gap-3">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-muted-foreground touch-target flex items-center justify-center"
          >
            ←
          </button>
        )}
        {title && (
          <h1 className="font-semibold text-foreground flex-1 truncate">
            {title}
          </h1>
        )}
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-foreground touch-target flex items-center justify-center"
            title={t("logout")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
