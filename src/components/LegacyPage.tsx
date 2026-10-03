import type { LegacyPage as LegacyPageContent } from "@/lib/legacy-pages";
import { LegacyInteractions } from "./LegacyInteractions";
import { LegacyRuntime } from "./LegacyRuntime";

type LegacyPageProps = {
  page: LegacyPageContent;
};

export function LegacyPage({ page }: LegacyPageProps) {
  // Legacy HTML can contain browser-normalized whitespace or imperfect markup.
  // Keep the adjacent admin link in this same isolated container so it cannot
  // become a separately hydrated sibling and trigger a mismatch.
  const bodyWithLogo = page.body.replace(
    /<img\s+src="images\/logo\.svg"\s+alt="([^"]*)">/g,
    (_match, alt) =>
      `<span class="brand-symbol" aria-hidden="true"><img src="/images/intex-symbol.png" alt=""></span><img src="images/logo.svg" alt="${alt}">`,
  );
  const body = `${bodyWithLogo}<div class="admin-access-bar"><a href="/admin">Admin Access</a></div>`;

  return (
    <>
      <div key={page.revision} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: body }} />
      <LegacyInteractions key={`interactions-${page.revision}`} />
      <LegacyRuntime key={`runtime-${page.revision}`} />
    </>
  );
}
