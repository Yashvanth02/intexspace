const legacyImages = [
  "images/project-workplace-fabric.jpg",
  "images/project-nbcc-vizag.jpg",
  "images/project-venkateshwara.jpg",
  "images/project-bungalow-chennai.jpg",
  "images/project-overview-image.jpg",
  "images/project-cruise-terminal.jpg",
  "images/project-seafarers-club.jpg",
];

// Template inline scripts run on the first document, not on React refreshes.
export function initializeProjectCards() {
  document.querySelectorAll<HTMLElement>(".project-item").forEach((card) => {
    const titleLink = card.querySelector<HTMLAnchorElement>(".project-item-content h2 a");
    const imageLink = card.querySelector<HTMLAnchorElement>(".project-item-image a");
    const image = imageLink?.querySelector<HTMLImageElement>("img");
    if (!titleLink) return;
    const title = titleLink.textContent?.trim() || "Intexspace Project";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View details for ${title}`);
    titleLink.href = "#project-details";
    titleLink.setAttribute("data-project-trigger", "");
    if (!image || !imageLink) return;
    imageLink.href = "#project-details";
    imageLink.setAttribute("data-project-trigger", "");

    let images: string[] | undefined;
    if (card.dataset.projectImages) {
      try {
        const values: unknown = JSON.parse(card.dataset.projectImages);
        if (Array.isArray(values)) images = values.filter((value): value is string => typeof value === "string" && !!value);
      } catch { /* Keep the rendered image if metadata is invalid. */ }
    } else if (card.closest(".intex-projects-page") && !imageLink.querySelector(".project-image-track")) {
      const index = Math.max(0, legacyImages.indexOf(image.getAttribute("src")?.replace(/^.*images\//, "images/") || ""));
      images = [...legacyImages.slice(index), ...legacyImages.slice(0, index)].slice(0, 3);
    }
    if (!images?.length) return;
    if (images.length === 1) {
      const index = legacyImages.indexOf(images[0].replace(/^.*images\//, "images/"));
      if (index >= 0) images = [...legacyImages.slice(index), ...legacyImages.slice(0, index)].slice(0, 3);
    }
    const media = document.createElement("div");
    media.className = images.length > 1 ? "project-image-track" : "";
    (images.length > 1 ? [...images, ...images] : images).forEach((src) => {
      const figure = document.createElement("figure");
      figure.className = "image-anime";
      const item = document.createElement("img");
      item.src = src;
      item.alt = title;
      figure.appendChild(item);
      media.appendChild(figure);
    });
    if (images.length > 1 && card.dataset.projectImages) {
      media.style.width = `${images.length * 200}%`;
      media.style.animationDuration = `${images.length * 15}s`;
      media.querySelectorAll<HTMLElement>("figure").forEach((figure) => {
        figure.style.flexBasis = `${100 / (images!.length * 2)}%`;
        figure.style.width = `${100 / (images!.length * 2)}%`;
      });
    }
    imageLink.replaceChildren(...(images.length > 1 ? [media] : Array.from(media.children)));
    const chip = document.createElement("span");
    chip.className = "project-view-chip";
    chip.textContent = "View details";
    imageLink.appendChild(chip);
  });
}
