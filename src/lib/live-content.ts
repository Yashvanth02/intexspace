"use client";

import { useEffect, useRef } from "react";

const channelName = "intex-content-updated";

export function publishContentChange() {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage("updated");
    channel.close();
  }
  try { localStorage.setItem(channelName, String(Date.now())); } catch { /* Storage may be disabled. */ }
}

export function useContentUpdates({ scope, initialRevision, onChange, enabled = true }: {
  scope: "public" | "admin";
  initialRevision?: string;
  onChange: (maintenanceEnabled?: boolean) => void;
  enabled?: boolean;
}) {
  const callback = useRef(onChange);
  const revision = useRef(initialRevision);
  callback.current = onChange;
  useEffect(() => { if (initialRevision) revision.current = initialRevision; }, [initialRevision]);

  useEffect(() => {
    if (!enabled) return;
    let source: EventSource | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const changed = (maintenanceEnabled?: boolean) => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(maintenanceEnabled), 100);
    };
    const connect = () => {
      if (document.hidden || source) return;
      source = new EventSource(`/api/site/events?scope=${scope}`);
      source.addEventListener("content", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          if (typeof data.revision !== "string" || typeof data.maintenanceEnabled !== "boolean") return;
          const previous = revision.current;
          revision.current = data.revision;
          if (previous !== data.revision) changed(data.maintenanceEnabled);
        } catch { /* A malformed event must not break reconnects. */ }
      });
    };
    const visibility = () => {
      if (document.hidden) { source?.close(); source = undefined; }
      else connect();
    };
    const channel = scope === "public" && typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(channelName) : undefined;
    if (channel) channel.onmessage = () => changed();
    const storage = (event: StorageEvent) => { if (scope === "public" && event.key === channelName) changed(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("storage", storage);
    connect();
    return () => {
      clearTimeout(timer);
      source?.close();
      channel?.close();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("storage", storage);
    };
  }, [scope, enabled]);
}
