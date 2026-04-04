"use client";

import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import { LogOut, ArrowLeft } from "lucide-react";
import Image from "next/image";

interface TopbarProps {
  title?: string;
  showBack?: boolean;
}

export function Topbar({ title, showBack }: TopbarProps) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(`/${locale}/login`);
  }

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60 shadow-sm">
      <div className="flex items-center h-14 px-3 gap-2">

        {/* Left: back button or logo mark */}
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 h-9 pl-2 pr-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm shrink-0 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
            {tCommon("back")}
          </button>
        ) : (
          <div className="shrink-0">
            <Image
              src="/app-logo.png"
              alt="JPR"
              width={32}
              height={32}
              className="rounded-lg"
              priority
            />
          </div>
        )}

        {/* Title */}
        {title && (
          <h1 className="font-bold text-foreground flex-1 truncate text-[15px] px-1">
            {title}
          </h1>
        )}

        {/* Right: language switcher + logout */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all"
            title={t("logout")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
