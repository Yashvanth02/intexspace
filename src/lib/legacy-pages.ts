import "server-only";

import { normalizeProjectStatus, readAdminData, type AdminData } from "./admin-store";
import { createSupabaseAdmin } from "./supabase-server";
import { readPersistentMenu } from "./menu-store";

export type LegacyPage = {
  title: string;
  description: string;
  body: string;
};

type LegacyPageModule = { default: LegacyPage };

function renderScrollingTicker() {
  const items = [
    "Turnkey Projects",
    "Architectural Design",
    "Project Management",
    "MEP Services",
    "Facility Management",
    "Liaisoning",
    "In-house Execution Team",
    "Pan-India Projects",
  ];
  const content = items
    .map((item) => `<span><img src="/images/icon-asterisk-white.svg" alt="">${item}</span>`)
    .join("");

  return `<!-- Scrolling Ticker Section Start -->
    <div class="our-scrolling-ticker">
      <div class="scrolling-ticker-box">
        <div class="scrolling-content">${content}</div>
        <div class="scrolling-content" aria-hidden="true">${content}</div>
      </div>
    </div>
    <!-- Scrolling Ticker Section End -->`;
}

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
  "ongoing.html": () => import("./legacy-pages-data/ongoing_html"),
  "ongoing": () => import("./legacy-pages-data/ongoing"),
  "service-single.html": () => import("./legacy-pages-data/service_single_html"),
  "service-single": () => import("./legacy-pages-data/service_single"),
  "services.html": () => import("./legacy-pages-data/services_html"),
  "services": () => import("./legacy-pages-data/services"),
  "team.html": () => import("./legacy-pages-data/team_html"),
  "team": () => import("./legacy-pages-data/team"),
  "testimonials.html": () => import("./legacy-pages-data/testimonials_html"),
  "testimonials": () => import("./legacy-pages-data/testimonials"),
  "video-gallery.html": () => import("./legacy-pages-data/video_gallery_html"),
  "video-gallery": () => import("./legacy-pages-data/video_gallery"),
  "vlog": () => import("./legacy-pages-data/vlog"),
  "vlog.html": () => import("./legacy-pages-data/vlog"),
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
    "ongoing.html",
    "ongoing",
    "service-single.html",
    "service-single",
    "services.html",
    "services",
    "team.html",
    "team",
    "testimonials.html",
    "testimonials",
    "video-gallery.html",
    "video-gallery",
    "vlog.html",
    "vlog"
  ];

