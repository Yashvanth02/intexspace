const fs = require("fs");
const path = require("path");

const sourceRoot = process.argv[2] || "C:/projects/intexspace/Website Photos/Website Photos";
const destRoot = path.join(process.cwd(), "public", "images", "website-photos");
const adminDataPath = path.join(process.cwd(), "data", "admin-data.json");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function slugify(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function sanitizeSegment(segment) {
  return segment
    .toString()
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function makeId(prefix, value) {
  const slug = slugify(value) || Date.now().toString(36);
  return `${prefix}-${slug}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanCategory(raw) {
  const cleaned = raw
    .replace(/^\d+[\.\-\s]*/, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Website Photos";
}

async function collectImages(dir) {
  const items = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...await collectImages(fullPath));
      continue;
    }

    const ext = path.extname(item.name).toLowerCase();
    if (!supportedExtensions.has(ext)) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

async function loadAdminData() {
  try {
    const raw = await fs.promises.readFile(adminDataPath, "utf8");
    const json = JSON.parse(raw.replace(/^\uFEFF/, ""));
    return {
      projects: json.projects || [],
      careers: json.careers || [],
      gallery: json.gallery || [],
      inquiries: json.inquiries || [],
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { projects: [], careers: [], gallery: [], inquiries: [] };
    }
    throw error;
  }
}

async function saveAdminData(data) {
  await fs.promises.mkdir(path.dirname(adminDataPath), { recursive: true });
  await fs.promises.writeFile(adminDataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function run() {
  const sourceExists = fs.existsSync(sourceRoot);
  if (!sourceExists) {
    console.error(`Source folder not found: ${sourceRoot}`);
    process.exit(1);
  }

  const imageFiles = await collectImages(sourceRoot);
  console.log(`Found ${imageFiles.length} supported image files in source folder.`);

  const adminData = await loadAdminData();
  const existingUrls = new Set(adminData.gallery.map((item) => item.imageUrl));
  const existingIds = new Set(adminData.gallery.map((item) => item.id));

  let imported = 0;
  const skipped = [];

  for (const sourceFile of imageFiles) {
    const relPath = path.relative(sourceRoot, sourceFile);
    const segments = relPath.split(path.sep).map(sanitizeSegment);
    const category = cleanCategory(segments[0] || "Website Photos");
    const fileName = segments.pop();
    const safeFileName = fileName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "-");
    const destRelative = [...segments, safeFileName].join("/");
    const destPath = path.join(destRoot, ...segments, safeFileName);
    const imageUrl = `/images/website-photos/${destRelative}`;

    if (existingUrls.has(imageUrl)) {
      skipped.push(imageUrl);
      continue;
    }

    await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
    await fs.promises.copyFile(sourceFile, destPath);

    const titleBase = path.basename(safeFileName, path.extname(safeFileName)).replace(/[-_]+/g, " ").trim();
    const title = titleBase || "Website Photo";
    let id = makeId("gallery", `${category} ${title}`);
    while (existingIds.has(id)) {
      id = makeId("gallery", `${category} ${title}`);
    }

    adminData.gallery.push({
      id,
      title,
      imageUrl,
      alt: title,
      category,
      uploadedAt: new Date().toISOString(),
    });

    existingUrls.add(imageUrl);
    existingIds.add(id);
    imported += 1;
  }

  await saveAdminData(adminData);
  console.log(`Imported ${imported} images into admin-data.json.`);
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} already-imported images.`);
  }
  console.log(`Gallery now contains ${adminData.gallery.length} entries.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
