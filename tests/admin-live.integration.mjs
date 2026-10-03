import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const timestamp = "2026-10-03T00:00:00.000Z";
const project = { id: "live-project", title: "Live Test Project", status: "completed", location: "Chennai", client: "Live Test", category: "airports", year: "2026", summary: "Initial scope", description: "Initial details", imageUrl: "/images/project-cruise-terminal.jpg", updatedAt: timestamp };
const gallery = { id: "live-gallery", title: "Live gallery", imageUrl: "/images/gallery-1.jpg", alt: "Live gallery", category: "Gallery", uploadedAt: timestamp };
const vlog = { id: "live-vlog", title: "Live vlog", details: "Initial vlog", youtubeUrl: "https://www.youtube.com/watch?v=Y-x0efG1seA", thumbnailUrl: "/images/gallery-1.jpg", createdAt: timestamp };
const seed = {
  projects: [project, { ...project, id: "imported-project", title: "Dena Bank | Gujarat | 2017-18", client: "Dena Bank", category: "Banking & Financial Services", location: "Gujarat", year: "2017-18" }],
  gallery: [gallery, { ...gallery, id: "imported-gallery", title: "Imported gallery" }],
  vlogs: [vlog],
  careers: [],
  team: [{ id: "live-team", name: "Live Team Member", designation: "Architect", photoUrl: "/images/team-1.jpg", updatedAt: timestamp }],
  inquiries: [],
  menu: { about: true, projects: true, ongoing: true, careers: true, gallery: true, vlog: true, team: true, contact: true },
  tableRecordIds: { projects: [project.id], gallery: [gallery.id], vlogs: [vlog.id] },
};
const projectRow = (p) => ({ id: p.id, title: p.title, status: p.status, location: p.location, client: p.client, category: p.category, year: p.year, summary: p.summary, description: p.description, image_url: p.imageUrl, updated_at: p.updatedAt });
let objects;
let tables;
let failWrites = false;
function reset() {
  objects = new Map([
    ["settings/admin-data.json", structuredClone(seed)],
    ["settings/menu.json", structuredClone(seed.menu)],
    ["settings/site-settings.json", { maintenanceEnabled: false, updatedAt: null }],
  ]);
  tables = { projects: [projectRow(project)], gallery: [{ id: gallery.id, title: gallery.title, image_url: gallery.imageUrl, alt: gallery.alt, category: gallery.category, uploaded_at: gallery.uploadedAt }], vlogs: [{ id: vlog.id, title: vlog.title, details: vlog.details, youtube_url: vlog.youtubeUrl, thumbnail_url: vlog.thumbnailUrl, created_at: vlog.createdAt }] };
  failWrites = false;
}
reset();
const fixture = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  const body = raw && request.headers["content-type"]?.includes("application/json") ? JSON.parse(raw) : null;
  const json = (status, value) => { response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(value)); };
  if (url.pathname === "/__test/reset") { reset(); return json(200, { ok: true }); }
  if (url.pathname === "/__test/table") {
    const { table, action, id, patch } = body;
    if (action === "delete") tables[table] = tables[table].filter((row) => row.id !== id);
    else tables[table] = tables[table].map((row) => row.id === id ? { ...row, ...patch } : row);
    return json(200, { ok: true });
  }
  if (url.pathname.startsWith("/storage/v1/object/")) {
    const segments = url.pathname.split("/").slice(5);
    const objectPath = segments.join("/");
    if (request.method === "GET") {
      if (url.pathname.includes("/public/")) {
        response.writeHead(302, { Location: `${site}/images/team-1.jpg` }); response.end(); return;
      }
      return objects.has(objectPath) ? json(200, objects.get(objectPath)) : json(404, { statusCode: "404", error: "not_found", message: "Object not found" });
    }
    if (request.method === "POST" || request.method === "PUT") {
      if (failWrites && objectPath.startsWith("settings/")) return json(503, { statusCode: "503", error: "unavailable", message: "Fixture write failure" });
      if (body) objects.set(objectPath, body);
      return json(200, { Key: `Gallery/${objectPath}`, Id: "fixture-object" });
    }
    return json(200, []);
  }
  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.split("/").at(-1);
    if (!tables[table]) return json(404, { message: "Table not found" });
    const id = url.searchParams.get("id")?.replace(/^eq\./, "");
    if (request.method === "GET") {
      const rows = id ? tables[table].filter((row) => row.id === id) : tables[table];
      return json(200, request.headers.accept?.includes("vnd.pgrst.object") ? rows[0] ?? null : rows);
    }
    if (request.method === "DELETE") tables[table] = tables[table].filter((row) => row.id !== id);
    else if (request.method === "PATCH") tables[table] = tables[table].map((row) => row.id === id ? { ...row, ...body } : row);
    else if (request.method === "POST") {
      for (const row of Array.isArray(body) ? body : [body]) {
        const index = tables[table].findIndex((existing) => existing.id === row.id);
        if (index < 0) tables[table].push(row); else tables[table][index] = row;
      }
    }
    return json(200, []);
  }
  json(404, { message: "Unknown fixture endpoint" });
});
await new Promise((resolve) => fixture.listen(0, "127.0.0.1", resolve));
const backend = `http://127.0.0.1:${fixture.address().port}`;
const port = Number(process.env.INTEGRATION_PORT || 3100);
const site = `http://localhost:${port}`;
const temp = await mkdtemp(path.join(tmpdir(), "intex-live-test-"));
const production = process.argv.includes("--production");
let serverLogs = "";
function startSite() {
  serverLogs = "";
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", production ? "start" : "dev", "-p", String(port)], {
    env: { ...process.env, SUPABASE_URL: backend, SUPABASE_SERVICE_ROLE_KEY: "fixture-service-key", SUPABASE_STORAGE_BUCKET: "Gallery", ADMIN_PASSWORD: "integration-admin", ADMIN_SESSION_SECRET: "fixture-secret", ADMIN_DATA_FILE: path.join(temp, "admin-data.json"), SITE_UNDER_CONSTRUCTION: "true" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { serverLogs += chunk; });
  server.stderr.on("data", (chunk) => { serverLogs += chunk; });
  return server;
}
let child = startSite();
async function stopSite() {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.exitCode !== null ? resolve() : child.once("exit", resolve));
}
async function cleanup() {
  await stopSite();
  fixture.closeAllConnections();
  await new Promise((resolve) => fixture.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let cookie = "";
async function request(url, options = {}, authenticated = true) {
  const response = await fetch(`${site}${url}`, { ...options, headers: { ...(authenticated && cookie ? { Cookie: cookie } : {}), ...options.headers }, signal: AbortSignal.timeout(20000) });
  return response;
}
const mutation = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
async function state() {
  const response = await request("/api/admin/state");
  assert.equal(response.status, 200);
  return response.json();
}
const streams = [];
async function watch(scope) {
  const abort = new AbortController();
  const response = await fetch(`${site}/api/site/events?scope=${scope}`, { headers: scope === "admin" ? { Cookie: cookie } : {}, signal: abort.signal });
  assert.equal(response.status, 200);
  const events = [];
  let pending = "";
  const reader = response.body.getReader();
  const task = (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += new TextDecoder().decode(value);
      let boundary;
      while ((boundary = pending.indexOf("\n\n")) !== -1) {
        const frame = pending.slice(0, boundary);
        pending = pending.slice(boundary + 2);
        const line = frame.split("\n").find((entry) => entry.startsWith("data: "));
        if (line) events.push(JSON.parse(line.slice(6)));
      }
    }
  })().catch((error) => { if (error.name !== "AbortError") throw error; });
  const stream = { events, close: async () => { abort.abort(); await task; } };
  streams.push(stream);
  await until(() => events.length > 0, "initial stream event");
  return stream;
}
async function until(check, description) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) { if (await check()) return; await sleep(100); }
  throw new Error(`Timed out waiting for ${description}`);
}
try {
  await until(() => serverLogs.includes("Ready in"), "Next dev startup");
  assert.equal((await request("/api/admin/settings", {}, false)).status, 401);
  assert.equal((await request("/api/admin/settings", mutation("PUT", { maintenanceEnabled: true, confirmed: true }), false)).status, 401);
  assert.equal((await request("/api/site/events?scope=admin", {}, false)).status, 401);
  const login = await request("/api/admin/login", mutation("POST", { password: "integration-admin" }), false);
  assert.equal(login.status, 200);
  cookie = login.headers.get("set-cookie").split(";")[0];
  let initial = await state();
  assert.equal(initial.projects.length, 2);
  assert.equal(initial.gallery.length, 2);
  assert.equal(initial.vlogs.length, 1);
  assert.equal(initial.settings.maintenanceEnabled, false, "saved false overrides environment true");
  assert.equal((await request("/api/admin/settings", mutation("PUT", { maintenanceEnabled: true }))).status, 400);
  assert.equal((await request("/api/admin/settings", mutation("PUT", { maintenanceEnabled: "true", confirmed: true }))).status, 400);
  const publicStream = await watch("public");
  const adminStream = await watch("admin");
  const publicRevision = publicStream.events.at(-1).revision;
  const adminCount = adminStream.events.length;
  assert.equal((await request("/api/inquiries", mutation("POST", { name: "Fixture visitor", email: "private@example.test", phone: "1234567890", message: "Private message" }), false)).status, 200);
  await until(() => adminStream.events.length > adminCount, "admin inquiry notification");
  assert.equal(publicStream.events.at(-1).revision, publicRevision, "private inquiries do not refresh public pages");
  assert.deepEqual(Object.keys(publicStream.events.at(-1)).sort(), ["maintenanceEnabled", "revision"]);
  const updates = publicStream.events.length;
  assert.equal((await request("/api/admin/projects/live-project", mutation("PUT", { title: "Updated Live Project", summary: "Updated scope" }))).status, 200);
  await until(() => publicStream.events.length > updates, "public project notification");
  assert.ok((await (await request("/projects.html")).text()).includes("Updated Live Project"));
  assert.equal((await state()).projects.find((row) => row.id === "live-project").summary, "Updated scope");
  assert.equal((await request("/api/admin/gallery/live-gallery", mutation("PUT", { title: "Updated gallery", alt: "Updated image", category: "Gallery" }))).status, 200);
  assert.ok((await (await request("/gallery.html")).text()).includes('alt="Updated image"'));
  const form = new FormData();
  form.set("title", "Updated vlog"); form.set("details", "Updated video details"); form.set("youtubeUrl", vlog.youtubeUrl);
  assert.equal((await request("/api/admin/vlogs/live-vlog", { method: "PUT", body: form })).status, 200);
  assert.ok((await (await request("/vlog.html")).text()).includes("Updated vlog"));
  const created = await request("/api/admin/projects", mutation("POST", { ...project, title: "Created project" }));
  assert.equal(created.status, 200);
  const createdData = await created.json();
  assert.equal(createdData.projects.length, 3, "SQL insert and shared store must not duplicate a new project");
  const createdId = createdData.projects.find((row) => row.title === "Created project").id;
  assert.equal((await request(`/api/admin/projects/${createdId}`, { method: "DELETE" })).status, 200);
  const imageFile = () => new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY1sAAAAASUVORK5CYII=", "base64")], "fixture.png", { type: "image/png" });
  const upload = new FormData(); upload.set("images", imageFile());
  const galleryUpload = await request("/api/admin/gallery", { method: "POST", body: upload });
  assert.equal(galleryUpload.status, 200);
  const uploadedData = await galleryUpload.json();
  assert.equal(uploadedData.gallery.length, 3, "upload response retains imports without duplicate SQL records");
  const uploadId = uploadedData.gallery.find((row) => row.title === "fixture.png").id;
  assert.equal((await request(`/api/admin/gallery/${uploadId}`, { method: "DELETE" })).status, 200);
  const member = new FormData(); member.set("name", "Edited Team Member"); member.set("designation", "Architect"); member.set("photo", imageFile());
  assert.equal((await request("/api/admin/team/live-team", { method: "PUT", body: member })).status, 200);
  assert.ok((await (await request("/team.html")).text()).includes("Edited Team Member"));
  const firstPhoto = (await state()).team[0].photoUrl;
  assert.equal((await request("/api/admin/team/live-team", { method: "PUT", body: member })).status, 200);
  assert.notEqual((await state()).team[0].photoUrl, firstPhoto, "replaced photos use a fresh URL instead of cached bytes");
  const careerResponse = await request("/api/admin/careers", mutation("POST", { title: "Live hiring role", isOpen: true, description: "Initial role" }));
  assert.equal(careerResponse.status, 200);
  const careerId = (await careerResponse.json()).careers.find((row) => row.title === "Live hiring role").id;
  assert.ok((await (await request("/careers.html")).text()).includes("Live hiring role"));
  assert.equal((await request(`/api/admin/careers/${careerId}`, mutation("PUT", { title: "Edited hiring role", description: "Edited role" }))).status, 200);
  assert.ok((await (await request("/careers.html")).text()).includes("Edited hiring role"));
  assert.equal((await request(`/api/admin/careers/${careerId}`, { method: "DELETE" })).status, 200);
  assert.ok(!(await (await request("/careers.html")).text()).includes("Edited hiring role"));
  await Promise.all(["Concurrent A", "Concurrent B"].map((title) => request("/api/admin/careers", mutation("POST", { title, isOpen: true }))));
  assert.equal((await state()).careers.length, 2, "concurrent saves retain both roles");
  failWrites = true;
  const failure = await request("/api/admin/careers", mutation("POST", { title: "Must not save" }));
  assert.notEqual(failure.status, 200, "failed remote persistence cannot report success");
  failWrites = false;
  assert.ok(!(await state()).careers.some((role) => role.title === "Must not save"));
  assert.equal((await request("/api/admin/menu", mutation("PUT", { slug: "gallery", enabled: false }))).status, 200);
  assert.equal((await request("/gallery.html")).status, 404);
  assert.equal((await request("/api/admin/menu", mutation("PUT", { slug: "gallery", enabled: true }))).status, 200);
  const beforeMaintenance = publicStream.events.length;
  assert.equal((await request("/api/admin/settings", mutation("PUT", { maintenanceEnabled: true, confirmed: true }))).status, 200);
  await until(() => publicStream.events.length > beforeMaintenance && publicStream.events.at(-1).maintenanceEnabled, "maintenance notification");
  const maintenanceHtml = await (await request("/about.html")).text();
  assert.ok(maintenanceHtml.includes("redrawing our space"));
  assert.ok(!maintenanceHtml.includes('href="/css/custom.css"'), "maintenance omits the legacy theme");
  assert.equal((await request("/admin")).status, 200);
  assert.equal((await request("/js/function.js")).status, 200);
  assert.equal((await request("/css/custom.css")).status, 200);
  assert.equal((await state()).settings.maintenanceEnabled, true);
  assert.equal((await request("/api/admin/settings", mutation("PUT", { maintenanceEnabled: false, confirmed: true }))).status, 200);
  assert.ok((await (await request("/about.html")).text()).includes('href="/css/custom.css"'));
  await until(() => publicStream.events.at(-1).maintenanceEnabled === false, "maintenance disabled notification");
  // Database changes bypassing the admin are still observed by the stream.
  const directCount = publicStream.events.length;
  tables.vlogs[0].title = "Database vlog change";
  await until(async () => publicStream.events.length > directCount && (await state()).vlogs[0]?.title === "Database vlog change", "direct database notification");
  assert.ok((await (await request("/vlog.html")).text()).includes("Database vlog change"));
  tables.vlogs = [];
  await until(async () => (await state()).vlogs.length === 0, "database deletion");
  assert.ok(!(await (await request("/vlog.html")).text()).includes("Database vlog change"));
  assert.equal((await request("/api/admin/team/live-team", { method: "DELETE" })).status, 200);
  const teamHtml = await (await request("/team.html")).text();
  assert.ok(!teamHtml.includes("Edited Team Member") && !teamHtml.includes('src="images/team-1.jpg"'), "removing the final team member cannot restore template members");
  assert.equal((await request("/api/admin/projects/live-project", { method: "DELETE" })).status, 200);
  assert.equal((await state()).projects.length, 1, "imported records survive database-backed deletions");
  assert.ok(!(await (await request("/projects.html")).text()).includes("Updated Live Project"));
  assert.equal((await request("/api/admin/projects/imported-project", mutation("PUT", { title: "Edited imported bank" }))).status, 200);
  const importedHtml = await (await request("/projects.html")).text();
  assert.ok(importedHtml.includes("Edited imported bank") && !importedHtml.includes("Dena Bank | Gujarat | 2017-18"), "category cards use edited admin records, not template copies");
  assert.equal((await request("/api/admin/projects/imported-project", { method: "DELETE" })).status, 200);
  const emptyProjectsHtml = await (await request("/projects.html")).text();
  assert.ok(!emptyProjectsHtml.includes("Edited imported bank") && !emptyProjectsHtml.includes("Dena Bank | Gujarat | 2017-18"), "deleted imported projects cannot return from the template");
  assert.equal((await request("/api/admin/gallery/live-gallery", { method: "DELETE" })).status, 200);
  assert.equal((await state()).gallery.length, 1);
  for (const stream of streams) await stream.close();
  console.log("PASS: auth, validation, maintenance gating, all content modules, live events, direct database edits/deletes, concurrent saves, failure handling, private inquiries, and imported content preservation.");
  if (process.argv.includes("--serve")) {
    await stopSite();
    reset();
    await rm(path.join(temp, "admin-data.json"), { force: true });
    child = startSite();
    await until(() => serverLogs.includes("Ready in"), "fresh browser fixture startup");
    console.log(`Browser fixture ready: ${site}/admin | password: integration-admin | backend: ${backend}`);
    await new Promise((resolve) => { process.once("SIGINT", resolve); process.once("SIGTERM", resolve); });
  }
} catch (error) {
  console.error(error);
  console.error(serverLogs.slice(-7000));
  process.exitCode = 1;
} finally {
  for (const stream of streams) await stream.close().catch(() => {});
  await cleanup();
}
