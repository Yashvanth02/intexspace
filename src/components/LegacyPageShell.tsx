import type { LegacyPage as LegacyPageContent } from "@/lib/legacy-pages";

type LegacyPageShellProps = {
  page: LegacyPageContent;
};

export function LegacyPageShell({ page }: LegacyPageShellProps) {
  return (
    <div className="legacy-page-shell">
      <div
        className="legacy-page-content"
        dangerouslySetInnerHTML={{ __html: page.body }}
      />
    </div>
  );
}
