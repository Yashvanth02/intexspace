"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./AdminDashboard.module.css";
import { publishContentChange, useContentUpdates } from "@/lib/live-content";
import type { SiteSettings } from "@/lib/site-settings";

type ProjectStatus = "ongoing" | "completed";
type InquiryStatus = "new" | "contacted" | "closed";
type Tab = "projects" | "gallery" | "vlogs" | "careers" | "team" | "inquiries" | "menu" | "maintenance";

type Project = {
  id: string;
  title: string;
  status: ProjectStatus;
  location: string;
  client: string;
  category?: string;
  year?: string;
  summary: string;
  description: string;
  imageUrl: string;
  updatedAt: string;
};

type CareerOpening = {
  id: string;
  title: string;
  location: string;
  employmentType: string;
  experience: string;
  qualification: string;
  description: string;
  isOpen: boolean;
  updatedAt: string;
};

type GalleryImage = {
  id: string;
  title: string;
  imageUrl: string;
  alt: string;
  category: string;
  uploadedAt: string;
};

type Vlog = { id: string; title: string; details: string; youtubeUrl: string; thumbnailUrl: string; createdAt: string };
type VlogFormState = { title: string; details: string; youtubeUrl: string; thumbnailUrl?: string };

type TeamMember = {
  id: string;
  name: string;
  designation: string;
  linkedIn?: string;
  instagram?: string;
  facebook?: string;
  x?: string;
  photoUrl: string;
  storagePath?: string;
  updatedAt: string;
};

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
};

type AdminData = {
  projects: Project[];
  careers: CareerOpening[];
  gallery: GalleryImage[];
  vlogs: Vlog[];
  inquiries: Inquiry[];
  team?: TeamMember[];
  // menu visibility map supplied by server (optional)
  menu?: Record<string, boolean>;
  // detected menu sections available on user dashboard
  menuSections?: string[];
  settings?: SiteSettings;
};

const emptyProject: Omit<Project, "id" | "updatedAt"> = {
  title: "",
  status: "ongoing",
  location: "",
  client: "",
  category: "",
  year: "",
  summary: "",
  description: "",
  imageUrl: "",
};

const emptyCareer: Omit<CareerOpening, "id" | "updatedAt"> = {
  title: "",
  location: "Chennai",
  employmentType: "Full-time",
  experience: "",
  qualification: "",
  description: "",
  isOpen: true,
};

const emptyTeamMember: Omit<TeamMember, "id" | "updatedAt"> = {
  name: "",
  designation: "",
  linkedIn: "",
  instagram: "",
  facebook: "",
  x: "",
  photoUrl: "",
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "projects", label: "Projects" },
  { id: "gallery", label: "Gallery" },
  { id: "vlogs", label: "Vlogs" },
  { id: "menu", label: "Menu Controls" },
  { id: "careers", label: "Careers" },
  { id: "team", label: "Team Members" },
  { id: "inquiries", label: "Inquiries" },
  { id: "maintenance", label: "Site Maintenance" },
];

const defaultMenuSections = ["about", "projects", "ongoing", "careers", "gallery", "vlog", "team", "contact"];

async function readResponse(response: Response, publish = true) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || "Request failed.");
  }
  if (publish) publishContentChange();

  // Most mutation endpoints return the stored admin data, while only the
  // state endpoint adds menuSections. Keep this derived UI field stable after
  // any save/delete action so the Menu Controls badge cannot briefly show 0.
  return {
    ...body,
    menuSections:
      Array.isArray(body.menuSections) && body.menuSections.length > 0
        ? body.menuSections
        : defaultMenuSections,
  } as AdminData;
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function projectMatchesGalleryImage(project: Pick<Project, "title" | "client">, image: GalleryImage) {
  const projectName = normalizeText(project.client || project.title || "");
  const projectTitle = normalizeText(project.title || "");

  if (!projectName && !projectTitle) {
    return false;
  }

  const imageText = normalizeText(`${image.title} ${image.category} ${image.alt}`);
  return (
    (projectName && imageText.includes(projectName)) ||
    (projectTitle && imageText.includes(projectTitle))
  );
}

function projectImageUrls(project: Pick<Project, "title" | "client" | "imageUrl">, gallery: GalleryImage[]) {
  const matchedUrls = gallery
    .filter((image) => projectMatchesGalleryImage(project, image))
    .map((image) => image.imageUrl);

  return [...new Set([project.imageUrl, ...matchedUrls].filter(Boolean))];
}

