import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";

export type ProjectStatus = "ongoing" | "in-progress" | "completed" | "on-hold";
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
};

const dataFile = path.join(process.cwd(), "data", "admin-data.json");
const fallbackDataFile = path.join(os.tmpdir(), "intex-admin-data.json");

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
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
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

export async function readAdminData(): Promise<AdminData> {
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
  try {
    await writeAdminDataFile(dataFile, data);
    return;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EACCES" && code !== "EPERM" && code !== "ENOTDIR") {
      throw error;
    }

    await writeAdminDataFile(fallbackDataFile, data);
  }
}

export async function updateAdminData(updater: (data: AdminData) => AdminData | Promise<AdminData>) {
  const current = await readAdminData();
  const next = await updater(current);
  await writeAdminData(next);
  return next;
}

export function nowIso() {
  return new Date().toISOString();
}
