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
      const frame = document.createElement("div");
      frame.className = "project-carousel-frame";
      carousel.before(frame);
      frame.appendChild(carousel);

      const projectCount = Array.from(carousel.children).filter((child) => child.matches(".col-xl-4, .admin-live-gallery-card")).length;
      const nextButton = projectCount >= 3 ? document.createElement("button") : null;
      if (nextButton) {
        nextButton.type = "button";
        nextButton.className = "project-carousel-next";
        nextButton.setAttribute("aria-label", "Show next projects");
        nextButton.innerHTML = '<span aria-hidden="true">&#8594;</span>';
        frame.appendChild(nextButton);
      }

      let pointerId: number | null = null;
      let startX = 0;
      let startY = 0;
      let startScroll = 0;
      let dragged = false;
      let lastHoverX: number | null = null;
      let targetScroll = carousel.scrollLeft;
      let animationFrame: number | null = null;
      let animationStartTime: number | null = null;
      let animationFrom: number | null = null;

      const animateScroll = (timestamp: number) => {
        if (animationStartTime === null || animationFrom === null) {
          animationStartTime = timestamp;
          animationFrom = carousel.scrollLeft;
        }

        const duration = 180;
        const progress = Math.min(1, (timestamp - animationStartTime) / duration);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const nextScroll = animationFrom + (targetScroll - animationFrom) * easedProgress;
        carousel.scrollLeft = nextScroll;

        if (progress < 1) {
          animationFrame = window.requestAnimationFrame(animateScroll);
          return;
        }

        carousel.scrollLeft = targetScroll;
        animationFrame = null;
        animationStartTime = null;
        animationFrom = null;
      };

      const moveSmoothly = (distance: number) => {
        const maximumScroll = carousel.scrollWidth - carousel.clientWidth;
        targetScroll = Math.max(0, Math.min(maximumScroll, targetScroll + distance));
        if (animationFrame === null) {
          animationStartTime = null;
          animationFrom = null;
          animationFrame = window.requestAnimationFrame(animateScroll);
        }
      };

      const stopDragging = () => {
        pointerId = null;
        dragged = false;
        carousel.classList.remove("is-dragging");
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        startScroll = carousel.scrollLeft;
        targetScroll = carousel.scrollLeft;
        dragged = false;
        carousel.classList.remove("is-dragging");
      };

      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const distanceX = event.clientX - startX;
        const distanceY = event.clientY - startY;

        if (!dragged && Math.abs(distanceX) < 8 && Math.abs(distanceY) < 8) {
          return;
        }

        if (!dragged && Math.abs(distanceX) <= Math.abs(distanceY)) {
          return;
        }

        dragged = true;
        carousel.classList.add("is-dragging");
        event.preventDefault();
        carousel.scrollLeft = startScroll - distanceX;
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
        // Preserve normal vertical page scrolling. Only a deliberate horizontal
        // gesture (such as Shift + wheel or a trackpad swipe) moves the carousel.
        if (!event.deltaX || Math.abs(event.deltaY) > Math.abs(event.deltaX)) return;
        event.preventDefault();
        targetScroll = carousel.scrollLeft;
        moveSmoothly(event.deltaX);
      };

      const onNextClick = () => {
        const distance = Math.max(carousel.clientWidth * 0.82, 280);
        const maximumScroll = carousel.scrollWidth - carousel.clientWidth;
        const nextPosition = Math.min(maximumScroll, carousel.scrollLeft + distance);
        targetScroll = nextPosition;
        if (animationFrame !== null) {
          window.cancelAnimationFrame(animationFrame);
        }
        animationStartTime = null;
        animationFrom = null;
        animationFrame = window.requestAnimationFrame(animateScroll);
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
      nextButton?.addEventListener("click", onNextClick);
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
        nextButton?.removeEventListener("click", onNextClick);
        window.removeEventListener("blur", stopDragging);
        if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
        frame.replaceWith(carousel);
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return null;
}
