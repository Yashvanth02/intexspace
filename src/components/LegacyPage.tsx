import type { LegacyPage as LegacyPageContent } from "@/lib/legacy-pages";
import { LegacyInteractions } from "./LegacyInteractions";
import Script from "next/script";

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
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: body }} />
      <LegacyInteractions />
      <Script id="intex-inquiry-form-bridge" strategy="afterInteractive">
        {`
          (function () {
            var form = document.getElementById('contactForm');
            if (!form || form.dataset.inquiryBridge === 'ready') return;
            form.dataset.inquiryBridge = 'ready';
            form.addEventListener('submit', function (event) {
              event.preventDefault();
              var data = Object.fromEntries(new FormData(form).entries());
              var messageBox = document.getElementById('msgSubmit');
              fetch('/api/inquiries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              }).then(function (response) {
                if (!response.ok) throw new Error('Please check the form and try again.');
                form.reset();
                if (messageBox) {
                  messageBox.classList.remove('hidden');
                  messageBox.textContent = 'Thank you. Your message has been sent.';
                }
              }).catch(function (error) {
                if (messageBox) {
                  messageBox.classList.remove('hidden');
                  messageBox.textContent = error.message || 'Unable to send your message.';
                }
              });
            });
          })();
        `}
      </Script>
    </>
  );
}
