import { LegacyPageShell } from "@/components/LegacyPageShell";
import type { LegacyPage as LegacyPageContent } from "@/lib/legacy-pages";

type LegacyPageProps = {
  page: LegacyPageContent;
};

export function LegacyPage({ page }: LegacyPageProps) {
  return <LegacyPageShell page={page} />;
}
