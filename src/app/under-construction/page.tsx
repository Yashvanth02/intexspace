import type { Metadata } from "next";
import { UnderConstruction } from "@/components/UnderConstruction";

export const metadata: Metadata = {
  title: "Intexspace Solutions — Back shortly",
  description:
    "Intexspace Solutions Pvt Ltd. Design, interiors, MEP and turnkey project delivery across India. Our site is being rebuilt — call 044 4280 0562 or email admin@intexspace.com.",
  // An indexed placeholder can outrank the real site for weeks after launch.
  robots: { index: false, follow: false },
};

// The root layout decides whether to emit the legacy theme by reading
// SITE_UNDER_CONSTRUCTION. Prerendering would freeze that decision at build
// time, so flipping the flag without a rebuild would serve a construction page
// still carrying custom.css. Rendering per request keeps the two in step.
export const dynamic = "force-dynamic";

export default function UnderConstructionPage() {
  return <UnderConstruction />;
}
