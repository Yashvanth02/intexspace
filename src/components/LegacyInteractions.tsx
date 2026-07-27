"use client";

import { useEffect } from "react";

export function LegacyInteractions() {
  useEffect(() => {
    const carousels = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".intex-projects-page .project-carousel-wrap, .admin-live-gallery .admin-live-gallery-grid",
      ),
    );

    const cleanups = carousels.map((carousel) => {
      let pointerId: number | null = null;
      let startX = 0;
      let startScroll = 0;
      let dragged = false;
      let lastHoverX: number | null = null;
      let targetScroll = carousel.scrollLeft;
      let animationFrame: number | null = null;

      const animateScroll = () => {
        const distance = targetScroll - carousel.scrollLeft;
        if (Math.abs(distance) < 0.5) {
          carousel.scrollLeft = targetScroll;
          animationFrame = null;
          return;
        }
        carousel.scrollLeft += distance * 0.2;
        animationFrame = window.requestAnimationFrame(animateScroll);
      };

      const moveSmoothly = (distance: number) => {
        const maximumScroll = carousel.scrollWidth - carousel.clientWidth;
        targetScroll = Math.max(0, Math.min(maximumScroll, targetScroll + distance));
        if (animationFrame === null) animationFrame = window.requestAnimationFrame(animateScroll);
      };

      const stopDragging = () => {
        if (pointerId !== null && carousel.hasPointerCapture(pointerId)) {
          carousel.releasePointerCapture(pointerId);
        }
        pointerId = null;
        carousel.classList.remove("is-dragging");
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startScroll = carousel.scrollLeft;
        targetScroll = carousel.scrollLeft;
        dragged = false;
        carousel.setPointerCapture(event.pointerId);
        carousel.classList.add("is-dragging");
        event.preventDefault();
      };

      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const distance = event.clientX - startX;
        if (Math.abs(distance) > 3) dragged = true;
        carousel.scrollLeft = startScroll - distance;
        targetScroll = carousel.scrollLeft;
      };

      const onPointerEnter = (event: PointerEvent) => {
        if (event.pointerType === "mouse") lastHoverX = event.clientX;
      };

      const onPointerLeave = () => {
        lastHoverX = null;
      };

      const onHoverMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || pointerId !== null || lastHoverX === null) return;
        const movement = event.clientX - lastHoverX;
        lastHoverX = event.clientX;
        if (movement) moveSmoothly(-movement * 1.5);
      };

      const onWheel = (event: WheelEvent) => {
        const distance = event.deltaX || event.deltaY;
        if (!distance) return;
        event.preventDefault();
        targetScroll = carousel.scrollLeft;
        moveSmoothly(distance);
      };

      const onClick = (event: MouseEvent) => {
        if (!dragged) return;
        event.preventDefault();
        event.stopPropagation();
        dragged = false;
      };

      carousel.addEventListener("pointerdown", onPointerDown);
      carousel.addEventListener("pointermove", onPointerMove);
      carousel.addEventListener("pointermove", onHoverMove);
      carousel.addEventListener("pointerup", stopDragging);
      carousel.addEventListener("pointercancel", stopDragging);
      carousel.addEventListener("lostpointercapture", stopDragging);
      carousel.addEventListener("pointerenter", onPointerEnter);
      carousel.addEventListener("pointerleave", onPointerLeave);
      carousel.addEventListener("wheel", onWheel, { passive: false });
      carousel.addEventListener("click", onClick, true);
      window.addEventListener("blur", stopDragging);

      return () => {
        carousel.removeEventListener("pointerdown", onPointerDown);
        carousel.removeEventListener("pointermove", onPointerMove);
        carousel.removeEventListener("pointermove", onHoverMove);
        carousel.removeEventListener("pointerup", stopDragging);
        carousel.removeEventListener("pointercancel", stopDragging);
        carousel.removeEventListener("lostpointercapture", stopDragging);
        carousel.removeEventListener("pointerenter", onPointerEnter);
        carousel.removeEventListener("pointerleave", onPointerLeave);
        carousel.removeEventListener("wheel", onWheel);
        carousel.removeEventListener("click", onClick, true);
        window.removeEventListener("blur", stopDragging);
        if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return null;
}
