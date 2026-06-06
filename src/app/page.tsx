import type { Metadata } from "next";
import { LegacyPage } from "@/components/LegacyPage";
import { legacyPages } from "@/lib/legacy-pages";

const page = legacyPages["index.html"];

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
};

export default function Home() {
  return <LegacyPage page={page} />;
}
