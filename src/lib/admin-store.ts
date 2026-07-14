import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
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
  inquiries: Inquiry[];
};

const dataFile = path.join(process.cwd(), "data", "admin-data.json");

const emptyData: AdminData = {
  projects: [],
  careers: [],
  gallery: [],
  inquiries: [],
};

export function makeId(prefix: string, value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  return `${prefix}-${slug || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function readAdminData(): Promise<AdminData> {
  try {
    const raw = await readFile(dataFile, "utf8");
    return { ...emptyData, ...JSON.parse(raw.replace(/^\uFEFF/, "")) };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code !== "ENOENT") {
      throw error;
    }

    await writeAdminData(emptyData);
    return emptyData;
  }
}

export async function writeAdminData(data: AdminData) {
  await mkdir(path.dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
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
