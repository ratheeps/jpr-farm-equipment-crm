"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { Smartphone, Share, X } from "lucide-react";

const DISMISSED_KEY = "install-prompt:dismissedAt";
const SESSION_COUNT_KEY = "install-prompt:sessionCount";
const SYNC_SUCCESS_KEY = "install-prompt:syncSucceeded";
const COOLDOWN_MS = 7 * 24 * 3600 * 1000;

// Trigger gates per spec §8: prompt only after the second session OR
// after the first successful sync. Cooldown applies on top.
export function recordSession(): void {
  if (typeof window === "undefined") return;
  const prev = Number(window.localStorage.getItem(SESSION_COUNT_KEY) ?? "0");
  window.localStorage.setItem(
    SESSION_COUNT_KEY,
    String(Number.isFinite(prev) ? prev + 1 : 1)
  );
}

export function recordSyncSuccess(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SYNC_SUCCESS_KEY, "1");
}

export function canPromptInstall(): boolean {
  if (typeof window === "undefined") return false;
  // Cooldown beats every other condition.
  const dismissed = window.localStorage.getItem(DISMISSED_KEY);
  if (dismissed) {
    const ts = Number(dismissed);
    if (Number.isFinite(ts) && Date.now() - ts <= COOLDOWN_MS) return false;
  }
  const sessions = Number(window.localStorage.getItem(SESSION_COUNT_KEY) ?? "0");
  const synced = window.localStorage.getItem(SYNC_SUCCESS_KEY) === "1";
  return sessions >= 2 || synced;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [open, setOpen] = React.useState(false);
  const [event, setEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [iosFallback, setIosFallback] = React.useState(false);

  React.useEffect(() => {
    if (!canPromptInstall()) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setOpen(true);
    }

    const isIOSStandalone =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches;
    const isIOSSafari =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

    if (isIOSSafari && !isIOSStandalone) {
      setIosFallback(true);
      setOpen(true);
    } else {
      window.addEventListener("beforeinstallprompt", onBeforeInstall);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setOpen(false);
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    dismiss();
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 rounded-t-2xl bg-card pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-sheet">
          <div className="mx-auto mt-2 mb-3 h-1.5 w-10 rounded-full bg-muted" />
          <div className="flex items-start gap-3 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <Drawer.Title className="text-base font-semibold">
                Install JPR Farm
              </Drawer.Title>
              <Drawer.Description className="mt-1 text-sm text-muted-foreground">
                {iosFallback
                  ? "Tap the Share icon, then choose Add to Home Screen."
                  : "Works offline. Faster to open than a browser tab."}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="rounded-md p-1 text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {iosFallback ? (
            <div className="mt-4 px-4">
              <div className="rounded-lg bg-secondary px-3 py-3 text-sm">
                <Share className="mr-2 inline h-4 w-4 text-foreground" />
                Share → Add to Home Screen
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="mt-3 h-12 w-full rounded-lg bg-secondary text-sm font-semibold"
              >
                Got it
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 px-4">
              <button
                type="button"
                onClick={dismiss}
                className="h-12 rounded-lg bg-secondary text-sm font-semibold"
              >
                Later
              </button>
              <button
                type="button"
                onClick={install}
                className="h-12 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
              >
                Install
              </button>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
