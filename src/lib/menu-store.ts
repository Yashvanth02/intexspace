import "server-only";

import { createSupabaseAdmin, getSupabaseStorageBucket } from "./supabase-server";

const menuStoragePath = "settings/menu.json";

export type MenuVisibility = Record<string, boolean>;

export async function readPersistentMenu(): Promise<MenuVisibility | null> {
  try {
    const supabaseAdmin = createSupabaseAdmin();
    const { data, error } = await supabaseAdmin.storage.from(getSupabaseStorageBucket()).download(menuStoragePath);
    if (error || !data) return null;

    const parsed = JSON.parse(await data.text()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
    );
  } catch {
    return null;
  }
}

export async function writePersistentMenu(menu: MenuVisibility) {
  const supabaseAdmin = createSupabaseAdmin();
  const { error } = await supabaseAdmin.storage
    .from(getSupabaseStorageBucket())
    .upload(menuStoragePath, JSON.stringify(menu), { contentType: "application/json", upsert: true });

  if (error) {
    throw new Error(error.message || "Failed to save menu settings.");
  }
}
