"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    intexInitializeLegacy?: () => void;
    intexCleanupLegacy?: () => void;
  }
}

export function LegacyRuntime() {
  useEffect(() => {
    let ready = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const initialize = () => {
      if (ready || !window.intexInitializeLegacy) return;
      ready = true;
      clearInterval(timer);
      window.intexInitializeLegacy();
    };
    initialize();
    if (!ready) timer = setInterval(initialize, 50);
    return () => {
      clearInterval(timer);
      if (ready) window.intexCleanupLegacy?.();
    };
  }, []);
  return null;
}
