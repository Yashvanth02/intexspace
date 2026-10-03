import "server-only";

import { revalidatePath } from "next/cache";
import { createSupabaseAdmin, getSupabaseStorageBucket } from "./supabase-server";
import { notifyContentUpdated } from "./content-updates";

export type SiteSettings = {
  maintenanceEnabled: boolean;
  updatedAt: string | null;
};

export const siteSettingsPath = "settings/site-settings.json";

export async function readSiteSettings(): Promise<SiteSettings> {
  const defaults = {
    maintenanceEnabled: process.env.SITE_UNDER_CONSTRUCTION === "true",
    updatedAt: null,
  };
  try {
    const client = createSupabaseAdmin();
    const { data, error } = await client.storage.from(getSupabaseStorageBucket())
      .download(siteSettingsPath, { cacheNonce: String(Date.now()) });
    if (error || !data) return defaults;
    const parsed = JSON.parse(await data.text());
    if (typeof parsed.maintenanceEnabled !== "boolean") return defaults;
    return {
      maintenanceEnabled: parsed.maintenanceEnabled,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return defaults;
  }
}

export async function writeSiteSettings(maintenanceEnabled: boolean): Promise<SiteSettings> {
  const settings = { maintenanceEnabled, updatedAt: new Date().toISOString() };
  const client = createSupabaseAdmin();
  const { error } = await client.storage.from(getSupabaseStorageBucket()).upload(
    siteSettingsPath,
    JSON.stringify(settings),
    { contentType: "application/json", cacheControl: "0", upsert: true },
  );
  if (error) throw new Error("Unable to save maintenance settings. Please try again.");
  revalidatePath("/", "layout");
  notifyContentUpdated();
  return settings;
}
