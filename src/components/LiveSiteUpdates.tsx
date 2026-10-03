"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useContentUpdates } from "@/lib/live-content";

export function LiveSiteUpdates({ revision, maintenanceEnabled }: { revision: string; maintenanceEnabled: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const draft = useRef<Array<{ name: string; value: string; checked?: boolean }>>([]);
  const documentMaintenance = useRef(maintenanceEnabled);
  const isAdmin = pathname === "/admin" || pathname?.startsWith("/admin/");

  useEffect(() => {
    if (!isAdmin && maintenanceEnabled !== documentMaintenance.current) window.location.reload();
  }, [isAdmin, maintenanceEnabled]);

  useContentUpdates({
    scope: "public", initialRevision: revision, enabled: !isAdmin,
    onChange: (maintenance) => {
      if (typeof maintenance === "boolean" && maintenance !== documentMaintenance.current) {
        // A new document loads the appropriate theme and legacy script bundle.
        window.location.reload();
        return;
      }
      draft.current = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("#contactForm input, #contactForm textarea, #contactForm select"))
        .filter((field) => field.name && !["password", "file"].includes(field.type))
        .map((field) => ({ name: field.name, value: field.value, checked: field instanceof HTMLInputElement ? field.checked : undefined }));
      router.refresh();
    },
  });

  useEffect(() => {
    for (const saved of draft.current) {
      const field = (document.getElementById("contactForm") as HTMLFormElement | null)?.elements.namedItem(saved.name);
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
        field.value = saved.value;
        if (field instanceof HTMLInputElement && saved.checked !== undefined) field.checked = saved.checked;
      }
    }
    draft.current = [];
  }, [revision]);
  return null;
}
