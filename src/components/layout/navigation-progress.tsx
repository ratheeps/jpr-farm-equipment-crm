"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);

  // When pathname changes, navigation has completed — finish the bar
  useEffect(() => {
    if (!startedRef.current) return;
    startedRef.current = false;

    if (intervalRef.current) clearInterval(intervalRef.current);
    setWidth(100);

    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 350);
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external, anchor, mailto, tel links
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      )
        return;

      // Ignore same-page navigation
      const currentPath = window.location.pathname;
      const targetPath = href.split("?")[0].split("#")[0];
      if (targetPath === currentPath) return;

      // Clear any running timers
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

      startedRef.current = true;
      setVisible(true);
      setWidth(12);

      // Simulate incremental progress up to ~85%
      let current = 12;
      intervalRef.current = setInterval(() => {
        current = Math.min(current + Math.random() * 12 + 3, 85);
        setWidth(current);
      }, 350);
    };

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed left-0 top-0 z-[9999] h-[3px] bg-primary shadow-[0_0_8px_0px] shadow-primary transition-[width] duration-300 ease-out"
      style={{ width: `${width}%` }}
    />
  );
}
