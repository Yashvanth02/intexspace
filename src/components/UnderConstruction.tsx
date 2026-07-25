"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./UnderConstruction.module.css";

/**
 * An office fit-out plan drawn in real drafting vocabulary: wall runs broken at
 * door openings, quarter-circle swings, a stair with tread lines, dimension
 * strings with 45-degree ticks, grid bubbles. Each entry self-draws in order.
 */
const ENVELOPE = [
  "M 200 200 L 1400 200",
  "M 1400 200 L 1400 800",
  "M 1400 800 L 460 800",
  "M 360 800 L 200 800",
  "M 200 800 L 200 200",
];

const PARTITIONS = [
  "M 640 200 L 640 380",
  "M 640 460 L 640 800",
  "M 1080 200 L 1080 300",
  "M 1080 380 L 1080 620",
  "M 1080 700 L 1080 800",
  "M 200 540 L 360 540",
  "M 440 540 L 640 540",
  "M 1080 500 L 1400 500",
];

const DOORS = [
  "M 640 460 L 560 460 A 80 80 0 0 1 640 380",
  "M 1080 380 L 1000 380 A 80 80 0 0 1 1080 300",
  "M 1080 620 L 1000 620 A 80 80 0 0 0 1080 700",
  "M 360 540 L 360 460 A 80 80 0 0 1 440 540",
  "M 360 800 L 360 700 A 100 100 0 0 1 460 800",
];

const STAIR = [
  "M 250 580 L 590 580 L 590 740 L 250 740 Z",
  ...[292, 335, 377, 420, 462, 505, 547].map((x) => `M ${x} 580 L ${x} 740`),
  "M 268 660 L 572 660",
  "M 552 646 L 572 660 L 552 674",
];

const DIMENSIONS = [
  // Horizontal string below the plan.
  "M 200 880 L 1400 880",
  ...[200, 640, 1080, 1400].map((x) => `M ${x - 10} 890 L ${x + 10} 870`),
  ...[200, 640, 1080, 1400].map((x) => `M ${x} 812 L ${x} 896`),
  // Vertical string to the left.
  "M 110 200 L 110 800",
  "M 100 210 L 120 190",
  "M 100 810 L 120 790",
  "M 188 200 L 104 200",
  "M 188 800 L 104 800",
];

const GRID_LINES = [200, 640, 1080, 1400].map((x) => `M ${x} 176 L ${x} 196`);

const NORTH = [
  "M 1500 216 L 1513 268 L 1500 257 L 1487 268 Z",
];

/** Real projects, revealed one at a time beneath the drawing. */
const PROJECTS = [
  { src: "/images/project-cruise-terminal.jpg", label: "Cruise Terminal" },
  { src: "/images/project-nbcc-vizag.jpg", label: "NBCC Vizag" },
  { src: "/images/project-seafarers-club.jpg", label: "Seafarers Club" },
  { src: "/images/project-bungalow-chennai.jpg", label: "Bungalow, Chennai" },
];

const ROOMS = [
  { x: 420, y: 348, name: "Reception", area: "42 sqm" },
  { x: 860, y: 462, name: "Workspace", area: "68 sqm" },
  { x: 1240, y: 328, name: "Meeting", area: "31 sqm" },
  { x: 1240, y: 632, name: "Pantry", area: "29 sqm" },
];

const GRID_LABELS = [
  { x: 200, label: "A" },
  { x: 640, label: "B" },
  { x: 1080, label: "C" },
  { x: 1400, label: "D" },
];

const DIM_LABELS = [
  { x: 420, label: "4400" },
  { x: 860, label: "4400" },
  { x: 1240, label: "3200" },
];

