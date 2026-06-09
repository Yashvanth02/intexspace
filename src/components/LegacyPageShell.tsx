"use client";

import { useEffect, useState } from "react";
import type { LegacyPage as LegacyPageContent } from "@/lib/legacy-pages";

type LegacyPageShellProps = {
  page: LegacyPageContent;
};

const REVEAL_DELAY = 350;
const FALLBACK_DELAY = 1100;

export function LegacyPageShell({ page }: LegacyPageShellProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let revealTimer: number | undefined;
    let fallbackTimer: number | undefined;
    let frame = 0;
    let cancelled = false;

    setIsReady(false);

    const reveal = (delay = REVEAL_DELAY) => {
      if (cancelled) {
        return;
      }

      revealTimer = window.setTimeout(() => {
        frame = window.requestAnimationFrame(() => {
          if (!cancelled) {
            setIsReady(true);
          }
        });
      }, delay);
    };

    if (document.documentElement.classList.contains("legacy-scripts-ready")) {
      reveal();
    } else {
      const revealFromScript = () => reveal();
      window.addEventListener("legacy:scripts-ready", revealFromScript, { once: true });
      fallbackTimer = window.setTimeout(() => reveal(0), FALLBACK_DELAY);

      return () => {
        cancelled = true;
        window.removeEventListener("legacy:scripts-ready", revealFromScript);
        window.clearTimeout(revealTimer);
        window.clearTimeout(fallbackTimer);
        window.cancelAnimationFrame(frame);
      };
    }

    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
      window.clearTimeout(fallbackTimer);
      window.cancelAnimationFrame(frame);
    };
  }, [page.body]);

  return (
    <div className={`legacy-page-shell ${isReady ? "is-ready" : ""}`}>
      <div className="legacy-loading-screen" aria-hidden={isReady}>
        <div className="loading-container">
          <div className="loading" />
          <img id="loading-icon" src="/images/loader.svg" alt="" />
        </div>
      </div>
      <div
        className="legacy-page-content"
        dangerouslySetInnerHTML={{ __html: page.body }}
      />
    </div>
  );
}
