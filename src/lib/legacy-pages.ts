import "server-only";

import { readAdminData, type AdminData } from "./admin-store";

export type LegacyPage = {
  title: string;
  description: string;
  body: string;
};

type LegacyPageModule = { default: LegacyPage };

const legacyPageLoaders: Record<string, () => Promise<LegacyPageModule>> = {
  "404": () => import("./legacy-pages-data/404"),
  "404.html": () => import("./legacy-pages-data/404_html"),
  "about.html": () => import("./legacy-pages-data/about_html"),
  "about": () => import("./legacy-pages-data/about"),
  "blog-single.html": () => import("./legacy-pages-data/blog_single_html"),
  "blog-single": () => import("./legacy-pages-data/blog_single"),
  "blog.html": () => import("./legacy-pages-data/blog_html"),
  "blog": () => import("./legacy-pages-data/blog"),
  "careers.html": () => import("./legacy-pages-data/careers_html"),
  "careers": () => import("./legacy-pages-data/careers"),
  "contact.html": () => import("./legacy-pages-data/contact_html"),
  "contact": () => import("./legacy-pages-data/contact"),
  "faqs.html": () => import("./legacy-pages-data/faqs_html"),
  "faqs": () => import("./legacy-pages-data/faqs"),
  "gallery.html": () => import("./legacy-pages-data/gallery_html"),
  "gallery": () => import("./legacy-pages-data/gallery"),
  "image-gallery.html": () => import("./legacy-pages-data/image_gallery_html"),
  "image-gallery": () => import("./legacy-pages-data/image_gallery"),
  "index-2.html": () => import("./legacy-pages-data/index_2_html"),
  "index-2": () => import("./legacy-pages-data/index_2"),
  "index-3.html": () => import("./legacy-pages-data/index_3_html"),
  "index-3": () => import("./legacy-pages-data/index_3"),
  "index-4.html": () => import("./legacy-pages-data/index_4_html"),
  "index-4": () => import("./legacy-pages-data/index_4"),
  "index.html": () => import("./legacy-pages-data/index_html"),
  "pricing.html": () => import("./legacy-pages-data/pricing_html"),
  "pricing": () => import("./legacy-pages-data/pricing"),
  "project-single.html": () => import("./legacy-pages-data/project_single_html"),
  "project-single": () => import("./legacy-pages-data/project_single"),
  "projects.html": () => import("./legacy-pages-data/projects_html"),
  "projects": () => import("./legacy-pages-data/projects"),
  "service-single.html": () => import("./legacy-pages-data/service_single_html"),
  "service-single": () => import("./legacy-pages-data/service_single"),
  "services.html": () => import("./legacy-pages-data/services_html"),
  "services": () => import("./legacy-pages-data/services"),
  "team-single.html": () => import("./legacy-pages-data/team_single_html"),
  "team-single": () => import("./legacy-pages-data/team_single"),
  "team.html": () => import("./legacy-pages-data/team_html"),
  "team": () => import("./legacy-pages-data/team"),
  "testimonials.html": () => import("./legacy-pages-data/testimonials_html"),
  "testimonials": () => import("./legacy-pages-data/testimonials"),
  "video-gallery.html": () => import("./legacy-pages-data/video_gallery_html"),
  "video-gallery": () => import("./legacy-pages-data/video_gallery"),
};

export const legacySlugs = [
    "404",
    "404.html",
    "about.html",
    "about",
    "blog-single.html",
    "blog-single",
    "blog.html",
    "blog",
    "careers.html",
    "careers",
    "contact.html",
    "contact",
    "faqs.html",
    "faqs",
    "gallery.html",
    "gallery",
    "image-gallery.html",
    "image-gallery",
    "index-2.html",
    "index-2",
    "index-3.html",
    "index-3",
    "index-4.html",
    "index-4",
    "pricing.html",
    "pricing",
    "project-single.html",
    "project-single",
    "projects.html",
    "projects",
    "service-single.html",
    "service-single",
    "services.html",
    "services",
    "team-single.html",
    "team-single",
    "team.html",
    "team",
    "testimonials.html",
    "testimonials",
    "video-gallery.html",
    "video-gallery"
  ];

export async function getLegacyPage(slug: string): Promise<LegacyPage | undefined> {
  const htmlSlug = `${slug}.html`;
  const loader = legacyPageLoaders[slug] ?? legacyPageLoaders[htmlSlug];
  if (!loader) {
    return undefined;
  }

  const module = await loader();
  const page = module.default;
  const data = await readAdminData();
  const normalizedSlug = slug.replace(/\.html$/, "");

  return {
    ...page,
    body: injectAdminContent(page.body, normalizedSlug, data),
  };
}

function injectAdminContent(body: string, slug: string, data: AdminData) {
  const section = renderAdminSection(slug, data);

  if (!section) {
    return body;
  }

  const footerIndex = body.indexOf("<!-- Footer Start -->");

  if (footerIndex === -1) {
    return `${body}${section}`;
  }

  return `${body.slice(0, footerIndex)}${section}${body.slice(footerIndex)}`;
}

