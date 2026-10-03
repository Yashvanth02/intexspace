import "server-only";

import { mkdir, readFile, writeFile, rename } from "fs/promises";
import os from "os";
import path from "path";
import { createSupabaseAdmin, getSupabaseStorageBucket, hasSupabaseConfig } from "./supabase-server";
import { notifyContentUpdated } from "./content-updates";
import { revalidatePath } from "next/cache";

export type ProjectStatus = "ongoing" | "completed";
export type InquiryStatus = "new" | "contacted" | "closed";

export type Project = {
  id: string;
  title: string;
  status: ProjectStatus;
  location: string;
  client: string;
  category?: string;
  year?: string;
  summary: string;
  description: string;
  imageUrl: string;
  updatedAt: string;
};

export type CareerOpening = {
  id: string;
  title: string;
  location: string;
  employmentType: string;
  experience: string;
  qualification: string;
  description: string;
  isOpen: boolean;
  updatedAt: string;
};

export type GalleryImage = {
  id: string;
  title: string;
  imageUrl: string;
  alt: string;
  category: string;
  uploadedAt: string;
};

export type Vlog = {
  id: string;
  title: string;
  details: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  createdAt: string;
};

export type TeamMember = {
  id: string;
  name: string;
  designation: string;
  linkedIn?: string;
  instagram?: string;
  facebook?: string;
  x?: string;
  photoUrl: string;
  storagePath?: string;
  updatedAt: string;
};

export type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
};

export type AdminData = {
  projects: Project[];
  careers: CareerOpening[];
  gallery: GalleryImage[];
  vlogs: Vlog[];
  inquiries: Inquiry[];
  team: TeamMember[];
  // menu visibility map: slug -> enabled (true/false)
  menu?: Record<string, boolean>;
  tableRecordIds?: { projects: string[]; gallery: string[]; vlogs: string[] };
};

const dataFile = process.env.ADMIN_DATA_FILE || path.join(process.cwd(), "data", "admin-data.json");
const fallbackDataFile = path.join(os.tmpdir(), "intex-admin-data.json");
const persistentDataPath = "settings/admin-data.json";

const emptyData: AdminData = {
  projects: [],
  careers: [],
  gallery: [],
  vlogs: [],
  inquiries: [],
  team: [],
  menu: {},
};

export function makeId(prefix: string, value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  return `${prefix}-${slug || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readAdminDataFile(filePath: string): Promise<AdminData> {
  const raw = await readFile(filePath, "utf8");
  return { ...emptyData, ...JSON.parse(raw.replace(/^\uFEFF/, "")) } as AdminData;
}

async function writeAdminDataFile(filePath: string, data: AdminData) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

async function readFallbackAdminData(): Promise<AdminData> {
  try {
    return await readAdminDataFile(fallbackDataFile);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw error;
    }

    await writeAdminDataFile(fallbackDataFile, emptyData);
    return emptyData;
  }
}

async function readPersistentAdminData(): Promise<AdminData | null> {
  try {
    const client = createSupabaseAdmin();
    const { data, error } = await client.storage.from(getSupabaseStorageBucket())
      .download(persistentDataPath, { cacheNonce: String(Date.now()) });
    if (error || !data) return null;
    const parsed = JSON.parse(await data.text()) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? ({ ...emptyData, ...parsed } as AdminData)
      : null;
  } catch {
    return null;
  }
}

async function writePersistentAdminData(data: AdminData) {
  const client = createSupabaseAdmin();
  const { error } = await client.storage
    .from(getSupabaseStorageBucket())
    .upload(persistentDataPath, JSON.stringify(data), { contentType: "application/json", cacheControl: "0", upsert: true });
  if (error) throw new Error(error.message || "Failed to persist admin data.");
}

export async function readAdminData(): Promise<AdminData> {
  const persistentData = await readPersistentAdminData();
  if (persistentData) return persistentData;

  try {
    return await readAdminDataFile(dataFile);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code !== "ENOENT" && code !== "EACCES" && code !== "EPERM" && code !== "ENOTDIR") {
      throw error;
    }

    return await readFallbackAdminData();
  }
}

export async function writeAdminData(data: AdminData) {
  const persistent = hasSupabaseConfig();
  if (persistent) {
    await writePersistentAdminData(data);
  }

  try {
    await writeAdminDataFile(dataFile, data);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (!persistent && code !== "EACCES" && code !== "EPERM" && code !== "ENOTDIR" && code !== "EROFS") {
      throw error;
    }
    if (!persistent) await writeAdminDataFile(fallbackDataFile, data);
  }
  revalidatePath("/", "layout");
  notifyContentUpdated();
}

let pendingUpdate: Promise<unknown> = Promise.resolve();

export function updateAdminData(updater: (data: AdminData) => AdminData | Promise<AdminData>) {
  const update = pendingUpdate.then(async () => {
    const { readContentData } = await import("./content-store");
    const current = await readContentData();
    const next = await updater(current);
    for (const collection of [next.projects, next.gallery, next.vlogs, next.careers, next.team, next.inquiries]) {
      const seen = new Set<string>();
      for (let index = 0; index < collection.length;) {
        if (seen.has(collection[index].id)) collection.splice(index, 1);
        else { seen.add(collection[index].id); index += 1; }
      }
    }
    await writeAdminData(next);
    return next;
  });
  pendingUpdate = update.catch(() => undefined);
  return update;
}

export function nowIso() {
  return new Date().toISOString();
}

/** Keeps legacy values visible while limiting new project records to two states. */
export function normalizeProjectStatus(value: unknown): ProjectStatus {
  return String(value).trim().toLowerCase() === "completed" ? "completed" : "ongoing";
}
