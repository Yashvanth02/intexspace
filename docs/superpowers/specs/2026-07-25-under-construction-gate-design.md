# Under-Construction Gate — Design

**Date:** 2026-07-25
**Status:** Approved

## Problem

intexspace.com is live but not ready for the public. Visitors should see an
under-construction page. Developers must keep working on the real site without
friction.

## The gate

A single environment variable, `SITE_UNDER_CONSTRUCTION`, controls the gate.

| Where | Value | Result |
|---|---|---|
| Production | `true` | Every visitor sees the construction page |
| localhost | unset | Full real site |
| Preview deployments | unset | Full real site, shareable with the client |
| Launch day | `false` or removed | Gate off, no code change |

`src/middleware.ts` rewrites all matching requests to `/under-construction`
when the flag is on.

**Allowlisted paths** (pass through un-gated):

- `/_next/*`, `/images/*`, `/favicon.ico` — assets the construction page needs.
- `/admin` and `/api/*` — the admin panel is already password-protected, and
  the client keeps loading projects and gallery content into Supabase while the
  public site is dark.

`src/app/layout.tsx` reads the same flag. When on, it skips the eight legacy
stylesheets and seventeen jQuery/GSAP scripts. Without this, `custom.css` would
override the page background and `magiccursor.js` would fight the custom
cursor. It also drops the page to a handful of requests instead of ~25.

## The page — "Blueprint → Reveal"

The thesis: **we turn drawings into spaces.** The screen is a drafting sheet.
The cursor is the one spot where the drawing has already become real.

### Layers, back to front

1. **Sheet** — `#0B0B0B` ground with a fine olive dot-grid on slow parallax
   against pointer position.
2. **Reveal** — a real Intexspace project photograph masked to a soft radial
   circle that follows the cursor. Four photographs cross-fade on an ~8s cycle;
   a caption beside the lens names the project currently showing.
3. **Linework** — an SVG office fit-out plan in `#BDAD7B` that self-draws on
   load via staggered `stroke-dashoffset`. Real drafting vocabulary: wall
   segments broken at door openings, quarter-circle door swings, stair treads
   with a break line, dimension strings with 45° architectural ticks, grid
   bubbles, a north arrow.
4. **HUD** — crosshair reticle ringing the lens with a live `X ___ Y ___`
   readout.
5. **Type** — `INTEXSPACE` in Space Grotesk, letters staggering up on load.
   Sub-line: "We're redrawing our space. Back shortly."

### Signature element

The contact block is drawn as a **title block** — the bordered field in the
corner of every real architectural sheet, with ruled rows for CLIENT, SHEET,
SCALE, REV, and CONTACT. The phone numbers, email, and Chennai address live in
the CONTACT rows. The information a visitor needs is delivered in the
subject's own vernacular rather than as a generic footer.

### Interaction

- Lens follows the pointer with eased interpolation (lerp), not 1:1 — weighted,
  not twitchy.
- Click sends a scan pulse outward across the linework.
- Touch devices: the lens drifts on a slow figure-eight and jumps to taps.
- `prefers-reduced-motion`: plan renders already-drawn, lens parked centre, no
  drift, no parallax.

### Constraints

Zero new dependencies. Pointer position is published to CSS through custom
properties (`--mx`, `--my`) from one rAF-throttled handler; everything else is
CSS animation and `mask-image`. No GSAP, no canvas, no animation library.

## Files

| File | Change |
|---|---|
| `src/middleware.ts` | new — the rewrite gate |
| `src/app/under-construction/page.tsx` | new — server shell, metadata, `noindex` |
| `src/components/UnderConstruction.tsx` | new — client component, the scene |
| `src/components/UnderConstruction.module.css` | new — scoped styles and animation |
| `src/app/layout.tsx` | edit — conditionally skip legacy CSS and JS |
| `.env.example` | new — documents the flag |

## SEO

The construction page carries `noindex, nofollow`. An indexed "under
construction" page can outrank the real site for weeks after launch.

## Out of scope

Email capture, countdown timer, social links. Decided against: the first two
add moving parts for a temporary page, and a countdown looks broken if it
reaches zero before launch.
