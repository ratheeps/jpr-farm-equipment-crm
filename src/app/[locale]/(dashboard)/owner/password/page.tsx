"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/topbar";
import { changePassword } from "@/lib/actions/auth";

export default function ChangePasswordPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputClass =
    "w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
      });

      if (result.error) {
        // Map server error keys to translation keys
        if (result.error === "passwordTooShort") {
          setError(t("passwordTooShort"));
        } else if (result.error === "currentPasswordIncorrect") {
          setError(t("currentPasswordIncorrect"));
        } else {
          setError(result.error);
        }
      } else {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Topbar title={t("changePassword")} showBack />
      <div className="p-4 max-w-sm mx-auto mt-2">
        {success ? (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center text-primary font-medium text-sm">
            {t("passwordChanged")}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="current"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                {t("currentPassword")}
              </label>
              <input
                id="current"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label
                htmlFor="new"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                {t("newPassword")}
              </label>
              <input
                id="new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                required
                minLength={6}
              />
            </div>
            <div>
              <label
                htmlFor="confirm"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                {t("confirmPassword")}
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                required
                minLength={6}
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
              {loading ? tCommon("loading") : tCommon("save")}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
