import type { LegacyPage as LegacyPageContent } from "@/lib/legacy-pages";

type LegacyPageProps = {
  page: LegacyPageContent;
};

export function LegacyPage({ page }: LegacyPageProps) {
  return <div dangerouslySetInnerHTML={{ __html: page.body }} />;
}
