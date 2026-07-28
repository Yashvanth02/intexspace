"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./AdminDashboard.module.css";

type ProjectStatus = "ongoing" | "in-progress" | "completed" | "on-hold";
type InquiryStatus = "new" | "contacted" | "closed";
type Tab = "projects" | "gallery" | "vlogs" | "careers" | "team" | "inquiries" | "menu";

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
};

const emptyGallery: Omit<GalleryImage, "id" | "uploadedAt"> = {
  title: "",
  imageUrl: "",
  alt: "",
  category: "Completed Projects",
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
  imageUrl: "/images/project-workplace-fabric.jpg",
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
];

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || "Request failed.");
  }

  return body as AdminData;
}

function isGenericGalleryTitle(title: string) {
  return /^(img|image|photo|whatsapp|vid|video|screenshot|snapshot)[^a-z0-9]*\d*/i.test(title.trim());
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
  const [galleryForm, setGalleryForm] = useState(emptyGallery);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [vlogForm, setVlogForm] = useState({ title: "", details: "", youtubeUrl: "" });
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

  async function loadState() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/state", { cache: "no-store" });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      setData(await readResponse(response));
      setIsAuthenticated(true);
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  // Listen for menu updates dispatched from MenuControlsPanel so UI updates immediately without a full refresh
  useEffect(() => {
    function onUpdated(event: Event) {
      const detail = (event as CustomEvent).detail as AdminData | undefined;
      if (detail) setData(detail);
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
    const imageFile = formData.get("image") instanceof File ? (formData.get("image") as File) : null;

    if (imageFile && imageFile.size > 0) {
      const uploadResponse = await fetch("/api/admin/projects", {
        method: "POST",
        body: formData,
      });

      const nextData = await readResponse(uploadResponse);
      setData(nextData);
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

    setData(await readResponse(response));
    setProjectForm(emptyProject);
    setEditingProjectId(null);
    setNotice("Project saved.");
  }

  async function deleteProject(id: string) {
    const response = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
    setData(await readResponse(response));
    setNotice("Project deleted.");
  }

  async function updateProjectStatus(id: string, status: ProjectStatus) {
    const response = await fetch(`/api/admin/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setData(await readResponse(response));
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

    setData(await readResponse(response));
    setCareerForm(emptyCareer);
    setEditingCareerId(null);
    setNotice("Career opening saved.");
  }

  async function deleteCareer(id: string) {
    const response = await fetch(`/api/admin/careers/${id}`, { method: "DELETE" });
    setData(await readResponse(response));
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

    const nextData = await readResponse(response);
    setData(nextData);
    setTeamForm(emptyTeamMember);
    setEditingTeamId(null);
    setNotice(editingTeamId ? "Team member updated." : "Team member added.");
  }

  async function deleteTeamMember(id: string) {
    const response = await fetch(`/api/admin/team/${id}`, { method: "DELETE" });
    setData(await readResponse(response));
    setNotice("Team member deleted.");
  }

  async function uploadGallery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    let response: Response;

    if (editingGalleryId) {
      response = await fetch(`/api/admin/gallery/${editingGalleryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(formData.get("title") || "").trim(),
          category: String(formData.get("category") || "Completed Projects").trim(),
          alt: String(formData.get("alt") || "").trim(),
        }),
      });
    } else {
      response = await fetch("/api/admin/gallery", { method: "POST", body: formData });
    }

    setData(await readResponse(response));
    form.reset();
    setEditingGalleryId(null);
    setGalleryForm(emptyGallery);
    setNotice(editingGalleryId ? "Gallery metadata updated." : "Gallery image uploaded.");
  }

  async function deleteGalleryImage(id: string) {
    setNotice("");

    try {
      const response = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
      setData(await readResponse(response));
      setNotice("Gallery image deleted from the dashboard and public gallery.");
    } catch (error) {
      setNotice((error as Error).message);
    }
  }

  async function saveVlog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const response = await fetch("/api/admin/vlogs", { method: "POST", body: new FormData(event.currentTarget) });
    setData(await readResponse(response));
    setVlogForm({ title: "", details: "", youtubeUrl: "" });
    event.currentTarget.reset();
    setNotice("Vlog published.");
  }

  async function deleteVlog(id: string) {
    const response = await fetch(`/api/admin/vlogs/${id}`, { method: "DELETE" });
    setData(await readResponse(response));
    setNotice("Vlog deleted.");
  }

  async function updateInquiryStatus(id: string, status: InquiryStatus) {
    const response = await fetch(`/api/admin/inquiries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setData(await readResponse(response));
  }

  async function deleteInquiry(id: string) {
    const response = await fetch(`/api/admin/inquiries/${id}`, { method: "DELETE" });
    setData(await readResponse(response));
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
          <a className={styles.secondaryButton} href="/" target="_blank">
            View Site
          </a>
          <button className={styles.secondaryButton} onClick={loadState} type="button">
            Refresh
          </button>
          <button className={styles.button} onClick={logout} type="button">
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
          {notice ? <p className={styles.notice}>{notice}</p> : null}
          {activeTab === "projects" && data ? (
            <ProjectsPanel
              data={filteredProjects}
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
              form={galleryForm}
              setForm={setGalleryForm}
              editingId={editingGalleryId}
              setEditingId={setEditingGalleryId}
            />
          ) : null}
          {activeTab === "vlogs" && data ? <VlogsPanel data={data.vlogs} form={vlogForm} setForm={setVlogForm} saveVlog={saveVlog} deleteVlog={deleteVlog} /> : null}
          {activeTab === "menu" && data ? (
            <MenuControlsPanel data={data} />
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

function MenuControlsPanel({ data }: { data: AdminData }) {
  const sections = data?.menuSections || [];

  async function toggleSection(slug: string, enabled: boolean) {
    try {
      const response = await fetch('/api/admin/menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, enabled }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to update menu state');
      }

      const next = await readResponse(response);
      // update top-level data state by setting it in the enclosing component via setData call in parent
      // But this component has no direct access to setData; rely on the response to be merged via loadState when needed.
      // To allow immediate UI update, dispatch a custom event with updated data.
      const event = new CustomEvent('admin-data-updated', { detail: next });
      window.dispatchEvent(event as Event);
    } catch (error) {
      // Best-effort notice via DOM event as well
      const evt = new CustomEvent('admin-notice', { detail: (error as Error).message });
      window.dispatchEvent(evt as Event);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelTitle}>
        <div>
          <span>Configure</span>
          <h2>Menu Controls</h2>
          <p>Enable or disable major sections on the public user dashboard.</p>
        </div>
      </div>
      <div className={styles.list}>
        {sections.map((slug) => {
          const isEnabled = data?.menu?.[slug] !== false;
          const label = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          return (
            <article className={`${styles.item} ${styles.itemNoImage}`} key={slug}>
              <div>
                <h3>{label}</h3>
              </div>
              <div className={styles.rowActions}>
                <label className={styles.field} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    checked={isEnabled}
                    onChange={(e) => toggleSection(slug, e.currentTarget.checked)}
                    type="checkbox"
                  />
                  <span style={{ marginLeft: 6 }}>{isEnabled ? 'Enabled' : 'Disabled'}</span>
                </label>
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
  deleteProject,
  editingId,
  form,
  saveProject,
  setEditingId,
  setForm,
  updateProjectStatus,
}: {
  data: Project[];
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
          <div className={styles.grid}>
            <label className={styles.field}>
              Project Name
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label className={styles.field}>
              Status
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })}>
                <option value="ongoing">Ongoing</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
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
              <input value={form.category || ""} onChange={(event) => setForm({ ...form, category: event.target.value })} />
            </label>
            <label className={styles.field}>
              Year
              <input value={form.year || ""} onChange={(event) => setForm({ ...form, year: event.target.value })} />
            </label>
            <label className={`${styles.field} ${styles.wide}`}>
              Project Image
              <input accept="image/*" name="image" type="file" />
            </label>
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
              <img className={styles.itemImage} alt="" src={project.imageUrl} />
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
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
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
  form,
  setForm,
  editingId,
  setEditingId,
}: {
  data: GalleryImage[];
  deleteImage: (id: string) => Promise<void>;
  uploadGallery: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  form: Omit<GalleryImage, "id" | "uploadedAt">;
  setForm: (form: Omit<GalleryImage, "id" | "uploadedAt">) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const [imagePendingDeletion, setImagePendingDeletion] = useState<GalleryImage | null>(null);

  return (
    <>
    <div
      className={editingId ? styles.modalBackdrop : undefined}
      onClick={(event) => {
        if (editingId && event.target === event.currentTarget) {
          setEditingId(null);
          setForm(emptyGallery);
        }
      }}
    >
    <section className={`${styles.panel} ${editingId ? styles.modalPanel : ""}`}>
      <div className={styles.panelTitle}>
        <div>
          <span>Upload</span>
          <h2>Gallery Images</h2>
          <p>New images are added to the public gallery page.</p>
        </div>
      </div>
      <form className={styles.form} onSubmit={uploadGallery}>
        <div className={styles.grid}>
          <label className={styles.field}>
            Title
            <input
              name="title"
              required
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <label className={styles.field}>
            Category
            <input
              name="category"
              placeholder="Completed Projects"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
          </label>
          <label className={styles.field}>
            Alt Text
            <input
              name="alt"
              value={form.alt}
              onChange={(event) => setForm({ ...form, alt: event.target.value })}
            />
          </label>
          <label className={styles.field}>
            Image
            <input accept="image/*" name="image" required={!editingId} type="file" />
          </label>
        </div>
        <div className={styles.rowActions}>
          {editingId ? (
            <button
              className={styles.secondaryButton}
              onClick={() => {
                setEditingId(null);
                setForm({ ...emptyGallery, category: "Completed Projects" });
              }}
              type="button"
            >
              Cancel Edit
            </button>
          ) : null}
          <button className={styles.button} type="submit">
            {editingId ? "Update Gallery Item" : "Upload Image"}
          </button>
        </div>
      </form>
    </section>
    </div>

    <section className={styles.panel}>
      <div className={styles.galleryGrid}>
        {data.map((image) => {
          const cardTitle = isGenericGalleryTitle(image.title)
            ? image.category || image.alt || "Completed Projects"
            : image.title;
          const cardSubtitle = "Completed Projects";

          return (
            <article className={styles.galleryCard} key={image.id}>
              <img alt={image.alt} src={image.imageUrl} />
              <div>
                <strong>{cardTitle}</strong>
                <span>{cardSubtitle}</span>
                <div className={styles.rowActions}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => {
                      setEditingId(image.id);
                      setForm({ title: image.title, imageUrl: image.imageUrl, alt: image.alt, category: image.category });
                    }}
                    type="button"
                  >
                    Edit
                  </button>
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

function VlogsPanel({ data, form, setForm, saveVlog, deleteVlog }: { data: Vlog[]; form: { title: string; details: string; youtubeUrl: string }; setForm: (form: { title: string; details: string; youtubeUrl: string }) => void; saveVlog: (event: FormEvent<HTMLFormElement>) => Promise<void>; deleteVlog: (id: string) => Promise<void> }) {
  return <><section className={styles.panel}><div className={styles.panelTitle}><div><span>Publish</span><h2>Vlog</h2><p>Publish a project story that links visitors to YouTube.</p></div></div><form className={styles.form} onSubmit={saveVlog}><div className={styles.grid}><label className={styles.field}>Title<input name="title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label className={styles.field}>YouTube link<input name="youtubeUrl" required type="url" value={form.youtubeUrl} onChange={(event) => setForm({ ...form, youtubeUrl: event.target.value })} /></label><label className={`${styles.field} ${styles.wide}`}>Details<textarea name="details" required value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} /></label><label className={styles.field}>Thumbnail<input accept="image/*" name="thumbnail" required type="file" /></label></div><button className={styles.button} type="submit">Publish Vlog</button></form></section><section className={styles.panel}><div className={styles.galleryGrid}>{data.map((vlog) => <article className={styles.galleryCard} key={vlog.id}><img alt="" src={vlog.thumbnailUrl} /><div><strong>{vlog.title}</strong><span>{vlog.details}</span><div className={styles.rowActions}><a className={styles.secondaryButton} href={vlog.youtubeUrl} rel="noreferrer" target="_blank">Open video</a><button className={styles.dangerButton} onClick={() => void deleteVlog(vlog.id)} type="button">Delete</button></div></div></article>)}</div></section></>;
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
      <section className={`${styles.panel} ${styles.editorPanel}`}>
        <div className={styles.panelTitle}>
          <div>
            <span>{editingId ? "Edit" : "Add"}</span>
            <h2>Career Opening</h2>
            <p>Open roles publish to the public careers page.</p>
          </div>
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
