import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegacyPage } from "@/components/LegacyPage";
import { legacyPages, legacySlugs } from "@/lib/legacy-pages";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getLegacyPage(slug: string) {
  return legacyPages[slug] ?? legacyPages[`${slug}.html`];
}

export function generateStaticParams() {
  return legacySlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getLegacyPage(slug);

  if (!page) {
    return {};
  }

  return {
    title: page.title,
    description: page.description,
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = getLegacyPage(slug);

  if (!page) {
    notFound();
  }

  return <LegacyPage page={page} />;
}