/** Draw order, and how long each band of the drawing takes to appear. */
const BANDS: { paths: string[]; className: string; start: number; step: number }[] = [
  { paths: ENVELOPE, className: styles.heavy, start: 0.15, step: 0.09 },
  { paths: PARTITIONS, className: styles.wall, start: 0.5, step: 0.06 },
  { paths: DOORS, className: styles.thin, start: 0.95, step: 0.05 },
  { paths: STAIR, className: styles.thin, start: 1.1, step: 0.035 },
  { paths: DIMENSIONS, className: styles.faint, start: 1.45, step: 0.02 },
  { paths: GRID_LINES, className: styles.faint, start: 1.6, step: 0.03 },
  { paths: NORTH, className: styles.thin, start: 1.75, step: 0.05 },
];

export function UnderConstruction() {
  const rootRef = useRef<HTMLDivElement>(null);
  const readoutXRef = useRef<HTMLSpanElement>(null);
  const readoutYRef = useRef<HTMLSpanElement>(null);
  const [project, setProject] = useState(0);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionQuery.matches;
    const onMotionChange = (event: MediaQueryListEvent) => {
      reduced = event.matches;
    };
    motionQuery.addEventListener("change", onMotionChange);

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let lensX = targetX;
    let lensY = targetY;
    let pointerSeen = false;
    const start = performance.now();
    let frameId = 0;

    const onPointerMove = (event: PointerEvent) => {
      pointerSeen = true;
      targetX = event.clientX;
      targetY = event.clientY;
    };

    const onPointerDown = (event: PointerEvent) => {
      pointerSeen = true;
      targetX = event.clientX;
      targetY = event.clientY;
      setPulse((n) => n + 1);
    };

    const frame = (now: number) => {
      // With no pointer — touch devices, or before the first move — the lens
      // wanders a slow figure-eight so the page is never inert. On phones the
      // drawing sits in the upper part of the screen, so the drift is centred
      // there rather than over the wordmark and contact block.
      if (!pointerSeen && !reduced) {
        const t = (now - start) / 1000;
        const narrow = window.innerWidth < 820;
        const midY = window.innerHeight * (narrow ? 0.3 : 0.5);
        const spreadY = window.innerHeight * (narrow ? 0.12 : 0.17);
        targetX = window.innerWidth / 2 + Math.sin(t * 0.31) * window.innerWidth * 0.27;
        targetY = midY + Math.sin(t * 0.62) * spreadY;
      }

      const ease = reduced ? 1 : 0.085;
      lensX += (targetX - lensX) * ease;
      lensY += (targetY - lensY) * ease;

      root.style.setProperty("--lx", `${lensX.toFixed(1)}px`);
      root.style.setProperty("--ly", `${lensY.toFixed(1)}px`);
      root.style.setProperty("--px", ((lensX / window.innerWidth) * 2 - 1).toFixed(3));
      root.style.setProperty("--py", ((lensY / window.innerHeight) * 2 - 1).toFixed(3));

      if (readoutXRef.current) {
        readoutXRef.current.textContent = String(Math.round(lensX)).padStart(4, "0");
      }
      if (readoutYRef.current) {
        readoutYRef.current.textContent = String(Math.round(lensY)).padStart(4, "0");
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    return () => {
      cancelAnimationFrame(frameId);
      motionQuery.removeEventListener("change", onMotionChange);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setProject((n) => (n + 1) % PROJECTS.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.reveal} aria-hidden="true">
        {PROJECTS.map((item, index) => (
          <div
            key={item.src}
            className={`${styles.photo} ${index === project ? styles.photoOn : ""}`}
            style={{ backgroundImage: `url(${item.src})` }}
          />
        ))}
      </div>

      <div className={styles.plan} aria-hidden="true">
        <svg viewBox="60 100 1520 840" preserveAspectRatio="xMidYMid meet">
          {BANDS.map((band) =>
            band.paths.map((d, index) => (
              <path
                key={`${band.className}-${d}`}
                d={d}
                pathLength={1}
                className={`${styles.stroke} ${band.className}`}
                style={{ animationDelay: `${band.start + index * band.step}s` }}
              />
            )),
          )}

          {GRID_LABELS.map((bubble) => (
            <g key={bubble.label} className={styles.late} style={{ animationDelay: "1.7s" }}>
              <circle cx={bubble.x} cy={150} r={24} className={styles.bubble} />
              <text x={bubble.x} y={158} className={styles.bubbleText}>
                {bubble.label}
              </text>
            </g>
          ))}

          {DIM_LABELS.map((dim) => (
            <text
              key={dim.x}
              x={dim.x}
              y={866}
              className={`${styles.dimText} ${styles.late}`}
              style={{ animationDelay: "1.85s" }}
            >
              {dim.label}
            </text>
          ))}

          <text
            x={110}
            y={500}
            className={`${styles.dimText} ${styles.late}`}
            style={{ animationDelay: "1.85s" }}
            transform="rotate(-90 110 500)"
          >
            6000
          </text>

          <g className={styles.late} style={{ animationDelay: "1.9s" }}>
            <circle cx={1500} cy={244} r={38} className={styles.bubble} />
            <text x={1500} y={196} className={styles.bubbleText}>
              N
            </text>
          </g>

          {ROOMS.map((room) => (
            <g key={room.name} className={styles.late} style={{ animationDelay: "2s" }}>
              <text x={room.x} y={room.y} className={styles.roomName}>
                {room.name}
              </text>
              <text x={room.x} y={room.y + 32} className={styles.roomArea}>
                {room.area}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className={styles.lens} aria-hidden="true">
        <span className={styles.lensRing} />
        <span className={`${styles.tick} ${styles.tickN}`} />
        <span className={`${styles.tick} ${styles.tickS}`} />
        <span className={`${styles.tick} ${styles.tickE}`} />
        <span className={`${styles.tick} ${styles.tickW}`} />
        {pulse > 0 && <span key={pulse} className={styles.pulse} />}
      </div>

      <div className={styles.frame} aria-hidden="true" />

      <div className={styles.hud} aria-hidden="true">
        <span className={styles.hudRow}>
          X <span ref={readoutXRef}>0000</span>
        </span>
        <span className={styles.hudRow}>
          Y <span ref={readoutYRef}>0000</span>
        </span>
        <span className={styles.hudProject}>{PROJECTS[project].label}</span>
      </div>

      <div className={styles.foot}>
        <main className={styles.copy}>
          <h1 className={styles.wordmark}>
            {"INTEXSPACE".split("").map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className={styles.letter}
                style={{ animationDelay: `${0.45 + index * 0.045}s` }}
              >
                {letter}
              </span>
            ))}
          </h1>
          <p className={styles.lede}>We&rsquo;re redrawing our space. Back shortly.</p>
        </main>

        <aside className={styles.titleBlock}>
          <div className={styles.tbRow}>
            <span className={styles.tbKey}>Client</span>
            <span className={styles.tbValue}>Intexspace Solutions Pvt Ltd</span>
          </div>
          <div className={styles.tbRow}>
            <span className={styles.tbKey}>Scope</span>
            <span className={styles.tbValue}>
              Design &middot; Interiors &middot; MEP &middot; Delivery
            </span>
          </div>
          <div className={styles.tbRow}>
            <span className={styles.tbKey}>Studio</span>
            <span className={styles.tbValue}>
              #888 Munusamy Salai, K.K. Nagar West
              <br />
              Chennai 600078
            </span>
          </div>
          <div className={styles.tbRow}>
            <span className={styles.tbKey}>Call</span>
            <span className={styles.tbValue}>
              <a href="tel:+914442800562">044 4280 0562</a>
              <a href="tel:+919360126623">93601 26623</a>
            </span>
          </div>
          <div className={styles.tbRow}>
            <span className={styles.tbKey}>Email</span>
            <span className={styles.tbValue}>
              <a href="mailto:admin@intexspace.com">admin@intexspace.com</a>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
