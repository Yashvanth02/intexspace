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
  // Don't double-append .html if slug already ends with .html
  if (slug.endsWith('.html')) {
    return legacyPages[slug];
  }
  return legacyPages[slug] ?? legacyPages[`${slug}.html`];
}

export function generateStaticParams() {
  return legacySlugs.map((slug) => ({
    // Strip .html extension if present to prevent double .html in output
    slug: slug.endsWith('.html') ? slug.slice(0, -5) : slug
  }));
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