function renderAdminSection(slug: string, data: AdminData) {
  if (slug === "projects" && data.projects.length > 0) {
    return `${adminSectionStyles()}
    <section class="admin-live-section admin-live-projects" id="admin-managed-projects">
      <div class="container">
        <div class="admin-live-heading">
          <span>Updated From Admin</span>
          <h2>Client Project List</h2>
          <p>These client and project highlights are managed from the Intexspace admin dashboard.</p>
        </div>
        <div class="admin-live-grid">
          ${data.projects.map(renderProjectCard).join("")}
        </div>
      </div>
    </section>`;
  }

  if (slug === "gallery" && data.gallery.length > 0) {
    return `${adminSectionStyles()}
    <section class="admin-live-section admin-live-gallery" id="admin-managed-gallery">
      <div class="container">
        <div class="admin-live-heading">
          <span>Updated From Admin</span>
          <h2>Published Gallery</h2>
          <p>Images uploaded in the dashboard appear here for site visitors.</p>
        </div>
        <div class="admin-live-gallery-grid">
          ${data.gallery.map(renderGalleryCard).join("")}
        </div>
      </div>
    </section>`;
  }

  if (slug === "careers" && data.careers.length > 0) {
    return `${adminSectionStyles()}
    <section class="admin-live-section admin-live-careers" id="admin-managed-careers">
      <div class="container">
        <div class="admin-live-heading">
          <span>Updated From Admin</span>
          <h2>Open Roles</h2>
          <p>Career openings are controlled by the admin dashboard.</p>
        </div>
        <div class="admin-live-list">
          ${data.careers.map(renderCareerCard).join("")}
        </div>
      </div>
    </section>`;
  }

  return "";
}

function renderProjectCard(project: AdminData["projects"][number]) {
  return `<article class="admin-live-card">
    <img src="${escapeHtml(project.imageUrl)}" alt="${escapeHtml(project.title)}">
    <div>
      <span class="admin-live-pill">${formatLabel(project.status)}</span>
      <h3>${escapeHtml(project.title)}</h3>
      <p>${escapeHtml(project.summary || project.description)}</p>
      <dl>
        <div><dt>Client</dt><dd>${escapeHtml(project.client || "Intexspace Client")}</dd></div>
        <div><dt>Location</dt><dd>${escapeHtml(project.location || "India")}</dd></div>
        ${project.category ? `<div><dt>Category</dt><dd>${escapeHtml(project.category)}</dd></div>` : ""}
        ${project.year ? `<div><dt>Year</dt><dd>${escapeHtml(project.year)}</dd></div>` : ""}
      </dl>
    </div>
  </article>`;
}

function renderGalleryCard(image: AdminData["gallery"][number]) {
  return `<figure class="admin-live-gallery-card">
    <img src="${escapeHtml(image.imageUrl)}" alt="${escapeHtml(image.alt || image.title)}">
    <figcaption>
      <strong>${escapeHtml(image.title)}</strong>
      <span>${escapeHtml(image.category || "Project Gallery")}</span>
    </figcaption>
  </figure>`;
}

function renderCareerCard(career: AdminData["careers"][number]) {
  return `<article class="admin-live-role">
    <div>
      <span class="admin-live-pill">${career.isOpen ? "Open" : "Closed"}</span>
      <h3>${escapeHtml(career.title)}</h3>
      <p>${escapeHtml(career.description)}</p>
    </div>
    <ul>
      <li>${escapeHtml(career.location || "Chennai")}</li>
      <li>${escapeHtml(career.employmentType || "Full-time")}</li>
      <li>${escapeHtml(career.experience || "Experience as applicable")}</li>
      <li>${escapeHtml(career.qualification || "Relevant qualification")}</li>
    </ul>
  </article>`;
}

function adminSectionStyles() {
  return `<style>
    .admin-live-section{padding:90px 0;background:#f7f3ec;color:#241f18}
    .admin-live-heading{display:grid;gap:10px;max-width:760px;margin-bottom:34px}
    .admin-live-heading span,.admin-live-pill{color:#9b7134;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
    .admin-live-heading h2{margin:0;font-size:clamp(32px,5vw,54px);line-height:1.05}
    .admin-live-heading p{margin:0;color:#6d6358}
    .admin-live-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
    .admin-live-card,.admin-live-role,.admin-live-gallery-card{overflow:hidden;border:1px solid #e4d8c8;border-radius:8px;background:#fff;box-shadow:0 20px 54px rgba(47,38,26,.09)}
    .admin-live-card img,.admin-live-gallery-card img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}
    .admin-live-card>div,.admin-live-role,.admin-live-gallery-card figcaption{display:grid;gap:12px;padding:22px}
    .admin-live-card h3,.admin-live-role h3{margin:0;font-size:24px}
    .admin-live-card p,.admin-live-role p{margin:0;color:#6b6258}
    .admin-live-card dl{display:grid;gap:10px;margin:4px 0 0}
    .admin-live-card dl div{display:flex;justify-content:space-between;gap:14px;border-top:1px solid #eee4d6;padding-top:10px}
    .admin-live-card dt{font-weight:800;color:#352d24}
    .admin-live-card dd{margin:0;color:#766a5c;text-align:right}
    .admin-live-pill{display:inline-flex;width:max-content;border-radius:999px;background:#f0e2c9;padding:7px 11px}
    .admin-live-gallery-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}
    .admin-live-gallery-card{margin:0}
    .admin-live-gallery-card figcaption strong{font-size:18px}
    .admin-live-gallery-card figcaption span{color:#756a5e}
    .admin-live-list{display:grid;gap:16px}
    .admin-live-role{grid-template-columns:minmax(0,1fr) minmax(220px,340px);align-items:start}
    .admin-live-role ul{display:grid;gap:8px;margin:0;padding:22px;list-style:none;background:#f2eadf}
    .admin-live-role li{font-weight:700;color:#42392f}
    @media(max-width:760px){.admin-live-section{padding:58px 0}.admin-live-role{grid-template-columns:1fr}}
  </style>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatLabel(value: string) {
  return escapeHtml(
    value
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  );
}