export function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("projects");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [careerForm, setCareerForm] = useState(emptyCareer);
  const [editingCareerId, setEditingCareerId] = useState<string | null>(null);
  const [vlogForm, setVlogForm] = useState<VlogFormState>({ title: "", details: "", youtubeUrl: "", thumbnailUrl: "" });
  const [editingVlogId, setEditingVlogId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState(emptyTeamMember);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      projects: data?.projects.length ?? 0,
      gallery: data?.gallery.length ?? 0,
      vlogs: data?.vlogs.length ?? 0,
      menu: data?.menuSections?.length ?? 0,
      careers: data?.careers.length ?? 0,
      team: data?.team?.length ?? 0,
      inquiries: data?.inquiries.filter((inquiry) => inquiry.status === "new").length ?? 0,
      maintenance: data?.settings?.maintenanceEnabled ? "On" : "Off",
    }),
    [data],
  );

  const insightCards = useMemo(
    () => [
      {
        label: "Live projects",
        value: counts.projects,
        detail: `${data?.projects.filter((project) => project.status === "completed").length ?? 0} completed`,
      },
      {
        label: "Gallery assets",
        value: counts.gallery,
        detail: "Published to gallery",
      },
      {
        label: "Open roles",
        value: data?.careers.filter((career) => career.isOpen).length ?? 0,
        detail: `${counts.careers} total roles`,
      },
      {
        label: "New inquiries",
        value: counts.inquiries,
        detail: "Need follow-up",
      },
    ],
    [counts, data],
  );

  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? "Workspace";
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredProjects = useMemo(
    () =>
      (data?.projects ?? []).filter((project) =>
        [project.title, project.client, project.location, project.category, project.year, project.status].some((value) =>
          value?.toLowerCase().includes(normalizedSearchTerm),
        ),
      ),
    [data?.projects, normalizedSearchTerm],
  );
  const filteredGallery = useMemo(
    () =>
      (data?.gallery ?? []).filter((image) =>
        [image.title, image.alt, image.category].some((value) => value.toLowerCase().includes(normalizedSearchTerm)),
      ),
    [data?.gallery, normalizedSearchTerm],
  );

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => setNotice(""), 15_000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function applyResponse(response: Response) {
    const next = await readResponse(response);
    stateRequest.current += 1;
    setData((current) => ({ ...next, settings: next.settings ?? current?.settings }));
  }

  const stateRequest = useRef(0);

  async function loadState(background = false) {
    const requestId = ++stateRequest.current;
    if (!background) setIsLoading(true);

    try {
      const response = await fetch("/api/admin/state", { cache: "no-store" });
      if (requestId !== stateRequest.current) return;

      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const next = await readResponse(response, false);
      if (requestId !== stateRequest.current) return;
      setData(next);
      setIsAuthenticated(true);
    } catch (error) {
      if (requestId === stateRequest.current) {
        if (error instanceof Error && error.message === "Unauthorized") setIsAuthenticated(false);
        else setNotice((error as Error).message);
      }
    } finally {
      if (!background) setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  useContentUpdates({ scope: "admin", enabled: isAuthenticated, onChange: () => { void loadState(true); } });

  // Listen for menu updates dispatched from MenuControlsPanel so UI updates immediately without a full refresh
  useEffect(() => {
    function onUpdated(event: Event) {
      const detail = (event as CustomEvent).detail as AdminData | undefined;
      if (detail) {
        stateRequest.current += 1;
        setData((current) => current ? { ...current, menu: detail.menu } : detail);
      }
    }

    function onNotice(event: Event) {
      const message = (event as CustomEvent).detail as string | undefined;
      if (message) setNotice(message);
    }

    window.addEventListener('admin-data-updated', onUpdated as EventListener);
    window.addEventListener('admin-notice', onNotice as EventListener);
    return () => {
      window.removeEventListener('admin-data-updated', onUpdated as EventListener);
      window.removeEventListener('admin-notice', onNotice as EventListener);
    };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Login failed.");
      }

      setPassword("");
      await loadState();
    } catch (error) {
      setNotice((error as Error).message);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setData(null);
    setIsAuthenticated(false);
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const formData = new FormData(event.currentTarget);
    const imageFiles = Array.from(formData.getAll("images")).filter(
      (file): file is File => file instanceof File && file.size > 0,
    );
    const fallbackFile = formData.get("image");
    const allFiles = imageFiles.length > 0
      ? imageFiles
      : fallbackFile instanceof File && fallbackFile.size > 0
        ? [fallbackFile]
        : [];

    if (allFiles.length > 0) {
      // Append all controlled state fields into FormData so the API can read them
      formData.set("title", projectForm.title);
      formData.set("status", projectForm.status);
      formData.set("client", projectForm.client);
      formData.set("location", projectForm.location);
      formData.set("category", projectForm.category || "");
      formData.set("year", projectForm.year || "");
      formData.set("summary", projectForm.summary);
      formData.set("description", projectForm.description);
      if (editingProjectId) {
        formData.set("id", editingProjectId);
      }

      const uploadUrl = editingProjectId
        ? `/api/admin/projects/${editingProjectId}`
        : "/api/admin/projects";
      const uploadMethod = editingProjectId ? "PUT" : "POST";

      const uploadResponse = await fetch(uploadUrl, {
        method: uploadMethod,
        body: formData,
      });

      await applyResponse(uploadResponse);
      setProjectForm(emptyProject);
      setEditingProjectId(null);
      setNotice("Project saved.");
      return;
    }

    const response = await fetch(editingProjectId ? `/api/admin/projects/${editingProjectId}` : "/api/admin/projects", {
      method: editingProjectId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectForm),
    });

    await applyResponse(response);
    setProjectForm(emptyProject);
    setEditingProjectId(null);
    setNotice("Project saved.");
  }


  async function deleteProject(id: string) {
    const response = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
    await applyResponse(response);
    setNotice("Project deleted.");
  }

  async function updateProjectStatus(id: string, status: ProjectStatus) {
    const response = await fetch(`/api/admin/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    await applyResponse(response);
    setNotice("Project status updated.");
  }

  async function saveCareer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const response = await fetch(editingCareerId ? `/api/admin/careers/${editingCareerId}` : "/api/admin/careers", {
      method: editingCareerId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(careerForm),
    });

    await applyResponse(response);
    setCareerForm(emptyCareer);
    setEditingCareerId(null);
    setNotice("Career opening saved.");
  }

  async function deleteCareer(id: string) {
    const response = await fetch(`/api/admin/careers/${id}`, { method: "DELETE" });
    await applyResponse(response);
    setNotice("Career opening deleted.");
  }

  async function saveTeamMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch(editingTeamId ? `/api/admin/team/${editingTeamId}` : "/api/admin/team", {
      method: editingTeamId ? "PUT" : "POST",
      body: formData,
    });

    await applyResponse(response);
    setTeamForm(emptyTeamMember);
    setEditingTeamId(null);
    setNotice(editingTeamId ? "Team member updated." : "Team member added.");
  }

  async function deleteTeamMember(id: string) {
    const response = await fetch(`/api/admin/team/${id}`, { method: "DELETE" });
    await applyResponse(response);
    setNotice("Team member deleted.");
  }

  async function uploadGallery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/admin/gallery", { method: "POST", body: formData });

    await applyResponse(response);
    form.reset();
    setNotice("Gallery images uploaded.");
  }

  async function deleteGalleryImage(id: string) {
    setNotice("");

    try {
      const response = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
      await applyResponse(response);
      setNotice("Gallery image deleted from the dashboard and public gallery.");
    } catch (error) {
      setNotice((error as Error).message);
    }
  }

  async function saveVlog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const formElement = event.currentTarget;

    try {

    const formData = new FormData(formElement);
    const title = String(formData.get("title") || "").trim();
    const details = String(formData.get("details") || "").trim();
    const youtubeUrl = String(formData.get("youtubeUrl") || "").trim();

    if (!title || !details || !youtubeUrl) {
      setNotice("Title, details and YouTube link are required.");
      return;
    }

    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(youtubeUrl)) {
      setNotice("Please enter a valid YouTube link.");
      return;
    }

    const isEditing = Boolean(editingVlogId);
    const response = await fetch(isEditing ? `/api/admin/vlogs/${editingVlogId}` : "/api/admin/vlogs", {
      method: isEditing ? "PUT" : "POST",
      body: formData,
    });

    await applyResponse(response);
    setVlogForm({ title: "", details: "", youtubeUrl: "", thumbnailUrl: "" });
    setEditingVlogId(null);
    formElement.reset();
    setNotice(isEditing ? "Vlog updated." : "Vlog published.");
    } catch (error) {
      // Keep the editor open and preserve the entered values so an upload or
      // remote persistence error can be corrected without retyping content.
      setNotice((error as Error).message || "Unable to update the vlog.");
    }
  }

  async function deleteVlog(id: string) {
    const response = await fetch(`/api/admin/vlogs/${id}`, { method: "DELETE" });
    await applyResponse(response);
    setNotice("Vlog deleted.");
  }

  async function updateInquiryStatus(id: string, status: InquiryStatus) {
    const response = await fetch(`/api/admin/inquiries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    await applyResponse(response);
  }

  async function deleteInquiry(id: string) {
    const response = await fetch(`/api/admin/inquiries/${id}`, { method: "DELETE" });
    await applyResponse(response);
    setNotice("Inquiry deleted.");
  }

  if (isLoading) {
    return <main className={styles.login}>Loading admin...</main>;
  }

  if (!isAuthenticated) {
    return (
      <main className={styles.login}>
        <form className={styles.loginPanel} onSubmit={login}>
          <div className={styles.panelTitle}>
            <div>
              <span>Intexspace</span>
              <h1>Admin Login</h1>
            </div>
          </div>
          <label className={styles.field}>
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              required
              type="password"
              value={password}
            />
          </label>
          <button className={styles.button} type="submit">
            Login
          </button>
          {notice ? <p className={styles.notice}>{notice}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span>Intexspace Command Studio</span>
          <h1>Admin Dashboard</h1>
          <p>Manage projects, gallery, hiring and inquiries from one publishing workspace.</p>
        </div>
        <div className={styles.headerActions}>
          <a className={`${styles.secondaryButton} ${styles.headerSiteButton}`} href="/" rel="noopener noreferrer" target="_blank">
            View Site
          </a>
          <button className={`${styles.secondaryButton} ${styles.headerRefreshButton}`} onClick={() => void loadState()} type="button">
            Refresh
          </button>
          <button className={`${styles.button} ${styles.headerLogoutButton}`} onClick={logout} type="button">
            Logout
          </button>
        </div>
      </header>

      <section className={styles.overview} aria-label="Dashboard overview">
        {insightCards.map((card) => (
          <article className={styles.metricCard} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      <div className={styles.main}>
        <nav className={styles.nav} aria-label="Admin sections">
          {tabs.map((tab) => (
            <button
              aria-current={activeTab === tab.id}
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm("");
              }}
              type="button"
            >
              <span>{tab.label}</span>
              <strong>{counts[tab.id]}</strong>
            </button>
          ))}
        </nav>

        <section className={styles.content}>
          <div className={styles.workspaceHeader}>
            <div>
              <span>Workspace</span>
              <h2>{activeLabel}</h2>
            </div>
            {activeTab === "projects" || activeTab === "gallery" ? (
              <label className={styles.workspaceSearch}>
                <span>Search {activeLabel}</span>
                <input
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={`Search ${activeLabel.toLowerCase()}...`}
                  type="search"
                  value={searchTerm}
                />
              </label>
            ) : null}
          </div>
              {notice ? (
                isAuthenticated ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className={styles.toast}
                    onClick={() => setNotice("")}
                  >
                    {notice}
                  </div>
                ) : (
                  <p className={styles.notice}>{notice}</p>
                )
              ) : null}
              {activeTab === "projects" && data ? (
            <ProjectsPanel
              data={filteredProjects}
              gallery={data.gallery}
              deleteProject={deleteProject}
              editingId={editingProjectId}
              form={projectForm}
              saveProject={saveProject}
              setEditingId={setEditingProjectId}
              setForm={setProjectForm}
              updateProjectStatus={updateProjectStatus}
            />
          ) : null}
          {activeTab === "gallery" && data ? (
            <GalleryPanel
              data={filteredGallery}
              deleteImage={deleteGalleryImage}
              uploadGallery={uploadGallery}
            />
          ) : null}
          {activeTab === "vlogs" && data ? (
            <VlogsPanel
              data={data.vlogs}
              editingId={editingVlogId}
              form={vlogForm}
              saveVlog={saveVlog}
              deleteVlog={deleteVlog}
              setEditingId={setEditingVlogId}
              setForm={setVlogForm}
            />
          ) : null}
          {activeTab === "menu" && data ? (
            <MenuControlsPanel data={data} />
          ) : null}
          {activeTab === "maintenance" && data ? (
            <MaintenancePanel settings={data.settings} onSaved={(settings) => {
              stateRequest.current += 1;
              setData((current) => current ? { ...current, settings } : current);
              setNotice(settings.maintenanceEnabled ? "Maintenance mode enabled." : "The public site is live.");
            }} />
          ) : null}
          {activeTab === "careers" && data ? (
            <CareersPanel
              data={data.careers}
              deleteCareer={deleteCareer}
              editingId={editingCareerId}
              form={careerForm}
              saveCareer={saveCareer}
              setEditingId={setEditingCareerId}
              setForm={setCareerForm}
            />
          ) : null}
          {activeTab === "team" && data ? (
            <TeamMembersPanel
              data={data.team || []}
              deleteTeamMember={deleteTeamMember}
              editingId={editingTeamId}
              form={teamForm}
              saveTeamMember={saveTeamMember}
              setEditingId={setEditingTeamId}
              setForm={setTeamForm}
            />
          ) : null}
          {activeTab === "inquiries" && data ? (
            <InquiriesPanel data={data.inquiries} deleteInquiry={deleteInquiry} updateStatus={updateInquiryStatus} />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function MaintenancePanel({ settings, onSaved }: { settings?: SiteSettings; onSaved: (settings: SiteSettings) => void }) {
  const [pending, setPending] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const enabled = settings?.maintenanceEnabled ?? false;

  useEffect(() => {
    if (pending !== null) dialog.current?.showModal();
    else dialog.current?.close();
  }, [pending]);

  async function confirm() {
    if (pending === null) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceEnabled: pending, confirmed: true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to update maintenance mode.");
      onSaved(body as SiteSettings);
      publishContentChange();
      setPending(null);
    } catch (error) {
      setError((error as Error).message);
    } finally { setSaving(false); }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelTitle}>
        <div><span>Site Status</span><h2>Site Maintenance</h2></div>
        <span className={enabled ? styles.menuStatusDisabled : styles.menuStatusEnabled}>{enabled ? "Under maintenance" : "Live"}</span>
      </div>
      <div className={styles.maintenanceRow}>
        <div><h3>Maintenance mode</h3><p>{enabled ? "Visitors see the maintenance page. Admin access remains available." : "Visitors can browse the public website."}</p></div>
        <button type="button" role="switch" aria-checked={enabled} aria-label="Maintenance mode"
          disabled={!settings || saving}
          className={`${styles.menuToggle} ${enabled ? styles.menuToggleEnabled : ""}`}
          onClick={() => { setError(""); setPending(!enabled); }}>
          <span className={styles.menuToggleKnob} />
        </button>
      </div>
      <div className={styles.maintenanceWarning} role="note">
        <strong>Warning</strong>
        <p>Enabling maintenance hides all public pages, including pages already open by visitors. Your content is kept, and the admin dashboard stays accessible.</p>
      </div>
      {settings?.updatedAt ? <p className={styles.maintenanceUpdated}>Last changed: {new Date(settings.updatedAt).toLocaleString()}</p> : null}
      <dialog ref={dialog} className={styles.maintenanceDialog} aria-labelledby="maintenance-confirm-title"
        onCancel={(event) => { if (saving) event.preventDefault(); else setPending(null); }}>
        <h2 id="maintenance-confirm-title">{pending ? "Enable maintenance mode?" : "Make the site live?"}</h2>
        <p>{pending ? "Visitors will immediately see the maintenance page. Admin access and saved content will remain available." : "All enabled public pages will be available to visitors immediately."}</p>
        {error ? <p className={styles.notice} role="alert">{error}</p> : null}
        <div className={styles.rowActions}>
          <button type="button" className={styles.secondaryButton} disabled={saving} onClick={() => setPending(null)}>Cancel</button>
          <button type="button" className={styles.button} disabled={saving} onClick={() => void confirm()}>
            {saving ? "Saving..." : pending ? "Enable Maintenance" : "Make Site Live"}
          </button>
        </div>
      </dialog>
    </section>
  );
}

function MenuControlsPanel({ data }: { data: AdminData }) {
  // Keep the control list visible if an older deployment, or a temporary
  // state-endpoint failure, does not provide the computed section list.
  const sections = data?.menuSections?.length
    ? data.menuSections
    : defaultMenuSections;
  const [draftMenu, setDraftMenu] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftMenu(Object.fromEntries(sections.map((slug) => [slug, data.menu?.[slug] !== false])));
  }, [JSON.stringify(data.menu), JSON.stringify(sections)]);

  const enabledCount = sections.filter((slug) => draftMenu[slug] !== false).length;
  const hasChanges = sections.some((slug) => (data.menu?.[slug] !== false) !== (draftMenu[slug] !== false));

  async function saveMenu() {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu: draftMenu }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to update menu state');
      }

      // The PUT response contains the raw stored AdminData (without computed fields like
      // menuSections or merged gallery). Extract only the updated menu map and merge it
      // into the existing data so that menuSections and other fields are preserved.
      const body = await response.json().catch(() => ({})) as { menu?: Record<string, boolean> };
      const updatedMenu: Record<string, boolean> = body.menu ?? draftMenu;
      publishContentChange();
      const merged: AdminData = { ...data, menu: updatedMenu };

      const event = new CustomEvent('admin-data-updated', { detail: merged });
      window.dispatchEvent(event as Event);

      const notice = new CustomEvent('admin-notice', { detail: 'Menu visibility settings saved.' });
      window.dispatchEvent(notice as Event);
    } catch (error) {
      // Best-effort notice via DOM event as well
      const evt = new CustomEvent('admin-notice', { detail: (error as Error).message });
      window.dispatchEvent(evt as Event);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelTitle}>
        <div>
          <span>Configure</span>
          <h2>Menu Controls</h2>
          <p>Choose which sections are visible on the public site, then save all changes together.</p>
        </div>
        <div className={styles.menuSummary}>{enabledCount} of {sections.length} enabled</div>
      </div>
      <div className={styles.menuToolbar}>
        <button className={styles.secondaryButton} onClick={() => setDraftMenu(Object.fromEntries(sections.map((slug) => [slug, true])))} type="button">
          Enable All
        </button>
        <button className={styles.secondaryButton} onClick={() => setDraftMenu(Object.fromEntries(sections.map((slug) => [slug, false])))} type="button">
          Disable All
        </button>
        <button className={styles.button} disabled={!hasChanges || isSaving} onClick={() => void saveMenu()} type="button">
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
      <div className={styles.list}>
        {sections.map((slug) => {
          const isEnabled = draftMenu[slug] !== false;
          const label = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          return (
            <article className={`${styles.item} ${styles.itemNoImage} ${styles.menuItem}`} key={slug}>
              <div>
                <h3>{label}</h3>
                <p>{isEnabled ? 'Visible on the public site' : 'Hidden from the public site'}</p>
              </div>
              <div className={styles.rowActions}>
                <span className={isEnabled ? styles.menuStatusEnabled : styles.menuStatusDisabled}>{isEnabled ? 'Enabled' : 'Disabled'}</span>
                <button
                  aria-checked={isEnabled}
                  aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${label}`}
                  className={`${styles.menuToggle} ${isEnabled ? styles.menuToggleEnabled : ''}`}
                  onClick={() => setDraftMenu((current) => ({ ...current, [slug]: !isEnabled }))}
                  role="switch"
                  type="button"
                >
                  <span className={styles.menuToggleKnob} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TeamMembersPanel({
  data,
  deleteTeamMember,
  editingId,
  form,
  saveTeamMember,
  setEditingId,
  setForm,
}: {
  data: TeamMember[];
  deleteTeamMember: (id: string) => Promise<void>;
  editingId: string | null;
  form: Omit<TeamMember, "id" | "updatedAt">;
  saveTeamMember: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  setEditingId: (id: string | null) => void;
  setForm: (form: Omit<TeamMember, "id" | "updatedAt">) => void;
}) {
  return (
    <>
      <div
        className={editingId ? styles.modalBackdrop : undefined}
        onClick={(event) => {
          if (editingId && event.target === event.currentTarget) {
            setEditingId(null);
            setForm(emptyTeamMember);
          }
        }}
      >
        <section className={`${styles.panel} ${styles.editorPanel} ${editingId ? styles.modalPanel : ""}`}>
          <div className={styles.panelTitle}>
            <div>
              <span>{editingId ? "Edit" : "Add"}</span>
              <h2>Team Member</h2>
              <p>Team member profiles publish to the public site.</p>
            </div>
            {editingId ? (
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyTeamMember);
                }}
                type="button"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
          <form className={styles.form} onSubmit={saveTeamMember}>
            <div className={styles.grid}>
              <label className={styles.field}>
                Name
                <input name="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label className={styles.field}>
                Designation
                <input name="designation" required value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} />
              </label>
              <label className={styles.field}>
                LinkedIn
                <input name="linkedIn" value={form.linkedIn || ""} onChange={(event) => setForm({ ...form, linkedIn: event.target.value })} type="url" />
              </label>
              <label className={styles.field}>
                Instagram
                <input name="instagram" value={form.instagram || ""} onChange={(event) => setForm({ ...form, instagram: event.target.value })} type="url" />
              </label>
              <label className={styles.field}>
                Facebook
                <input name="facebook" value={form.facebook || ""} onChange={(event) => setForm({ ...form, facebook: event.target.value })} type="url" />
              </label>
              <label className={styles.field}>
                X (Twitter)
                <input name="x" value={form.x || ""} onChange={(event) => setForm({ ...form, x: event.target.value })} type="url" />
              </label>
              <label className={`${styles.field} ${styles.wide}`}>
                Photo
                <input accept="image/*" name="photo" type="file" required={!editingId} />
              </label>
            </div>
            <button className={styles.button} type="submit">
              {editingId ? "Update Team Member" : "Add Team Member"}
            </button>
          </form>
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelTitle}>
          <div>
            <span>Manage</span>
            <h2>Team Members</h2>
            <p>View and maintain your team profiles from one place.</p>
          </div>
        </div>
        <div className={styles.list}>
          {data.map((member) => (
            <article className={styles.item} key={member.id}>
              <img className={styles.itemImage} alt={member.name} src={member.photoUrl} />
              <div>
                <h3>{member.name}</h3>
                <p>{member.designation}</p>
                <div className={styles.meta}>
                  {member.linkedIn ? <span>LinkedIn</span> : null}
                  {member.instagram ? <span>Instagram</span> : null}
                  {member.facebook ? <span>Facebook</span> : null}
                  {member.x ? <span>X</span> : null}
                </div>
              </div>
              <div className={styles.rowActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => {
                    setEditingId(member.id);
                    setForm({
                      name: member.name,
                      designation: member.designation,
                      linkedIn: member.linkedIn || "",
                      instagram: member.instagram || "",
                      facebook: member.facebook || "",
                      x: member.x || "",
                      photoUrl: member.photoUrl,
                      storagePath: member.storagePath,
                    });
                  }}
                  type="button"
                >
                  Edit
                </button>
                <button className={styles.dangerButton} onClick={() => void deleteTeamMember(member.id)} type="button">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ProjectsPanel({
  data,
  gallery,
  deleteProject,
  editingId,
  form,
  saveProject,
  setEditingId,
  setForm,
  updateProjectStatus,
}: {
  data: Project[];
  gallery: GalleryImage[];
  deleteProject: (id: string) => Promise<void>;
  editingId: string | null;
  form: Omit<Project, "id" | "updatedAt">;
  saveProject: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  setEditingId: (id: string | null) => void;
  setForm: (form: Omit<Project, "id" | "updatedAt">) => void;
  updateProjectStatus: (id: string, status: ProjectStatus) => Promise<void>;
}) {
  return (
    <>
      <div
        className={editingId ? styles.modalBackdrop : undefined}
        onClick={(event) => {
          if (editingId && event.target === event.currentTarget) {
            setEditingId(null);
            setForm(emptyProject);
          }
        }}
      >
      <section className={`${styles.panel} ${styles.editorPanel} ${editingId ? styles.modalPanel : ""}`}>
        <div className={styles.panelTitle}>
          <div>
            <span>{editingId ? "Edit" : "Add"}</span>
            <h2>Project</h2>
            <p>Project cards publish to the public projects page.</p>
          </div>
          {editingId ? (
            <button
              className={styles.secondaryButton}
              onClick={() => {
                setEditingId(null);
                setForm(emptyProject);
              }}
              type="button"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
        <form className={styles.form} onSubmit={saveProject}>
          {editingId ? (
            <div className={styles.projectPreview}>
              <span>Current project images</span>
              <div className={styles.projectPreviewGrid}>
                {projectImageUrls(form, gallery).length ? projectImageUrls(form, gallery).map((src, index) => (
                  <img key={`${src}-${index}`} alt={`Project image ${index + 1}`} src={src} />
                )) : <p className={styles.emptyImages}>No images added.</p>}
              </div>
            </div>
          ) : null}
          <div className={styles.grid}>
            <label className={styles.field}>
              Project Name
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label className={styles.field}>
              Status
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })}>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className={styles.field}>
              Client
              <input value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} />
            </label>
            <label className={styles.field}>
              Location
              <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </label>
            <label className={styles.field}>
              Category
              <input
                list="projectCategories"
                placeholder="Select or type a category"
                value={form.category || ""}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              />
              <datalist id="projectCategories">
                <option value="Banking" />
                <option value="Healthcare" />
                <option value="Offices" />
                <option value="Residential" />
                <option value="Airports" />
                <option value="Telecom" />
                <option value="Education" />
                <option value="Industrial" />
                <option value="Maritime" />
              </datalist>
            </label>
            <label className={styles.field}>
              Year
              <input value={form.year || ""} onChange={(event) => setForm({ ...form, year: event.target.value })} />
            </label>
            <label className={`${styles.field} ${styles.wide}`}>
              Project Images
              <input accept="image/*" multiple name="images" type="file" />
              <small>Upload one or more images. The first file becomes the featured project image; additional files are added to the gallery.</small>
            </label>
            {editingId && form.imageUrl ? (
              <div className={`${styles.field} ${styles.wide}`}>
                <input name="removeImage" type="hidden" value="false" />
                <button className={styles.dangerButton} onClick={() => setForm({ ...form, imageUrl: "" })} type="button">
                  Remove featured project image
                </button>
                <small>This removes only the featured image. Manually added matching gallery images will continue to display.</small>
              </div>
            ) : editingId ? <input name="removeImage" type="hidden" value="true" /> : null}
            <label className={`${styles.field} ${styles.wide}`}>
              Summary
              <input value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
            </label>
            <label className={`${styles.field} ${styles.wide}`}>
              Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
          </div>
          <button className={styles.button} type="submit">
            {editingId ? "Update Project" : "Add Project"}
          </button>
        </form>
      </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelTitle}>
          <div>
            <span>Manage</span>
            <h2>Project Status</h2>
            <p>Keep delivery stages current for visitors and internal follow-up.</p>
          </div>
        </div>
        <div className={styles.list}>
          {data.map((project) => (
            <article className={styles.item} key={project.id}>
              {project.imageUrl ? <img className={styles.itemImage} alt="" src={project.imageUrl} /> : <div className={styles.imagePlaceholder}>No image</div>}
              <div>
                <h3>{project.title}</h3>
                <p>{project.summary || project.description}</p>
                <div className={styles.meta}>
                  <span>{project.status}</span>
                  <span>{project.client || "No client"}</span>
                  <span>{project.location || "No location"}</span>
                  {project.category ? <span>{project.category}</span> : null}
                  {project.year ? <span>{project.year}</span> : null}
                </div>
              </div>
              <div className={styles.rowActions}>
                <select
                  value={project.status}
                  onChange={(event) => void updateProjectStatus(project.id, event.target.value as ProjectStatus)}
                >
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
                <button
                  className={styles.secondaryButton}
                  onClick={() => {
                    setEditingId(project.id);
                    setForm({
                      title: project.title,
                      status: project.status,
                      location: project.location,
                      client: project.client,
                      category: project.category || "",
                      year: project.year || "",
                      summary: project.summary,
                      description: project.description,
                      imageUrl: project.imageUrl,
                    });
                  }}
                  type="button"
                >
                  Edit
                </button>
                <button className={styles.dangerButton} onClick={() => void deleteProject(project.id)} type="button">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function GalleryPanel({
  data,
  deleteImage,
  uploadGallery,
}: {
  data: GalleryImage[];
  deleteImage: (id: string) => Promise<void>;
  uploadGallery: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const [imagePendingDeletion, setImagePendingDeletion] = useState<GalleryImage | null>(null);

  return (
    <>
    <section className={styles.panel}>
      <div className={styles.panelTitle}>
        <div>
          <span>Upload</span>
          <h2>Gallery Images</h2>
          <p>Upload any number of images to the public gallery.</p>
        </div>
      </div>
      <form className={styles.form} onSubmit={uploadGallery}>
        <div className={styles.grid}>
          <label className={`${styles.field} ${styles.wide}`}>
            Images
            <input accept="image/*" multiple name="images" required type="file" />
            <small>Select as many images as needed.</small>
          </label>
        </div>
        <div className={styles.rowActions}>
          <button className={styles.button} type="submit">Upload Images</button>
        </div>
      </form>
    </section>

    <section className={styles.panel}>
      <div className={styles.galleryGrid}>
        {data.map((image) => {
          return (
            <article className={styles.galleryCard} key={image.id}>
              <img alt={image.alt} src={image.imageUrl} />
              <div>
                <div className={styles.rowActions}>
                  <button className={styles.dangerButton} onClick={() => setImagePendingDeletion(image)} type="button">
                    Delete
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
    {imagePendingDeletion ? (
      <div className={styles.modalBackdrop} onClick={() => setImagePendingDeletion(null)}>
        <section
          aria-labelledby="gallery-delete-title"
          aria-modal="true"
          className={`${styles.panel} ${styles.modalPanel}`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className={styles.panelTitle}>
            <div>
              <span>Confirm deletion</span>
              <h2 id="gallery-delete-title">Delete this image?</h2>
              <p>“{imagePendingDeletion.title}” will be removed from the admin dashboard and public gallery.</p>
            </div>
          </div>
          <div className={styles.rowActions}>
            <button className={styles.secondaryButton} onClick={() => setImagePendingDeletion(null)} type="button">
              Keep Image
            </button>
            <button
              className={styles.dangerButton}
              onClick={() => {
                void deleteImage(imagePendingDeletion.id);
                setImagePendingDeletion(null);
              }}
              type="button"
            >
              Delete Image
            </button>
          </div>
        </section>
      </div>
    ) : null}
    </>
  );
}

function VlogsPanel({
  data,
  editingId,
  form,
  saveVlog,
  deleteVlog,
  setEditingId,
  setForm,
}: {
  data: Vlog[];
  editingId: string | null;
  form: VlogFormState;
  saveVlog: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  deleteVlog: (id: string) => Promise<void>;
  setEditingId: (id: string | null) => void;
  setForm: (form: VlogFormState) => void;
}) {
  return (
    <>
      <div
        className={editingId ? styles.modalBackdrop : undefined}
        onClick={(event) => {
          if (editingId && event.target === event.currentTarget) {
            setEditingId(null);
            setForm({ title: "", details: "", youtubeUrl: "", thumbnailUrl: "" });
          }
        }}
      >
      <section className={`${styles.panel} ${editingId ? styles.modalPanel : ""}`}>
        <div className={styles.panelTitle}>
          <div>
            <span>{editingId ? "Edit" : "Publish"}</span>
            <h2>Vlog</h2>
            <p>Publish or update a project story that links visitors to YouTube.</p>
          </div>
          {editingId ? (
            <button
              className={styles.secondaryButton}
              onClick={() => {
                setEditingId(null);
                setForm({ title: "", details: "", youtubeUrl: "", thumbnailUrl: "" });
              }}
              type="button"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
        <form className={styles.form} onSubmit={saveVlog}>
          <div className={styles.grid}>
            <label className={styles.field}>
              Title
              <input name="title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label className={styles.field}>
              YouTube link
              <input name="youtubeUrl" required type="url" value={form.youtubeUrl} onChange={(event) => setForm({ ...form, youtubeUrl: event.target.value })} />
            </label>
            <label className={`${styles.field} ${styles.wide}`}>
              Details
              <textarea name="details" required value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} />
            </label>
            <label className={styles.field}>
              Thumbnail
              <input accept="image/*" name="thumbnail" required={!editingId} type="file" />
            </label>
            {editingId && form.thumbnailUrl ? (
              <div className={`${styles.field} ${styles.wide}`}>
                <span>Current thumbnail</span>
                <img alt="Current vlog thumbnail" className={styles.itemImage} src={form.thumbnailUrl} />
              </div>
            ) : null}
          </div>
          <button className={styles.button} type="submit">
            {editingId ? "Update Vlog" : "Publish Vlog"}
          </button>
        </form>
      </section>
      </div>
      <section className={styles.panel}>
        <div className={styles.galleryGrid}>
          {data.map((vlog) => (
            <article className={styles.galleryCard} key={vlog.id}>
              <img alt="" src={vlog.thumbnailUrl} />
              <div>
                <strong>{vlog.title}</strong>
                <span>{vlog.details}</span>
                <div className={styles.rowActions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => {
                      setEditingId(vlog.id);
                      setForm({ title: vlog.title, details: vlog.details, youtubeUrl: vlog.youtubeUrl, thumbnailUrl: vlog.thumbnailUrl });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <a className={styles.secondaryButton} href={vlog.youtubeUrl} rel="noreferrer" target="_blank">
                    Open video
                  </a>
                  <button className={styles.dangerButton} onClick={() => void deleteVlog(vlog.id)} type="button">
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function CareersPanel({
  data,
  deleteCareer,
  editingId,
  form,
  saveCareer,
  setEditingId,
  setForm,
}: {
  data: CareerOpening[];
  deleteCareer: (id: string) => Promise<void>;
  editingId: string | null;
  form: Omit<CareerOpening, "id" | "updatedAt">;
  saveCareer: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  setEditingId: (id: string | null) => void;
  setForm: (form: Omit<CareerOpening, "id" | "updatedAt">) => void;
}) {
  return (
    <>
      <div
        className={editingId ? styles.modalBackdrop : undefined}
        onClick={(event) => {
          if (editingId && event.target === event.currentTarget) {
            setEditingId(null);
            setForm(emptyCareer);
          }
        }}
      >
      <section className={`${styles.panel} ${styles.editorPanel} ${editingId ? styles.modalPanel : ""}`}>
        <div className={styles.panelTitle}>
          <div>
            <span>{editingId ? "Edit" : "Add"}</span>
            <h2>Career Opening</h2>
            <p>Open roles publish to the public careers page.</p>
          </div>
          {editingId ? (
            <button
              className={styles.secondaryButton}
              onClick={() => {
                setEditingId(null);
                setForm(emptyCareer);
              }}
              type="button"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
        <form className={styles.form} onSubmit={saveCareer}>
          <div className={styles.grid}>
            <label className={styles.field}>
              Title
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label className={styles.field}>
              Location
              <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </label>
            <label className={styles.field}>
              Employment Type
              <input value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value })} />
            </label>
            <label className={styles.field}>
              Experience
              <input value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} />
            </label>
            <label className={`${styles.field} ${styles.wide}`}>
              Qualification
              <input value={form.qualification} onChange={(event) => setForm({ ...form, qualification: event.target.value })} />
            </label>
            <label className={`${styles.field} ${styles.wide}`}>
              Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <label className={styles.field}>
              Status
              <select value={String(form.isOpen)} onChange={(event) => setForm({ ...form, isOpen: event.target.value === "true" })}>
                <option value="true">Open</option>
                <option value="false">Closed</option>
              </select>
            </label>
          </div>
          <button className={styles.button} type="submit">
            {editingId ? "Update Opening" : "Add Opening"}
          </button>
        </form>
      </section>
      </div>
      <section className={styles.panel}>
        <div className={styles.panelTitle}>
          <div>
            <span>Pipeline</span>
            <h2>Hiring Board</h2>
          </div>
        </div>
        <div className={styles.list}>
          {data.map((career) => (
            <article className={`${styles.item} ${styles.itemNoImage}`} key={career.id}>
              <div>
                <h3>{career.title}</h3>
                <p>{career.description}</p>
                <div className={styles.meta}>
                  <span>{career.isOpen ? "Open" : "Closed"}</span>
                  <span>{career.location}</span>
                  <span>{career.employmentType}</span>
                </div>
              </div>
              <div className={styles.rowActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => {
                    setEditingId(career.id);
                    setForm({
                      title: career.title,
                      location: career.location,
                      employmentType: career.employmentType,
                      experience: career.experience,
                      qualification: career.qualification,
                      description: career.description,
                      isOpen: career.isOpen,
                    });
                  }}
                  type="button"
                >
                  Edit
                </button>
                <button className={styles.dangerButton} onClick={() => void deleteCareer(career.id)} type="button">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function InquiriesPanel({
  data,
  deleteInquiry,
  updateStatus,
}: {
  data: Inquiry[];
  deleteInquiry: (id: string) => Promise<void>;
  updateStatus: (id: string, status: InquiryStatus) => Promise<void>;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelTitle}>
        <div>
          <span>Manage</span>
          <h2>Inquiries</h2>
          <p>Track new messages from the public contact form.</p>
        </div>
      </div>
      <div className={styles.list}>
        {data.map((inquiry) => (
          <article className={`${styles.item} ${styles.itemNoImage}`} key={inquiry.id}>
            <div>
              <h3>{inquiry.name}</h3>
              <p>{inquiry.message || inquiry.subject}</p>
              <div className={styles.meta}>
                <span>{inquiry.status}</span>
                <span>{inquiry.email}</span>
                <span>{inquiry.phone}</span>
                <span>{new Date(inquiry.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className={styles.rowActions}>
              <select value={inquiry.status} onChange={(event) => void updateStatus(inquiry.id, event.target.value as InquiryStatus)}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
              </select>
              <a className={styles.secondaryButton} href={`mailto:${inquiry.email}`}>
                Email
              </a>
              <button className={styles.dangerButton} onClick={() => void deleteInquiry(inquiry.id)} type="button">
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
