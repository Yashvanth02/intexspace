import type { Metadata } from "next";
import { LegacyPage } from "@/components/LegacyPage";
import { getLegacyPage } from "@/lib/legacy-pages";

export const metadata: Metadata = {
  title: "Intexspace Solutions Pvt Ltd - Architecture, Interiors & Turnkey Projects",
  description:
    "Intexspace Solutions Pvt Ltd provides architectural design, turnkey interiors, MEP, project management and facility maintenance across India.",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const page = await getLegacyPage("index.html");

  if (!page) {
    return null;
  }

  return <LegacyPage page={page} />;
}
