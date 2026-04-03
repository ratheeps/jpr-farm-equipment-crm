"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t("invalidCredentials"));
        return;
      }
      const { role, preferredLocale } = data;
      const targetLocale = preferredLocale ?? locale;
      const dashboard =
        role === "super_admin"
          ? "owner"
          : role === "admin"
            ? "admin"
            : role === "auditor"
              ? "auditor"
              : "operator";
      router.replace(`/${targetLocale}/${dashboard}`);
    } catch {
      setError(t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">JPR</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("loginTitle")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("loginSubtitle")}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              {t("phone")}
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
              required
            />
          </div>

          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-lg text-base transition-opacity disabled:opacity-60 active:scale-95"
          >
            {loading ? t("loggingIn") : t("login")}
          </button>
        </form>
      </div>
    </div>
  );
}
