import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegacyPage } from "@/components/LegacyPage";
import { getLegacyPage, legacySlugs } from "@/lib/legacy-pages";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateStaticParams() {
  return legacySlugs.map((slug) => ({
    // Strip .html extension if present to prevent double .html in output
    slug: slug.endsWith('.html') ? slug.slice(0, -5) : slug
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLegacyPage(slug);

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
  const page = await getLegacyPage(slug);

  if (!page) {
    notFound();
  }

  return <LegacyPage page={page} />;
}
