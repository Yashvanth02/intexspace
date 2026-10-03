import "server-only";

import { createHash } from "crypto";
import { readAdminData, normalizeProjectStatus, type AdminData } from "./admin-store";
import { createSupabaseAdmin, hasSupabaseConfig } from "./supabase-server";
import { readPersistentMenu } from "./menu-store";
import { readSiteSettings } from "./site-settings";
import { contentGeneration } from "./content-updates";

const knownTableIds = { projects: new Set<string>(), gallery: new Set<string>(), vlogs: new Set<string>() };

// Preserve imported records that predate the SQL tables. Once an ID is seen
// in a table, that table owns it, including subsequent deletions.
function reconcile<T extends { id: string }>(
  table: keyof typeof knownTableIds, stored: T[], rows: T[], persistedIds: string[] = [],
) {
  const known = knownTableIds[table];
  persistedIds.forEach((id) => known.add(id));
  rows.forEach((row) => known.add(row.id));
  const merged = new Map(stored.filter((row) => !known.has(row.id)).map((row) => [row.id, row]));
  rows.forEach((row) => merged.set(row.id, row));
  return Array.from(merged.values());
}

export async function readContentData(): Promise<AdminData> {
  const [stored, menu] = await Promise.all([readAdminData(), readPersistentMenu()]);
  const data = { ...stored, menu: { ...stored.menu, ...menu } };
  if (hasSupabaseConfig()) {
    const client = createSupabaseAdmin();
    const [projects, gallery, vlogs] = await Promise.all([
      client.from("projects").select("id, title, status, location, client, category, year, summary, description, image_url, updated_at").order("updated_at", { ascending: false }),
      client.from("gallery").select("id, title, image_url, alt, category, uploaded_at").order("uploaded_at", { ascending: false }),
      client.from("vlogs").select("id, title, details, youtube_url, thumbnail_url, created_at").order("created_at", { ascending: false }),
    ]);
    if (!projects.error) {
      data.projects = reconcile("projects", stored.projects, (projects.data ?? []).map((row) => ({
        id: row.id, title: row.title ?? "", status: normalizeProjectStatus(row.status),
        location: row.location ?? "", client: row.client ?? "", category: row.category ?? "",
        year: row.year ?? "", summary: row.summary ?? "", description: row.description ?? "",
        imageUrl: row.image_url ?? "", updatedAt: row.updated_at ?? "",
      })), stored.tableRecordIds?.projects);
    }
    if (!gallery.error) {
      data.gallery = reconcile("gallery", stored.gallery, (gallery.data ?? []).map((row) => ({
        id: row.id, title: row.title ?? "", imageUrl: row.image_url ?? "",
        alt: row.alt ?? "", category: row.category ?? "", uploadedAt: row.uploaded_at ?? "",
      })), stored.tableRecordIds?.gallery);
    }
    if (!vlogs.error) {
      data.vlogs = reconcile("vlogs", stored.vlogs, (vlogs.data ?? []).map((row) => ({
        id: row.id, title: row.title ?? "", details: row.details ?? "",
        youtubeUrl: row.youtube_url ?? "", thumbnailUrl: row.thumbnail_url ?? "", createdAt: row.created_at ?? "",
      })), stored.tableRecordIds?.vlogs);
    }
  }
  data.tableRecordIds = {
    projects: [...new Set([...(stored.tableRecordIds?.projects ?? []), ...knownTableIds.projects])],
    gallery: [...new Set([...(stored.tableRecordIds?.gallery ?? []), ...knownTableIds.gallery])],
    vlogs: [...new Set([...(stored.tableRecordIds?.vlogs ?? []), ...knownTableIds.vlogs])],
  };
  data.projects = data.projects.map((project) => ({ ...project, status: normalizeProjectStatus(project.status) }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  data.gallery.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  data.vlogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return data;
}

export function publicContentRevision(data: AdminData) {
  const { inquiries: _privateInquiries, tableRecordIds: _internalIds, ...content } = data;
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

async function loadSnapshot() {
  const [data, settings] = await Promise.all([readContentData(), readSiteSettings()]);
  const publicRevision = createHash("sha256")
    .update(publicContentRevision(data)).update(JSON.stringify(settings)).digest("hex");
  const adminRevision = createHash("sha256")
    .update(publicRevision).update(JSON.stringify(data.inquiries)).digest("hex");
  return { data, settings, publicRevision, adminRevision };
}

// Coalesce watchers on this server. Writes invalidate immediately; other
// instances and direct database edits are picked up within one second.
let snapshot: { generation: number; expires: number; value: ReturnType<typeof loadSnapshot> } | undefined;

export function readSiteSnapshot() {
  const generation = contentGeneration();
  if (!snapshot || snapshot.generation !== generation || snapshot.expires <= Date.now()) {
    const value = loadSnapshot();
    const entry = { generation, expires: Date.now() + 1000, value };
    snapshot = entry;
    void value.catch(() => { if (snapshot === entry) snapshot = undefined; });
  }
  return snapshot.value;
}
