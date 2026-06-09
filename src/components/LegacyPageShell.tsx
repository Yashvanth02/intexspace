"use client";

import { useEffect, useState } from "react";
import type { LegacyPage as LegacyPageContent } from "@/lib/legacy-pages";

type LegacyPageShellProps = {
  page: LegacyPageContent;
};

const REVEAL_DELAY = 420;
const FALLBACK_DELAY = 1800;

export function LegacyPageShell({ page }: LegacyPageShellProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let revealTimer: number | undefined;
    let fallbackTimer: number | undefined;
    let frame = 0;
    let cancelled = false;

    setIsReady(false);

    const reveal = () => {
      if (cancelled) {
        return;
      }

      revealTimer = window.setTimeout(() => {
        frame = window.requestAnimationFrame(() => {
          if (!cancelled) {
            setIsReady(true);
          }
        });
      }, REVEAL_DELAY);
    };

    if (document.documentElement.classList.contains("legacy-scripts-ready")) {
      reveal();
    } else {
      window.addEventListener("legacy:scripts-ready", reveal, { once: true });
      fallbackTimer = window.setTimeout(reveal, FALLBACK_DELAY);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("legacy:scripts-ready", reveal);
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
