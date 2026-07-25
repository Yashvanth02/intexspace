import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intex Space Solutions Pvt Ltd",
  description:
    "Intex Space Solutions Pvt Ltd provides architectural design, turnkey interiors, MEP, project management and facility maintenance across India.",
};

const legacyScripts = [
  "/js/jquery-3.7.1.min.js",
  "/js/bootstrap.min.js",
  "/js/validator.min.js",
  "/js/jquery.slicknav.js",
  "/js/swiper-bundle.min.js",
  "/js/jquery.waypoints.min.js",
  "/js/jquery.counterup.min.js",
  "/js/jquery.magnific-popup.min.js",
  "/js/SmoothScroll.js",
  "/js/parallaxie.js",
  "/js/gsap.min.js",
  "/js/magiccursor.js",
  "/js/SplitText.min.js",
  "/js/ScrollTrigger.min.js",
  "/js/jquery.mb.YTPlayer.min.js",
  "/js/wow.min.js",
  "/js/function.js",
];

const legacyStyles = [
  "/css/bootstrap.min.css",
  "/css/slicknav.min.css",
  "/css/swiper-bundle.min.css",
  "/css/all.min.css",
  "/css/animate.css",
  "/css/magnific-popup.css",
  "/css/mousecursor.css",
  "/css/custom.css",
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // While the gate is up the only routes rendered are the under-construction
  // page and /admin. The construction page must not load the legacy theme —
  // custom.css would override its background and magiccursor.js would fight
  // its cursor. /admin is styled entirely by AdminDashboard.module.css and
  // uses no bootstrap or legacy classes, so it is unaffected.
  const underConstruction = process.env.SITE_UNDER_CONSTRUCTION === "true";

  return (
    <html lang="en">
      <head>
        <link rel="shortcut icon" type="image/x-icon" href="/images/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Space+Grotesk:wght@300..700&display=swap"
          rel="stylesheet"
        />
        {!underConstruction && (
          <>
            {legacyStyles.map((href) => (
              <link key={href} href={href} rel="stylesheet" media="screen" />
            ))}
            <style
              dangerouslySetInnerHTML={{
                __html:
                  ".preloader{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;}",
              }}
            />
          </>
        )}
      </head>
      <body>
        {children}
        {!underConstruction &&
          legacyScripts.map((src) => (
            <Script key={src} src={src} strategy="afterInteractive" />
          ))}
      </body>
    </html>
  );
}
