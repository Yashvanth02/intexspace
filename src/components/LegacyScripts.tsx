"use client";

import { useEffect } from "react";

let loading: Promise<void> | undefined;

export function LegacyScripts({ sources }: { sources: string[] }) {
  useEffect(() => {
    loading ??= sources.reduce<Promise<void>>((previous, src) => previous.then(() => new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    })), Promise.resolve());
    void loading.catch((error) => console.error(error));
  }, [sources]);
  return null;
}