export async function getLegacyPage(slug: string): Promise<LegacyPage | undefined> {
  const htmlSlug = `${slug}.html`;
  const loader = legacyPageLoaders[slug] ?? legacyPageLoaders[htmlSlug];
  if (!loader) {
    return undefined;
  }

  const module = await loader();
  const page = module.default;
  const [storedData, persistedMenu] = await Promise.all([readAdminData(), readPersistentMenu()]);
  const rawData = {
    ...storedData,
    menu: { ...(storedData.menu || {}), ...(persistedMenu || {}) },
  };
  const normalizedSlug = slug.replace(/\.html$/, "");

  // A disabled top-level page is not merely removed from navigation: direct
  // visits are unavailable as well. Project categories live inside Projects,
  // so they automatically follow this single setting.
  if (rawData.menu?.[normalizedSlug] === false) {
    return undefined;
  }

  // Merge gallery from Supabase (same as admin state endpoint) so user-facing
  // pages always reflect the latest admin uploads.
  let data: AdminData = rawData;
  try {
    const supabaseAdmin = createSupabaseAdmin();

    // Fetch remote content so public legacy pages reflect the latest admin changes.
    const [{ data: galleryRows }, { data: projectRows }] = await Promise.all([
      supabaseAdmin
        .from("gallery")
        .select("id, title, image_url, alt, category, uploaded_at")
        .order("uploaded_at", { ascending: false }),
      supabaseAdmin
        .from("projects")
        .select("id, title, status, location, client, category, year, summary, description, image_url, updated_at")
        .order("updated_at", { ascending: false }),
    ]);

    // Merge gallery rows with local gallery (local items take precedence unless Supabase has newer entries)
    let sortedGallery: AdminData["gallery"] | undefined = undefined;
    if (galleryRows && galleryRows.length > 0) {
      const localGalleryById = new Map(rawData.gallery.map((item) => [item.id, item]));
      const mergedGallery = new Map<string, AdminData["gallery"][number]>(localGalleryById);
      for (const row of galleryRows) {
        mergedGallery.set(row.id, {
          id: row.id,
          title: row.title,
          imageUrl: row.image_url,
          alt: row.alt,
          category: row.category,
          uploadedAt: row.uploaded_at,
        });
      }
      sortedGallery = Array.from(mergedGallery.values()).sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      );
    }

    // Merge project rows with local projects so user pages pick up admin updates stored in Supabase
    let sortedProjects: AdminData["projects"] | undefined = undefined;
    if (projectRows && projectRows.length > 0) {
      const localProjectsById = new Map(rawData.projects.map((item) => [item.id, item]));
      const mergedProjects = new Map<string, AdminData["projects"][number]>(localProjectsById);
      for (const row of projectRows) {
        const localItem = localProjectsById.get(row.id);
        mergedProjects.set(row.id, {
          id: row.id,
          title: row.title || localItem?.title || "",
          status: normalizeProjectStatus(row.status || localItem?.status),
          location: row.location || localItem?.location || "",
          client: row.client || localItem?.client || "",
          category: row.category || localItem?.category || "",
          year: row.year || localItem?.year || "",
          summary: row.summary || localItem?.summary || "",
          description: row.description || localItem?.description || "",
          imageUrl: row.image_url ?? localItem?.imageUrl ?? "",
          updatedAt: row.updated_at || localItem?.updatedAt || new Date().toISOString(),
        });
      }
      sortedProjects = Array.from(mergedProjects.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }

    // Compose final data: start from local rawData, then override gallery and/or projects when remote data is available
    data = rawData;
    if (sortedGallery) data = { ...data, gallery: sortedGallery };
    if (sortedProjects) data = { ...data, projects: sortedProjects };
  } catch (_err) {
    // If Supabase is unavailable, fall back to local JSON data
  }

  // Inject admin-managed sections first
  let body = injectAdminContent(page.body, normalizedSlug, data);

  

  

  if (normalizedSlug === "index") {
    // The profile PDF is served through a small route so its filename can be
    // changed in /public without requiring another home-page edit.
    body = body.replace(
      /(<div class="video-play-button">[\s\S]*?<a href=")[^"]+("[^>]*>)/,
      '$1/api/profile$2',
    );
    body = body.replace(
      'href="api/profile" class="popup-video" data-cursor-text="Play"',
      'href="/api/profile" target="_blank" rel="noopener" data-cursor-text="View"',
    );

    // These are template-only promotional sections and are not part of the
    // Intex home-page content.
    body = body.replace(/\s*<!-- Intro Video Section Start -->[\s\S]*?<!-- Intro Video Section End -->/, "");
    body = body.replace(/\s*<!-- Our Projects Section Start -->[\s\S]*?<!-- Our Projects Section End -->/, "");
    // The template labels the Sector Experience cards as an "Our Blog"
    // section, so remove that exact block rather than the unrelated projects
    // section above.
    body = body.replace(/\s*<!-- Our Blog Section Start -->[\s\S]*?Sector Experience[\s\S]*?<!-- Our Blog Section End -->/, "");

    // Keep the capabilities cards informational; the arrow-only links add no
    // useful destination once the project sections are managed separately.
    body = body.replace(
      /\s*<!-- Service Readmore Button Start -->\s*<div class="service-item-btn">[\s\S]*?<\/div>\s*<!-- Service Readmore Button End -->/g,
      "",
    );

    // Use the established site logo in testimonial cards instead of the
    // template company logos.
    body = body.replace(
      /<div class="testimonial-item-logo">\s*<img[^>]*>\s*<\/div>/g,
      '<div class="testimonial-item-logo"><span class="brand-symbol" aria-hidden="true"><img src="images/intex-symbol.png" alt=""></span><img class="intex-testimonial-wordmark" src="images/logo.svg" alt="Intex Space Solutions"></div>',
    );
    body = body.replace(/<div class="testimonial-item">/g, '<div class="testimonial-item intex-testimonial">');
  }

  // Team members are presented as a grid only; individual profile pages are
  // intentionally not part of the public site.
  if (normalizedSlug === "team") {
    body = body.replace(/<a\b[^>]*href="team-single\.html"[^>]*>([\s\S]*?)<\/a>/g, "$1");
  }

  if (normalizedSlug === "about") {
    // These template sections repeat content already available elsewhere:
    // sector cards belong to the projects experience, the CTA belongs on the
    // contact page, and testimonials remain on the home page only.
    body = body.replace(/\s*<!-- CTA Box Section Start -->[\s\S]*?<!-- CTA Box Section End -->/, "");
    body = body.replace(/\s*<!-- Our Testimonials Section Start -->[\s\S]*?<!-- Our Testimonials Section End -->/, "");
  }

  if (normalizedSlug === "careers") {
    body = replaceCareerBoard(body, data.careers);
  }

  // Replace project anchor links that previously pointed to the projects page ongoing anchor
  // so they point to the new standalone ongoing page instead.
  body = body.replace(/projects\.html#ongoing/g, 'ongoing.html');

  // Use one consistent Projects dropdown throughout the legacy site. Individual
  // source pages carried different, outdated status menus.
  body = body.replace(
    /(<li class="nav-item submenu"><a class="nav-link" href="projects\.html">Projects<\/a>\s*)<ul>[\s\S]*?<\/ul>(\s*<\/li>)/,
    `$1<ul>
      <li class="nav-item"><a class="nav-link" href="projects.html#bank">Banking</a></li>
      <li class="nav-item"><a class="nav-link" href="projects.html#hospital">Healthcare</a></li>
      <li class="nav-item"><a class="nav-link" href="projects.html#offices">Offices</a></li>
      <li class="nav-item"><a class="nav-link" href="projects.html#residential">Residential</a></li>
      <li class="nav-item"><a class="nav-link" href="projects.html#airports">Airports</a></li>
      <li class="nav-item"><a class="nav-link" href="projects.html#telecom">Telecom</a></li>
      <li class="nav-item"><a class="nav-link" href="projects.html#education">Education</a></li>
      <li class="nav-item"><a class="nav-link" href="projects.html#industrial">Industrial</a></li>
      <li class="nav-item"><a class="nav-link" href="projects.html#maritime">Maritime</a></li>
    </ul>$2`,
  );

  // Keep Ongoing as its own top-level item, alongside the Projects dropdown.
  // A dropdown link to ongoing.html must not suppress this navigation entry.
  if (!/<li class=\"nav-item\"><a class=\"nav-link\" href=\"ongoing\.html\">Ongoing<\/a><\/li>/.test(body)) {
    const careersMarker = '<li class="nav-item"><a class="nav-link" href="careers.html">Careers</a></li>';
    if (body.indexOf(careersMarker) !== -1) {
      body = body.replace(careersMarker, '<li class="nav-item"><a class="nav-link" href="ongoing.html">Ongoing</a></li>\n                                ' + careersMarker);
    } else {
      // Fallback: try a simpler insertion near the careers anchor if exact marker not found
      body = body.replace('<a class="nav-link" href="careers.html">Careers</a>', '<a class="nav-link" href="ongoing.html">Ongoing</a>\n                                <a class="nav-link" href="careers.html">Careers</a>');
    }
  }

  // The imported projects document has its section markup embedded in an
  // unfinished ticker. Extract it into a valid page shell so its grid aligns
  // with the rest of the site, and render admin-managed completed work on the
  // server (scripts inside dangerouslySetInnerHTML do not execute).
  if (normalizedSlug === 'projects') {
    const sectionStart = body.indexOf('<section class="intex-project-section"');
    const footerStart = body.indexOf('<!-- Footer Start -->');

    if (sectionStart !== -1 && footerStart > sectionStart) {
      const tickerStart = body.lastIndexOf('<!-- Scrolling Ticker Section Start -->', sectionStart);
      const pageStart = tickerStart === -1 ? body.slice(0, sectionStart) : body.slice(0, tickerStart);
      let sections = body.slice(sectionStart, footerStart);
      sections = truncateProjectsAfterMaritime(sections).replace(/href="contact\.html"/g, 'href="#project-details" data-project-trigger');

      const completedProjects = data.projects.filter((p) => p.status === "completed");

      // Synchronize category sections with admin project data and images
      sections = syncProjectImagesInHtml(sections, completedProjects, data.gallery);
      sections = injectCategoryProjects(sections, completedProjects, data.gallery);

      // Render admin-managed projects as server-side HTML so they appear without client scripts
      const adminProjectsSection = renderCompletedProjectSection({ ...data, projects: completedProjects });

      body = `${pageStart}
        <main class="intex-projects-page">
          <div class="container">
            ${sections}
            ${adminProjectsSection}
          </div>
        </main>
        ${body.slice(footerStart)}`;
    }
  }

  if (normalizedSlug === 'ongoing') {
    const ongoingStart = body.indexOf('<section class="intex-project-section"');
    if (ongoingStart !== -1) {
      const ongoingEnd = body.indexOf('</section>', ongoingStart);
      if (ongoingEnd !== -1) {
        const adminOngoingSection = data.menu?.ongoing === false ? "" : renderOngoingProjectSection(data);
        if (adminOngoingSection) {
          body = body.slice(0, ongoingEnd + '</section>'.length) +
            '\n            ' + adminOngoingSection +
            body.slice(ongoingEnd + '</section>'.length);
        }
      }
    }
  }

  if (normalizedSlug === 'team' && data.team && data.team.length > 0) {
    const teamStartMarker = '<!-- Page Team Start -->';
    const teamEndMarker = '<!-- Page Team End -->';
    const teamStartIdx = body.indexOf(teamStartMarker);
    const teamEndIdx = body.indexOf(teamEndMarker);

    if (teamStartIdx !== -1 && teamEndIdx !== -1 && teamEndIdx > teamStartIdx) {
      // Replace the entire block including the end marker
      body = body.slice(0, teamStartIdx) +
        renderAdminTeamSection(data.team) +
        body.slice(teamEndIdx + teamEndMarker.length);
    } else {
      // Fallback: inject before footer if markers not found
      const footerIdx = body.indexOf('<!-- Footer Start -->');
      if (footerIdx !== -1) {
        body = body.slice(0, footerIdx) +
          renderAdminTeamSection(data.team) +
          body.slice(footerIdx);
      } else {
        body = body + renderAdminTeamSection(data.team);
      }
    }
  }

  // Replace the about page's "Our Team" section with admin team data
  if (normalizedSlug === 'about' && data.team && data.team.length > 0) {
    const aboutTeamStartMarker = '<!-- Our Team Section Start -->';
    const aboutTeamEndMarker = '<!-- Our Team Section End -->';
    const aboutTeamStartIdx = body.indexOf(aboutTeamStartMarker);
    const aboutTeamEndIdx = body.indexOf(aboutTeamEndMarker);

    if (aboutTeamStartIdx !== -1 && aboutTeamEndIdx !== -1 && aboutTeamEndIdx > aboutTeamStartIdx) {
      body = body.slice(0, aboutTeamStartIdx) +
        renderAboutTeamSection(data.team) +
        body.slice(aboutTeamEndIdx + aboutTeamEndMarker.length);
    }
  }

  if (!/href=\"vlog\.html\"/.test(body)) {
    const galleryMarker = '<li class="nav-item"><a class="nav-link" href="gallery.html">Gallery</a></li>';
    if (body.includes(galleryMarker)) {
      body = body.replace(galleryMarker, `${galleryMarker}\n                                <li class="nav-item"><a class="nav-link" href="vlog.html">Vlog</a></li>`);
    }

    const footerGalleryMarker = '<li><a href="gallery.html">Gallery</a></li>';
    if (body.includes(footerGalleryMarker)) {
      body = body.replace(footerGalleryMarker, `${footerGalleryMarker}\n                                <li><a href="vlog.html">Vlog</a></li>`);
    }
  }

  // Apply menu visibility settings from admin data: remove nav links and page sections for disabled slugs.
  if (data && data.menu) {
    for (const [slug, enabled] of Object.entries(data.menu)) {
      if (enabled === false) {
        try {
          if (slug === "projects") {
            // Remove the complete Projects dropdown, including all category
            // links, rather than leaving nested list items behind.
            body = body.replace(
              /<li class="nav-item submenu">\s*<a class="nav-link" href="projects\.html">Projects<\/a>\s*<ul>[\s\S]*?<\/ul>\s*<\/li>/i,
              "",
            );
          }
          // Remove list nav item that links to the slug (li wrapper)
          body = body.replace(new RegExp(`<li[^>]*>\\s*<a[^>]*href=\\"${slug}\\.html\\"[\\s\\S]*?<\\/li>`, 'i'), '');
          // Remove any anchor link pointing directly to the page
          body = body.replace(new RegExp(`<a[^>]*href=\\"${slug}\\.html\\"[^>]*>[^<]*<\\/a>`, 'gi'), '');
          // Remove a section with matching id attribute
          body = body.replace(new RegExp(`<section[^>]+id=\\"${slug}\\"[\\s\\S]*?<\\/section>`, 'i'), '');
        } catch (e) {
          // ignore regex errors and continue
        }
      }
    }
  }

  // Ensure overall page body updates static project card images using admin projects data
  if (data && data.projects && data.projects.length > 0) {
    body = syncProjectImagesInHtml(body, data.projects, data.gallery || []);
  }

  // The Projects page reconstructs its content from an imported document and
  // consequently drops its original ticker. Render one shared, route-safe
  // version on both requested pages directly below their page headers.
  if (normalizedSlug === "about" || normalizedSlug === "projects") {
    body = body.replace(
      /\s*<!-- Scrolling Ticker Section Start -->[\s\S]*?<!-- Scrolling Ticker Section End -->/,
      "",
    );
    const pageHeaderEnd = "<!-- Page Header Section End -->";
    const pageHeaderIndex = body.indexOf(pageHeaderEnd);
    if (pageHeaderIndex !== -1) {
      const insertAt = pageHeaderIndex + pageHeaderEnd.length;
      body = `${body.slice(0, insertAt)}\n    ${renderScrollingTicker()}${body.slice(insertAt)}`;
    }
  }

  return {
    ...page,
    body,
  };
}

function projectMatchesCardText(project: AdminData["projects"][number], text: string) {
  const normText = normalizeText(text);
  if (!normText) return false;

  const pTitle = normalizeText(project.title || "");
  const pLocation = normalizeText(project.location || "");
  const pClient = normalizeText(project.client || "");

  if (pTitle && pTitle.length > 2) {
    if (normText.includes(pTitle) || pTitle.includes(normText)) {
      return true;
    }
  }

  if (pLocation && pLocation.length > 2) {
    if (pClient && pClient.length > 2 && normText.includes(pClient) && normText.includes(pLocation)) {
      return true;
    }
  }

  return false;
}

function categoryToSectionId(category: string): string | null {
  const norm = normalizeText(category);
  if (norm.includes("bank")) return "bank";
  if (norm.includes("health") || norm.includes("hospital")) return "hospital";
  if (norm.includes("office") || norm.includes("corporate")) return "offices";
  if (norm.includes("resident") || norm.includes("bungalow")) return "residential";
  if (norm.includes("airport")) return "airports";
  if (norm.includes("telecom")) return "telecom";
  if (norm.includes("school") || norm.includes("educat")) return "education";
  if (norm.includes("factor") || norm.includes("industr")) return "industrial";
  if (norm.includes("maritime") || norm.includes("seafarer")) return "maritime";
  return null;
}

function syncProjectImagesInHtml(htmlContent: string, projects: AdminData["projects"], gallery: AdminData["gallery"]): string {
  let updatedHtml = htmlContent;

  for (const project of projects) {
    const imageUrl = projectImageUrls(project, gallery)[0];

    // Match project cards in HTML and update their img src
    const cardRegex = /(<div[^>]*class="[^"]*project-item[^"]*"[^>]*>[\s\S]*?<img[^>]*src=")([^"]+)("[^>]*alt=")([^"]+)("[^>]*>)/gi;

    updatedHtml = updatedHtml.replace(cardRegex, (fullMatch, prefix, _oldSrc, altPrefix, oldAlt, suffix) => {
      if (projectMatchesCardText(project, oldAlt) || projectMatchesCardText(project, fullMatch)) {
        if (!imageUrl) {
          return fullMatch.replace(/<img\b[^>]*>/i, '<div class="admin-project-image-empty" aria-label="Project image not available"></div>');
        }
        return `${prefix}${escapeHtml(imageUrl)}${altPrefix}${oldAlt}${suffix}`;
      }
      return fullMatch;
    });
  }

  return updatedHtml;
}

function injectCategoryProjects(htmlContent: string, projects: AdminData["projects"], gallery: AdminData["gallery"]): string {
  let updatedHtml = htmlContent;

  for (const project of projects) {
    const sectionId = categoryToSectionId(project.category || "");
    if (!sectionId) continue;

    const sectionRegex = new RegExp(`(<section[^>]*id="${sectionId}"[^>]*>[\\s\\S]*?)(<div[^>]*class="(?:project-carousel-wrap|row intex-project-grid)"[^>]*>)([\\s\\S]*?)(</div>[\\s\\S]*?</section>)`, "i");

    const sectionMatch = updatedHtml.match(sectionRegex);
    if (!sectionMatch) continue;

    const [fullSection, secHeader, gridOpen, gridContent, secClose] = sectionMatch;

    // If project is already matched/present in gridContent, skip
    if (projectMatchesCardText(project, gridContent)) continue;

    const image = projectImageUrls(project, gallery)[0];
    const title = escapeHtml(project.title || project.client || "Intexspace Project");
    const categoryLabel = escapeHtml(project.category || "Project");
    const location = escapeHtml(project.location || "India");
    const year = escapeHtml(project.year || "");

    const newCard = `<div class="col-xl-4 col-md-6" style="min-width:320px; flex:0 0 auto; scroll-snap-align:start;">
      <div class="project-item wow fadeInUp">
        ${image ? `<div class="project-item-image">
          <a href="contact.html" data-cursor-text="view">
            <figure class="image-anime">
              <img src="${escapeHtml(image)}" alt="${title}">
            </figure>
          </a>
        </div>` : '<div class="project-item-image"><div class="admin-project-image-empty" aria-label="Project image not available"></div></div>'}
        <div class="project-item-content">
          <h2><a href="contact.html">${title}</a></h2>
          <ul>
            <li>${categoryLabel}</li>
            <li>${location}</li>
            ${year ? `<li>${year}</li>` : ""}
          </ul>
        </div>
      </div>
    </div>`;

    updatedHtml = updatedHtml.replace(fullSection, `${secHeader}${gridOpen}${newCard}${gridContent}${secClose}`);
  }

  return updatedHtml;
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
  // By default sections are enabled unless explicitly disabled in admin data.menu
  const isEnabled = (s: string) => {
    try {
      return data.menu?.[s] !== false;
    } catch (e) {
      return true;
    }
  };

  if (slug === "projects") {
    return "";
  }

  if (slug === "team" && data.team && data.team.length > 0) {
    // Team section is handled separately via direct body replacement in getLegacyPage.
    // Return empty here to avoid double-injection.
    return "";
  }

  if (slug === "gallery" && data.gallery.length > 0) {
    if (!isEnabled("gallery")) return "";
    return `${adminSectionStyles()}
    <section class="admin-live-section admin-live-gallery" id="admin-managed-gallery">
      <div class="container">
        <div class="admin-live-gallery-grid">
          ${data.gallery.map(renderGalleryCard).join("")}
        </div>
      </div>
    </section>`;
  }

  // Careers replace the template's own board above, so they are not appended
  // again as a second, inconsistent list at the bottom of the page.
  if (slug === "careers") return "";

  if (slug === "vlog") {
    if (!isEnabled("vlog")) return "";
    return `${adminSectionStyles()}
    <section class="admin-live-section admin-live-vlogs" id="admin-managed-vlogs">
      <div class="container">
        <div class="admin-live-heading">
          <h2>Vlogs</h2>
          <p>Explore our latest project stories and updates.</p>
        </div>
        <div class="admin-live-gallery-grid">
          ${data.vlogs.length ? data.vlogs.map(renderVlogCard).join("") : "<p>No vlogs have been published yet.</p>"}
        </div>
      </div>
    </section>`;
  }

  return "";
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function projectMatchesGalleryImage(project: AdminData["projects"][number], image: AdminData["gallery"][number]) {
  const projectName = normalizeText(project.client || project.title || "");

  if (!projectName) {
    return false;
  }

  const imageTitle = normalizeText(image.title || "");
  const imageCategory = normalizeText(image.category || "");
  const imageAlt = normalizeText(image.alt || "");
  const projectTitle = normalizeText(project.title || "");

  if (projectName && (imageTitle.includes(projectName) || imageCategory.includes(projectName) || imageAlt.includes(projectName))) {
    return true;
  }

  if (projectTitle && (imageTitle.includes(projectTitle) || imageCategory.includes(projectTitle) || imageAlt.includes(projectTitle))) {
    return true;
  }

  return false;
}

function projectImageUrls(project: AdminData["projects"][number], gallery: AdminData["gallery"]) {
  const matchedUrls = gallery
    .filter((image) => projectMatchesGalleryImage(project, image))
    .map((image) => image.imageUrl);

  return [...new Set([project.imageUrl, ...matchedUrls].filter(Boolean))];
}

function renderCompletedProjectSection(data: AdminData) {
  const completedProjects = data.projects.filter((p) => p.status === "completed");
  if (data.menu?.projects === false || completedProjects.length === 0) {
    return "";
  }

  return `<section class="intex-project-section" id="completed">
    <div class="row section-row align-items-center">
      <div class="col-xl-8">
        <div class="section-title">
          <h3>Completed Projects</h3>
          <h2>Projects delivered by the Intexspace team.</h2>
        </div>
      </div>
    </div>
    <div class="row intex-project-grid">
      ${completedProjects.map((project) => {
        const image = projectImageUrls(project, data.gallery)[0] || "/images/project-overview-image.jpg";
        const title = escapeHtml(project.title || project.client || "Intexspace Project");
        const category = escapeHtml(project.category || "Completed Project");
        const location = escapeHtml(project.location || "India");
        const year = escapeHtml(project.year || "");

        return `<div class="col-xl-4 col-md-6">
          <article class="project-item admin-completed-project" data-project-description="${escapeHtml(project.description || project.summary || "")}">
            <div class="project-item-image">
              <a href="#project-details" data-project-trigger aria-label="View details for ${title}">
                <figure class="image-anime"><img src="${escapeHtml(image)}" alt="${title}"></figure>
              </a>
            </div>
            <div class="project-item-content">
              <h2><a href="#project-details" data-project-trigger>${title}</a></h2>
              <ul><li>${category}</li><li>${location}</li>${year ? `<li>${year}</li>` : ""}</ul>
            </div>
          </article>
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

function renderOngoingProjectSection(data: AdminData) {
  const ongoingProjects = data.projects.filter((p) => p.status === "ongoing");
  if (ongoingProjects.length === 0) {
    return "";
  }

  return `<section class="intex-project-section" id="ongoing-admin">
    <div class="row section-row align-items-center">
      <div class="col-xl-8">
        <div class="section-title">
          <h3>Admin Managed Ongoing Projects</h3>
          <h2>Ongoing projects delivered by the Intexspace team.</h2>
        </div>
      </div>
    </div>
    <div class="row intex-project-grid">
      ${ongoingProjects.map((project) => {
        const image = projectImageUrls(project, data.gallery)[0] || "/images/project-overview-image.jpg";
        const title = escapeHtml(project.title || project.client || "Intexspace Project");
        const category = escapeHtml(project.category || "Ongoing Project");
        const location = escapeHtml(project.location || "India");
        const year = escapeHtml(project.year || "");

        return `<div class="col-xl-4 col-md-6">
          <article class="project-item admin-ongoing-project" data-project-description="${escapeHtml(project.description || project.summary || "")}">
            <div class="project-item-image">
              <a href="#project-details" data-project-trigger aria-label="View details for ${title}">
                <figure class="image-anime"><img src="${escapeHtml(image)}" alt="${title}"></figure>
              </a>
            </div>
            <div class="project-item-content">
              <h2><a href="#project-details" data-project-trigger>${title}</a></h2>
              <ul><li>${category}</li><li>${location}</li>${year ? `<li>${year}</li>` : ""}</ul>
            </div>
          </article>
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

function renderProjectsIntoCompletedSection(data: AdminData) {
  const projects = data.projects.map((project) => ({
    title: project.title,
    status: formatLabel(project.status),
    summary: project.summary || project.description,
    client: project.client || "Intexspace Client",
    location: project.location || "India",
    category: project.category || "",
    year: project.year || "",
    images: projectImageUrls(project, data.gallery),
  }));

  return `<script>
    window.addEventListener('load', function () {
      function resetProjectModalScroll() {
        var modal = document.getElementById('projectDetailsModal');
        var dialog = modal && modal.querySelector('.project-modal-dialog');
        if (modal) modal.scrollTop = 0;
        if (dialog) dialog.scrollTop = 0;
      }

      function resetAfterProjectOpen(event) {
        if (!event.target.closest('.intex-projects-page .project-item')) return;
        window.setTimeout(resetProjectModalScroll, 0);
      }

      document.addEventListener('click', resetAfterProjectOpen, true);
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') resetAfterProjectOpen(event);
      }, true);

      var completedGrid = document.querySelector('#completed .intex-project-grid');
      if (!completedGrid) return;

      var projects = ${JSON.stringify(projects).replace(/</g, "\\u003c")};
      var count = document.querySelector('.intex-project-tabs a[href="#completed"] strong');
      if (count) count.textContent = String(completedGrid.querySelectorAll('.project-item').length + projects.length).padStart(2, '0');

      projects.forEach(function (project) {
        var column = document.createElement('div');
        column.className = 'col-xl-4 col-md-6';
        var card = document.createElement('div');
        card.className = 'project-item admin-completed-project wow fadeInUp';
        card._projectImages = project.images;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', 'View details for ' + project.title);

        var imageMarkup = project.images.length > 1
          ? '<div class="project-image-track">' + project.images.concat(project.images).map(function (src) {
              return '<figure class="image-anime"><img src="' + escapeAttribute(src) + '" alt="' + escapeAttribute(project.title) + '"></figure>';
            }).join('') + '</div>'
          : '<figure class="image-anime"><img src="' + escapeAttribute(project.images[0] || '') + '" alt="' + escapeAttribute(project.title) + '"></figure>';

        card.innerHTML = '<div class="project-item-image"><a href="#project-details" data-project-trigger>' + imageMarkup + '<span class="project-view-chip">View details</span></a></div>' +
          '<div class="project-item-content"><h2><a href="#project-details" data-project-trigger>' + escapeHtml(project.title) + '</a></h2><ul>' +
          '<li>' + escapeHtml(project.status) + '</li><li>' + escapeHtml(project.client) + '</li><li>' + escapeHtml(project.location) + '</li>' +
          (project.category ? '<li>' + escapeHtml(project.category) + '</li>' : '') +
          (project.year ? '<li>' + escapeHtml(project.year) + '</li>' : '') +
          (project.summary ? '<li>' + escapeHtml(project.summary) + '</li>' : '') +
          '</ul></div>';
        column.appendChild(card);
        completedGrid.appendChild(column);

        var track = card.querySelector('.project-image-track');
        if (track) {
          var imageCount = project.images.length;
          track.style.width = String(imageCount * 200) + '%';
          track.style.animationDuration = String(imageCount * 15) + 's';
          track.querySelectorAll('figure').forEach(function (figure) {
            figure.style.flexBasis = String(100 / (imageCount * 2)) + '%';
            figure.style.width = String(100 / (imageCount * 2)) + '%';
          });
        }
      });

      function updateModalMedia(card) {
        if (!card || !card.classList.contains('admin-completed-project')) return;
        var modalImages = document.getElementById('projectModalImages');
        if (!modalImages) return;
        var title = card.querySelector('.project-item-content h2 a').textContent.trim();
        modalImages.innerHTML = '';
        card._projectImages.forEach(function (src) {
          var image = document.createElement('img');
          image.src = src;
          image.alt = title;
          modalImages.appendChild(image);
        });
      }

      document.addEventListener('click', function (event) {
        updateModalMedia(event.target.closest('.admin-completed-project'));
      });

      function escapeHtml(value) {
        var element = document.createElement('div');
        element.textContent = value || '';
        return element.innerHTML;
      }

      function escapeAttribute(value) {
        return escapeHtml(value).replace(/"/g, '&quot;');
      }
    });
  </script>`;
}

function renderGalleryCard(image: AdminData["gallery"][number]) {
  return `<figure class="admin-live-gallery-card">
    <img src="${escapeHtml(image.imageUrl)}" alt="${escapeHtml(image.alt || image.title || "Gallery image")}">
  </figure>`;
}

function renderVlogCard(vlog: AdminData["vlogs"][number]) {
  return `<a class="admin-live-vlog-card" href="${escapeHtml(vlog.youtubeUrl)}" target="_blank" rel="noopener noreferrer">
    <div class="admin-vlog-media"><img src="${escapeHtml(vlog.thumbnailUrl)}" alt="${escapeHtml(vlog.title)}"><span class="admin-vlog-play" aria-hidden="true">▶</span></div>
    <div><h3>${escapeHtml(vlog.title)}</h3><p>${escapeHtml(vlog.details)}</p></div>
  </a>`;
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

function replaceCareerBoard(body: string, careers: AdminData["careers"]) {
  const start = body.indexOf('<div class="career-board');
  const nextSection = body.indexOf('<div class="intex-career-cta', start);
  if (start === -1 || nextSection === -1) return body;

  const cards = careers.map((career, index) => {
    const roleId = `career-role-${career.id}`;
    const active = index === 0;
    const action = career.isOpen
      ? `<a class="btn-default" href="mailto:admin@intexspace.com?subject=Application%20-%20${encodeURIComponent(career.title)}">Apply Now</a>`
      : '<span class="btn-default career-apply-disabled" aria-disabled="true">Applications Closed</span>';
    return {
      // Keep the template's icon and arrow elements: custom.css uses these
      // for the visual hierarchy, hover states and responsive spacing.
      tab: `<button class="career-job-card${active ? " active" : ""}" type="button" role="tab" aria-selected="${active}" aria-controls="${roleId}" data-career-role="${career.id}"><span class="career-job-icon"><img src="images/icon-service-item-${(index % 2) + 1}.svg" alt=""></span><span class="career-job-content"><span class="career-job-title">${escapeHtml(career.title)}</span><span class="career-job-meta">${escapeHtml(career.location || "Chennai")} | ${escapeHtml(career.employmentType || "Full-time")} | ${escapeHtml(career.experience || "Experience as applicable")}</span><span class="career-job-summary">${escapeHtml(career.qualification || "Relevant qualification")}</span></span><span class="career-job-arrow"><img src="images/arrow-primary.svg" alt=""></span></button>`,
      detail: `<article class="career-role-detail${active ? " active" : ""}" id="${roleId}" role="tabpanel" data-career-detail="${career.id}"${active ? "" : " hidden"}><div class="career-detail-header"><span class="career-eyebrow${career.isOpen ? "" : " career-eyebrow-closed"}">${career.isOpen ? "Open role" : "Applications closed"}</span><h2>${escapeHtml(career.title)}</h2><p>${escapeHtml(career.qualification || "Relevant qualification")}</p></div><div class="career-detail-grid"><div><span>Location</span><strong>${escapeHtml(career.location || "Chennai")}</strong></div><div><span>Experience</span><strong>${escapeHtml(career.experience || "As applicable")}</strong></div><div><span>Employment Type</span><strong>${escapeHtml(career.employmentType || "Full-time")}</strong></div></div><h3>Role Description</h3><p>${escapeHtml(career.description || "Details will be shared during the application process.")}</p>${action}</article>`,
    };
  });
  const board = `<div class="career-board wow fadeInUp" data-wow-delay="0.3s"><div class="career-list" role="tablist" aria-label="Current openings">${cards.map((card) => card.tab).join("")}</div><div class="career-detail-panel">${cards.map((card) => card.detail).join("")}</div></div>`;
  return `${body.slice(0, start)}${board}${body.slice(nextSection)}`;
}

function truncateProjectsAfterMaritime(sections: string) {
  const maritimeStart = sections.indexOf('<section class="intex-project-section" id="maritime">');
  if (maritimeStart === -1) {
    return sections;
  }

  const maritimeEnd = sections.indexOf('</section>', maritimeStart);
  return maritimeEnd === -1 ? sections : sections.slice(0, maritimeEnd + '</section>'.length);
}

function renderAdminTeamSection(team: AdminData["team"]) {
  if (!team.length) {
    return "";
  }

  return `<!-- Page Team Start -->
    <div class="page-team">
      <div class="container">
        ${renderTeamGrid(team)}
      </div>
    </div>
    <!-- Page Team End -->`;
}

function renderAboutTeamSection(team: AdminData["team"]) {
  if (!team.length) {
    return "";
  }

  return `<!-- Our Team Section Start -->
    <div class="our-team">
        <div class="container">
            <div class="row section-row">
                <div class="col-lg-12">
                    <!-- Section Title Start -->
                    <div class="section-title section-title-center">
                        <h3 class="wow fadeInUp">Our Expert Team</h3>
                        <h2 class="text-anime-style-3" data-cursor="-opaque">Team Intexspace</h2>
                        <p class="wow fadeInUp" data-wow-delay="0.2em">Our team brings together innovative thinkers and skilled professionals dedicated to crafting spaces that reflect your style and enhance your everyday living.</p>
                    </div>
                    <!-- Section Title End -->
                </div>
            </div>

            ${renderTeamGrid(team)}
        </div>
    </div>
    <!-- Our Team Section End -->`;
}

function renderTeamGrid(team: AdminData["team"]) {
  const cards = team.map(renderTeamMemberCard).join("");
  return team.length > 4
    ? `<div class="team-carousel">${cards}</div>`
    : `<div class="row">${cards}</div>`;
}

function renderTeamMemberCard(member: AdminData["team"][number], index = 0) {
  const delay = index > 0 ? ` data-wow-delay="${Math.min(0.8, index * 0.2).toFixed(1)}s"` : "";
  const socialLinks = renderTeamSocialLinks(member);

  return `<div class="col-xl-3 col-md-6">
            <div class="team-item wow fadeInUp"${delay}>
              <div class="team-item-image">
                <figure><img src="${escapeHtml(member.photoUrl)}" alt="${escapeHtml(member.name)}"></figure>
              </div>
              <div class="team-item-body">
                <div class="team-item-content">
                  <h2>${escapeHtml(member.name)}</h2>
                  <p>${escapeHtml(member.designation)}</p>
                </div>
                ${socialLinks ? `<div class="team-social-list"><ul>${socialLinks}</ul></div>` : ""}
              </div>
            </div>
          </div>`;
}

function renderTeamSocialLinks(member: AdminData["team"][number]) {
  const links: string[] = [];
  if (member.facebook) {
    links.push(`<li><a href="${escapeHtml(member.facebook)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-facebook-f"></i></a></li>`);
  }
  if (member.linkedIn) {
    links.push(`<li><a href="${escapeHtml(member.linkedIn)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-linkedin-in"></i></a></li>`);
  }
  if (member.instagram) {
    links.push(`<li><a href="${escapeHtml(member.instagram)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-instagram"></i></a></li>`);
  }
  if (member.x) {
    links.push(`<li><a href="${escapeHtml(member.x)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-twitter"></i></a></li>`);
  }
  return links.join("");
}

function adminSectionStyles() {
  return `<style>
    .admin-live-section{padding:90px 0;background:#f7f3ec;color:#241f18}
    .admin-live-heading{display:grid;gap:10px;max-width:760px;margin-bottom:34px}
    .admin-live-heading span,.admin-live-pill{color:#9b7134;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
    .admin-live-heading h2{margin:0;font-size:clamp(32px,5vw,54px);line-height:1.05}
    .admin-live-heading p{margin:0;color:#6d6358}
    .admin-live-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
    .admin-live-card,.admin-live-role,.admin-live-vlog-card{overflow:hidden;border:1px solid #e4d8c8;border-radius:8px;background:#fff;box-shadow:0 20px 54px rgba(47,38,26,.09)}
    .admin-live-card img,.admin-live-gallery-card img,.admin-live-vlog-card img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;transition:transform .35s ease,filter .35s ease}
    .admin-project-image-empty{display:block;min-height:220px;background:#f4efe6}
    .admin-live-card img:hover,.admin-live-gallery-card img:hover,.admin-live-vlog-card:hover img{transform:scale(1.05);filter:brightness(1.05)}
    .admin-live-card>div,.admin-live-role{display:grid;gap:12px;padding:22px}
    .admin-live-card h3,.admin-live-role h3{margin:0;font-size:24px}
    .admin-live-card p,.admin-live-role p{margin:0;color:#6b6258}
    .admin-live-card dl{display:grid;gap:10px;margin:4px 0 0}
    .admin-live-gallery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
    .admin-live-card dl div{display:flex;justify-content:space-between;gap:14px;border-top:1px solid #eee4d6;padding-top:10px}
    .admin-live-card dt{font-weight:800;color:#352d24}
    .admin-live-card dd{margin:0;color:#766a5c;text-align:right}
    .admin-live-pill{display:inline-flex;width:max-content;border-radius:999px;background:#f0e2c9;padding:7px 11px}
    .admin-live-gallery-card{margin:0;overflow:hidden;background:#1d1812}
    .admin-live-gallery-card img{aspect-ratio:1/1;transition:transform .45s ease,filter .45s ease}
    .admin-live-gallery-card:hover img{transform:scale(1.08);filter:brightness(1.08)}
    .admin-live-gallery .admin-live-gallery-grid{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:calc((100% - 36px) / 3);overflow-x:auto;padding-bottom:6px;cursor:grab;scroll-behavior:smooth;scroll-snap-type:x proximity;scrollbar-width:none;touch-action:auto;overscroll-behavior-inline:contain}
    .admin-live-gallery .admin-live-gallery-grid::-webkit-scrollbar{display:none}
    .admin-live-gallery .admin-live-gallery-grid.is-dragging{cursor:grabbing;user-select:none}
    .admin-live-gallery .admin-live-gallery-card{scroll-snap-align:start}
    .admin-live-gallery .admin-live-gallery-card img{-webkit-user-drag:none;user-select:none}
    .admin-live-vlog-card{display:block;color:inherit;text-decoration:none}
    .admin-vlog-media{position:relative;overflow:hidden;background:#17130d}
    .admin-live-vlog-card>div{padding:20px}.admin-live-vlog-card h3{margin:0 0 8px}.admin-live-vlog-card p{margin:0;color:#6b6258}
    .admin-vlog-play{position:absolute;top:50%;left:50%;display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:rgba(197,157,95,.94);color:#fff;transform:translate(-50%,-50%)}
    .admin-live-list{display:grid;gap:16px}
    .admin-live-role{grid-template-columns:minmax(0,1fr) minmax(220px,340px);align-items:start}
    .admin-live-role ul{display:grid;gap:8px;margin:0;padding:22px;list-style:none;background:#f2eadf}
    .admin-live-role li{font-weight:700;color:#42392f}
    @media(max-width:760px){.admin-live-section{padding:58px 0}.admin-live-role{grid-template-columns:1fr}.admin-live-gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-live-gallery .admin-live-gallery-grid{grid-auto-columns:calc((100% - 18px) / 2)}}
    @media(max-width:480px){.admin-live-gallery-grid{grid-template-columns:1fr}.admin-live-gallery .admin-live-gallery-grid{grid-auto-columns:100%}}
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
