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
        if (pointerId !== null) {
          try {
            carousel.releasePointerCapture(pointerId);
          } catch (_e) {
            // ignore if not captured
          }
        }
        pointerId = null;
        dragged = false;
        carousel.classList.remove("is-dragging");
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        pointerId = event.pointerId;
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

        if (!dragged) {
          dragged = true;
          try {
            carousel.setPointerCapture(event.pointerId);
          } catch (_e) {
            // fallback if capture unsupported
          }
          carousel.classList.add("is-dragging");
        }

        event.preventDefault();
        carousel.scrollLeft = startScroll - distanceX;
      };

      const onClick = (event: MouseEvent) => {
        if (dragged) {
          event.preventDefault();
          event.stopPropagation();
          dragged = false;
        }
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

    const projectSelector = ".project-item, [data-project-trigger], .admin-completed-project";

    const ensureProjectModal = (): HTMLElement => {
      let modal = document.getElementById("projectDetailsModal");
      if (!modal) {
        modal = document.createElement("div");
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
                <div class="project-modal-section"><h3>Project Scope</h3><p id="projectModalScope"></p></div>
                <div class="project-modal-section"><h3>Delivery Focus</h3><p id="projectModalDelivery"></p></div>
                <a class="btn-default" href="contact.html">Discuss Similar Work</a>
              </div>
            </div>
          </div>`;
      }

      // Detach from any parent transform/stacking context and attach to document.body
      if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }
      return modal;
    };

    const projectDetails: Record<string, { description?: string; scope?: string; delivery?: string }> = {
      "Bank of Baroda ATM Maintenance": {
        description: "A continuing facility management engagement supporting a large ATM network with responsive maintenance, reporting and issue closure across Tamil Nadu.",
        scope: "Plumbing, electrical, carpentry, civil repairs, periodic support calls and multi-location maintenance coordination.",
        delivery: "Fast response, consistent documentation, minimal operational disruption and dependable service coverage across 500+ ATM sites.",
      },
      "Reserve Bank of India Maintenance": {
        description: "A long-term institutional maintenance relationship covering core building service needs and upkeep coordination over multiple years.",
        scope: "Plumbing, electrical, carpentry and civil maintenance support with recurring inspections and service follow-up.",
        delivery: "Stable service continuity, disciplined execution teams and clear coordination for a high-trust institutional environment.",
      },
      "LIC and PNB Maintenance Support": {
        description: "Institutional maintenance support for banking and insurance facilities with service continuity across active office environments.",
        scope: "General maintenance, civil finishing, electrical and plumbing assistance, carpentry and branch-level support.",
        delivery: "Reliable planned and reactive support shaped around client operations, uptime and neat closure of maintenance requirements.",
      },
      "Dena Bank | Gujarat | 2017-18": {
        description: "Turnkey branch interior fit-out, MEP setup, and architectural execution delivered with strict adherence to public banking standards.",
        scope: "Civil finishing, false ceiling, modular banking counters, electrical wiring, and networking setup.",
        delivery: "Delivered on schedule with complete quality inspection, regulatory compliance, and seamless operational handover.",
      },
      "Canara Bank | Teynampet | 2020-21": {
        description: "Complete modern branch renovation and interior MEP execution optimized for customer workflow and staff security.",
        scope: "Turnkey interior fit-out, acoustic partitioning, safety grills, lighting design, and HVAC integration.",
        delivery: "Zero downtime handover ensuring uninterrupted banking services and premium finish.",
      },
      "NBCC - Visakhapatnam Port Authority": {
        description: "Institutional infrastructure and interior development for major government port facilities with maritime-grade specifications.",
        scope: "Structural planning, corrosion-resistant finishes, office layout fit-out, and MEP coordination.",
        delivery: "Precision engineering, strict adherence to PSU norms, and high durability handover.",
      },
    };

    const openProjectModal = (card: HTMLElement) => {
      const modal = ensureProjectModal();
      if (!modal) return;

      const titleElement = card.querySelector<HTMLElement>(".project-item-content h2 a") ||
                           card.querySelector<HTMLElement>(".project-item-content h2") ||
                           card.querySelector<HTMLElement>("h2") ||
                           card.querySelector<HTMLElement>("h3");
      const title = titleElement?.textContent?.trim() ||
                    card.dataset.projectTitle ||
                    card.querySelector("img")?.alt?.trim() ||
                    "Intexspace Project";

      const facts = Array.from(card.querySelectorAll(".project-item-content li, .project-meta li, .meta span"))
        .map((item) => item.textContent?.trim())
        .filter(Boolean) as string[];

      const rawImages = Array.from(card.querySelectorAll<HTMLImageElement>("img"))
        .map((image) => image.currentSrc || image.src || image.getAttribute("src") || "")
        .filter((src, index, all) => src && all.indexOf(src) === index && !src.includes("icon-"));

      const defaultDetail = projectDetails[title] || {};
      const description = card.dataset.projectDescription ||
                          defaultDetail.description ||
                          `Comprehensive architectural design, turnkey interior execution, and MEP coordination delivered for ${title}.`;
      const scope = defaultDetail.scope ||
                    (facts.length > 1 ? `Sector: ${facts[0]} • Details: ${facts.slice(1).join(" • ")}` : "Turnkey interior fit-out, architectural detailing, MEP coordination, and site execution.");
      const delivery = defaultDetail.delivery ||
                       "Delivered on schedule with complete quality control, safety compliance, and operational handover support.";

      const modalTitle = modal.querySelector<HTMLElement>("#projectModalTitle");
      const modalStatus = modal.querySelector<HTMLElement>("#projectModalStatus");
      const modalDescription = modal.querySelector<HTMLElement>("#projectModalDescription");
      const modalFacts = modal.querySelector<HTMLElement>("#projectModalFacts");
      const modalScope = modal.querySelector<HTMLElement>("#projectModalScope");
      const modalDelivery = modal.querySelector<HTMLElement>("#projectModalDelivery");
      const modalImages = modal.querySelector<HTMLElement>("#projectModalImages");

      if (modalTitle) modalTitle.textContent = title;
      if (modalStatus) modalStatus.textContent = facts[0] || "Featured Project";
      if (modalDescription) modalDescription.textContent = description;
      if (modalScope) modalScope.textContent = scope;
      if (modalDelivery) modalDelivery.textContent = delivery;

      if (modalFacts) {
        modalFacts.innerHTML = "";
        const factList = facts.length > 0 ? facts : ["Pan-India Delivery", "Turnkey Execution", "Quality Assured"];
        factList.forEach((fact) => {
          const span = document.createElement("span");
          span.textContent = fact;
          modalFacts.appendChild(span);
        });
      }

      if (modalImages) {
        modalImages.innerHTML = "";
        const displayImages = rawImages.length > 0 ? rawImages : ["images/project-overview-image.jpg"];
        displayImages.forEach((src) => {
          const img = document.createElement("img");
          img.src = src;
          img.alt = title;
          modalImages.appendChild(img);
        });
      }

      modal.hidden = false;
      modal.removeAttribute("hidden");
      modal.style.display = "flex";
      modal.style.position = "fixed";
      modal.style.inset = "0";
      modal.style.zIndex = "999999";
      document.body.classList.add("project-modal-open");
      document.body.style.overflow = "hidden";
    };

    const closeProjectModal = () => {
      const modal = document.getElementById("projectDetailsModal");
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute("hidden", "");
      modal.style.display = "none";
      document.body.classList.remove("project-modal-open");
      document.body.style.overflow = "";
    };

    const onProjectClick = (event: MouseEvent) => {
      const close = (event.target as Element).closest("[data-project-close]");
      if (close) {
        event.preventDefault();
        event.stopPropagation();
        closeProjectModal();
        return;
      }

      const card = (event.target as Element).closest<HTMLElement>(projectSelector);
      if (!card) return;

      event.preventDefault();
      event.stopPropagation();
      openProjectModal(card);
    };

    const onProjectKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProjectModal();
      const target = event.target as Element;
      if ((event.key === "Enter" || event.key === " ") && target.closest(projectSelector)) {
        event.preventDefault();
        openProjectModal(target.closest<HTMLElement>(projectSelector)!);
      }
    };

    document.addEventListener("click", onProjectClick, true);
    document.addEventListener("keydown", onProjectKeydown, true);

    const careerButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-career-role]"));
    const onCareerClick = (event: Event) => {
      const button = event.currentTarget as HTMLButtonElement;
      const role = button.dataset.careerRole;
      if (!role) return;
      careerButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll<HTMLElement>("[data-career-detail]").forEach((panel) => {
        const active = panel.dataset.careerDetail === role;
        panel.classList.toggle("active", active);
        panel.hidden = !active;
      });
    };
    careerButtons.forEach((button) => button.addEventListener("click", onCareerClick));

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      document.removeEventListener("click", onProjectClick, true);
      document.removeEventListener("keydown", onProjectKeydown, true);
      careerButtons.forEach((button) => button.removeEventListener("click", onCareerClick));
    };
  }, []);

  return null;
}