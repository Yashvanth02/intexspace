"use client";

import { useEffect } from "react";

export function LegacyInteractions() {
  useEffect(() => {
    const carousels = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".intex-projects-page .project-carousel-wrap, .admin-live-gallery .admin-live-gallery-grid, .team-carousel",
      ),
    );

    const cleanups = carousels.map((carousel) => {
      const frame = document.createElement("div");
      frame.className = "project-carousel-frame";
      carousel.before(frame);
      frame.appendChild(carousel);

      const cardCount = carousel.querySelectorAll(".col-xl-4, .col-xl-3, .admin-live-gallery-card").length;
      const previousButton = cardCount > 1 ? document.createElement("button") : null;
      const nextButton = cardCount > 1 ? document.createElement("button") : null;
      if (previousButton && nextButton) {
        const controls = document.createElement("div");
        controls.className = "project-carousel-controls";
        previousButton.type = "button";
        previousButton.className = "project-carousel-next project-carousel-previous";
        previousButton.setAttribute("aria-label", "Show previous items");
        previousButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 12H5M11 6l-6 6 6 6" /></svg>';
        nextButton.type = "button";
        nextButton.className = "project-carousel-next";
        nextButton.setAttribute("aria-label", "Show more items");
        nextButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6" /></svg>';
        controls.append(previousButton, nextButton);
        frame.appendChild(controls);
      }

      let pointerId: number | null = null;
      let startX = 0;
      let startY = 0;
      let startScroll = 0;
      let dragged = false;

      const stopDragging = () => {
        pointerId = null;
        dragged = false;
        carousel.classList.remove("is-dragging");
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        pointerId = event.pointerId;
        carousel.setPointerCapture(event.pointerId);
        startX = event.clientX;
        startY = event.clientY;
        startScroll = carousel.scrollLeft;
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
      };

      const onClick = (event: MouseEvent) => {
        if (!dragged) return;
        event.preventDefault();
        event.stopPropagation();
        dragged = false;
      };

      const onNextClick = () => {
        carousel.scrollBy({ left: Math.max(carousel.clientWidth * 0.82, 280), behavior: "smooth" });
      };

      const onPreviousClick = () => {
        carousel.scrollBy({ left: -Math.max(carousel.clientWidth * 0.82, 280), behavior: "smooth" });
      };

      carousel.addEventListener("pointerdown", onPointerDown);
      carousel.addEventListener("pointermove", onPointerMove);
      carousel.addEventListener("pointerup", stopDragging);
      carousel.addEventListener("pointercancel", stopDragging);
      carousel.addEventListener("lostpointercapture", stopDragging);
      carousel.addEventListener("click", onClick, true);
      previousButton?.addEventListener("click", onPreviousClick);
      nextButton?.addEventListener("click", onNextClick);
      window.addEventListener("blur", stopDragging);

      return () => {
        carousel.removeEventListener("pointerdown", onPointerDown);
        carousel.removeEventListener("pointermove", onPointerMove);
        carousel.removeEventListener("pointerup", stopDragging);
        carousel.removeEventListener("pointercancel", stopDragging);
        carousel.removeEventListener("lostpointercapture", stopDragging);
        carousel.removeEventListener("click", onClick, true);
        previousButton?.removeEventListener("click", onPreviousClick);
        nextButton?.removeEventListener("click", onNextClick);
        window.removeEventListener("blur", stopDragging);
        frame.replaceWith(carousel);
      };
    });

    const projectSelector = ".intex-projects-page .project-item, #ongoing-admin .project-item";
    const projectCards = Array.from(document.querySelectorAll<HTMLElement>(projectSelector));

    const ensureProjectModal = () => {
      const existing = document.getElementById("projectDetailsModal");
      if (existing) return existing;

      const modal = document.createElement("div");
      modal.className = "project-modal";
      modal.id = "projectDetailsModal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "projectModalTitle");
      modal.hidden = true;
      modal.innerHTML = `
        <div class="project-modal-backdrop" data-project-close></div>
        <div class="project-modal-dialog">
          <button class="project-modal-close" type="button" aria-label="Close project details" data-project-close>&times;</button>
          <div class="project-modal-grid">
            <div class="project-modal-media"><div class="project-modal-image-stack" id="projectModalImages"></div></div>
            <div class="project-modal-content">
              <span class="project-modal-status" id="projectModalStatus"></span>
              <h2 id="projectModalTitle"></h2>
              <p id="projectModalDescription"></p>
              <div class="project-modal-facts" id="projectModalFacts"></div>
              <div class="project-modal-section"><h3>Project details</h3><p id="projectModalScope"></p></div>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
      return modal;
    };

    const modal = projectCards.length ? ensureProjectModal() : null;
    const openProjectModal = (card: HTMLElement) => {
      if (!modal) return;
      const title = card.querySelector(".project-item-content h2")?.textContent?.trim() || "Intexspace Project";
      const facts = Array.from(card.querySelectorAll(".project-item-content li"))
        .map((item) => item.textContent?.trim())
        .filter(Boolean) as string[];
      const images = Array.from(card.querySelectorAll<HTMLImageElement>(".project-item-image img"))
        .map((image) => image.currentSrc || image.src)
        .filter((src, index, all) => src && all.indexOf(src) === index);
      const description = card.dataset.projectDescription || "A selected Intexspace project delivered through coordinated planning and execution.";

      const titleElement = modal.querySelector<HTMLElement>("#projectModalTitle");
      const statusElement = modal.querySelector<HTMLElement>("#projectModalStatus");
      const descriptionElement = modal.querySelector<HTMLElement>("#projectModalDescription");
      const factsElement = modal.querySelector<HTMLElement>("#projectModalFacts");
      const scopeElement = modal.querySelector<HTMLElement>("#projectModalScope");
      const imageElement = modal.querySelector<HTMLElement>("#projectModalImages");

      if (titleElement) titleElement.textContent = title;
      if (statusElement) statusElement.textContent = facts[0] || "Project";
      if (descriptionElement) descriptionElement.textContent = description;
      if (scopeElement) scopeElement.textContent = facts.length > 1 ? facts.slice(1).join(" • ") : description;
      if (factsElement) {
        factsElement.replaceChildren(...facts.map((fact) => {
          const item = document.createElement("span");
          item.textContent = fact;
          return item;
        }));
      }
      if (imageElement) {
        imageElement.replaceChildren(...images.map((src) => {
          const image = document.createElement("img");
          image.src = src;
          image.alt = title;
          return image;
        }));
      }

      modal.hidden = false;
      document.body.classList.add("project-modal-open");
    };

    const closeProjectModal = () => {
      if (!modal) return;
      modal.hidden = true;
      document.body.classList.remove("project-modal-open");
    };

    projectCards.forEach((card) => {
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `View details for ${card.querySelector(".project-item-content h2")?.textContent?.trim() || "project"}`);
    });

    const onProjectClick = (event: MouseEvent) => {
      const close = (event.target as Element).closest("[data-project-close]");
      if (close) {
        closeProjectModal();
        return;
      }
      const card = (event.target as Element).closest<HTMLElement>(projectSelector);
      if (!card) return;
      event.preventDefault();
      openProjectModal(card);
    };

    const onProjectKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProjectModal();
      if ((event.key === "Enter" || event.key === " ") && (event.target as Element).matches(projectSelector)) {
        event.preventDefault();
        openProjectModal(event.target as HTMLElement);
      }
    };

    document.addEventListener("click", onProjectClick);
    document.addEventListener("keydown", onProjectKeydown);

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      document.removeEventListener("click", onProjectClick);
      document.removeEventListener("keydown", onProjectKeydown);
    };
  }, []);

  return null;
}
