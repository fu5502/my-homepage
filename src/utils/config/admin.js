import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import checkAndCopyConfig, { CONF_DIR } from "utils/config/config";

const BOOKMARKS_FILE = "bookmarks.yaml";

function bookmarksPath() {
  return path.join(CONF_DIR, BOOKMARKS_FILE);
}

// Read raw bookmarks.yaml (no env substitution so {{...}} tokens are preserved
// on write-back) and map it into the editable array model:
//   [ { name: groupName, bookmarks: [ { name, abbr, href, icon, description } ] } ]
export async function readBookmarksModel() {
  checkAndCopyConfig(BOOKMARKS_FILE);

  const file = bookmarksPath();
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (e) {
    return [];
  }

  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (e) {
    throw new Error(`Failed to parse ${BOOKMARKS_FILE}: ${e.message}`);
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.map((group) => {
    const groupName = Object.keys(group)[0];
    const entries = Array.isArray(group[groupName]) ? group[groupName] : [];
    return {
      name: groupName,
      bookmarks: entries.map((entry) => {
        const bmName = Object.keys(entry)[0];
        const fields = Array.isArray(entry[bmName]) ? entry[bmName][0] || {} : {};
        return { name: bmName, ...fields };
      }),
    };
  });
}

function cleanFields(fields) {
  const out = {};
  Object.entries(fields || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  });
  return out;
}

function modelToYaml(model) {
  return model.map((group) => ({
    [group.name]: (group.bookmarks || []).map((bm) => {
      const { name, ...rest } = bm;
      return { [name]: [cleanFields(rest)] };
    }),
  }));
}

export async function writeBookmarksModel(model) {
  const file = bookmarksPath();

  // keep a backup of the previous version
  try {
    const prev = await fs.readFile(file, "utf8");
    await fs.writeFile(`${file}.bak`, prev, "utf8");
  } catch (e) {
    // no previous file yet
  }

  const yamlStr = yaml.dump(modelToYaml(model), { lineWidth: -1, noRefs: true, sortKeys: false });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `---\n${yamlStr}`, "utf8");
  await fs.rename(tmp, file);
}

export async function addBookmark({ group, name, abbr, href, icon, description }) {
  const model = await readBookmarksModel();
  let g = model.find((x) => x.name === group);
  if (!g) {
    g = { name: group, bookmarks: [] };
    model.push(g);
  }
  if (g.bookmarks.some((b) => b.name === name)) {
    throw new Error(`Bookmark "${name}" already exists in group "${group}"`);
  }
  g.bookmarks.push(cleanFields({ name, abbr, href, icon, description }));
  await writeBookmarksModel(model);
  return model;
}

export async function updateBookmark({ oldGroup, oldName, group, name, abbr, href, icon, description }) {
  const model = await readBookmarksModel();
  const og = model.find((x) => x.name === oldGroup);
  if (og) og.bookmarks = og.bookmarks.filter((b) => b.name !== oldName);

  let g = model.find((x) => x.name === group);
  if (!g) {
    g = { name: group, bookmarks: [] };
    model.push(g);
  }
  g.bookmarks.push(cleanFields({ name, abbr, href, icon, description }));
  await writeBookmarksModel(model);
  return model;
}

export async function deleteBookmark({ group, name }) {
  const model = await readBookmarksModel();
  const g = model.find((x) => x.name === group);
  if (g) g.bookmarks = g.bookmarks.filter((b) => b.name !== name);
  const cleaned = model.filter((x) => (x.name === group ? g && g.bookmarks.length > 0 : true));
  await writeBookmarksModel(cleaned);
  return cleaned;
}

export async function addGroup(name) {
  const model = await readBookmarksModel();
  if (model.some((x) => x.name === name)) {
    throw new Error(`Group "${name}" already exists`);
  }
  model.push({ name, bookmarks: [] });
  await writeBookmarksModel(model);
  return model;
}

export async function deleteGroup(name) {
  const model = await readBookmarksModel();
  const cleaned = model.filter((x) => x.name !== name);
  if (cleaned.length === model.length) {
    throw new Error(`Group "${name}" not found`);
  }
  await writeBookmarksModel(cleaned);
  return cleaned;
}

// ---------------------------------------------------------------------------
// Services (config/services.yaml) — grouped list of services, each with an
// optional `widget` (type-specific monitor) and `options` (list).
// Homepage format:
//   - GroupName:
//       - ServiceName:
//           icon: ...
//           href: ...
//           widget: {...}
//           options: [...]
// ---------------------------------------------------------------------------

const SERVICES_FILE = "services.yaml";

function servicesPath() {
  return path.join(CONF_DIR, SERVICES_FILE);
}

function cleanServiceFields(fields) {
  const out = {};
  Object.entries(fields || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (k === "widget" && v && typeof v === "object" && Object.keys(v).length === 0) return;
    if (k === "options" && Array.isArray(v) && v.length === 0) return;
    out[k] = v;
  });
  return out;
}

export async function readServicesModel() {
  checkAndCopyConfig(SERVICES_FILE);

  const file = servicesPath();
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (e) {
    return [];
  }

  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (e) {
    throw new Error(`Failed to parse ${SERVICES_FILE}: ${e.message}`);
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.map((group) => {
    const groupName = Object.keys(group)[0];
    const entries = Array.isArray(group[groupName]) ? group[groupName] : [];
    return {
      name: groupName,
      services: entries.map((entry) => {
        const svcName = Object.keys(entry)[0];
        const fields = entry[svcName] && typeof entry[svcName] === "object" ? entry[svcName] : {};
        return { name: svcName, ...fields };
      }),
    };
  });
}

function servicesModelToYaml(model) {
  return model.map((group) => ({
    [group.name]: (group.services || []).map((svc) => {
      const { name, ...rest } = svc;
      return { [name]: cleanServiceFields(rest) };
    }),
  }));
}

export async function writeServicesModel(model) {
  const file = servicesPath();

  try {
    const prev = await fs.readFile(file, "utf8");
    await fs.writeFile(`${file}.bak`, prev, "utf8");
  } catch (e) {
    // no previous file yet
  }

  const yamlStr = yaml.dump(servicesModelToYaml(model), { lineWidth: -1, noRefs: true, sortKeys: false });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `---\n${yamlStr}`, "utf8");
  await fs.rename(tmp, file);
}

export async function addService({ group, name, icon, href, description, server, container, showStats, ping, widget, options }) {
  const model = await readServicesModel();
  let g = model.find((x) => x.name === group);
  if (!g) {
    g = { name: group, services: [] };
    model.push(g);
  }
  if (g.services.some((s) => s.name === name)) {
    throw new Error(`Service "${name}" already exists in group "${group}"`);
  }
  g.services.push(cleanServiceFields({ icon, href, description, server, container, showStats, ping, widget, options }));
  await writeServicesModel(model);
  return model;
}

export async function updateService({ oldGroup, oldName, group, name, icon, href, description, server, container, showStats, ping, widget, options }) {
  const model = await readServicesModel();
  const og = model.find((x) => x.name === oldGroup);
  if (og) og.services = og.services.filter((s) => s.name !== oldName);

  let g = model.find((x) => x.name === group);
  if (!g) {
    g = { name: group, services: [] };
    model.push(g);
  }
  g.services.push(cleanServiceFields({ icon, href, description, server, container, showStats, ping, widget, options }));
  await writeServicesModel(model);
  return model;
}

export async function deleteService({ group, name }) {
  const model = await readServicesModel();
  const g = model.find((x) => x.name === group);
  if (g) g.services = g.services.filter((s) => s.name !== name);
  const cleaned = model.filter((x) => (x.name === group ? g && g.services.length > 0 : true));
  await writeServicesModel(cleaned);
  return cleaned;
}

export async function addServiceGroup(name) {
  const model = await readServicesModel();
  if (model.some((x) => x.name === name)) {
    throw new Error(`Group "${name}" already exists`);
  }
  model.push({ name, services: [] });
  await writeServicesModel(model);
  return model;
}

export async function deleteServiceGroup(name) {
  const model = await readServicesModel();
  const cleaned = model.filter((x) => x.name !== name);
  if (cleaned.length === model.length) {
    throw new Error(`Group "${name}" not found`);
  }
  await writeServicesModel(cleaned);
  return cleaned;
}

// ---------------------------------------------------------------------------
// Site info (config/site.yaml) — global site-level settings rendered in the
// homepage footer: `copyright` (free text) and `github` (repository URL).
// Stored as a flat key/value document (not the grouped list format above).
// ---------------------------------------------------------------------------

const SITE_FILE = "site.yaml";

function sitePath() {
  return path.join(CONF_DIR, SITE_FILE);
}

function normalizeSite(parsed) {
  return {
    copyright: typeof parsed?.copyright === "string" ? parsed.copyright : "",
    github: typeof parsed?.github === "string" ? parsed.github : "",
  };
}

export async function readSiteModel() {
  const file = sitePath();
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (e) {
    return { copyright: "", github: "" };
  }

  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (e) {
    return { copyright: "", github: "" };
  }
  if (!parsed || typeof parsed !== "object") return { copyright: "", github: "" };
  return normalizeSite(parsed);
}

export async function writeSiteModel({ copyright, github }) {
  const file = sitePath();

  try {
    const prev = await fs.readFile(file, "utf8");
    await fs.writeFile(`${file}.bak`, prev, "utf8");
  } catch (e) {
    // no previous file yet
  }

  const data = normalizeSite({ copyright: copyright || "", github: github || "" });
  const yamlStr = yaml.dump(data, { lineWidth: -1, noRefs: true, sortKeys: false });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `---\n${yamlStr}`, "utf8");
  await fs.rename(tmp, file);
  return data;
}

// ---------------------------------------------------------------------------
// Global settings (config/settings.yaml) — title, language, theme, background,
// layout, providers, ... The whole document is handed to the admin UI and
// written back as-is, so any key we do not surface in the UI still survives a
// round-trip. Note: YAML comments are NOT preserved (js-yaml drops them), which
// is why every write leaves a `settings.yaml.bak` next to the file.
// ---------------------------------------------------------------------------

const SETTINGS_FILE = "settings.yaml";

// Keys emitted first (in this order) so the generated file stays readable.
const SETTINGS_KEY_ORDER = [
  "title",
  "description",
  "startUrl",
  "language",
  "favicon",
  "theme",
  "color",
  "headerStyle",
  "target",
  "iconStyle",
  "statusStyle",
  "cardBlur",
  "hideVersion",
  "disableUpdateCheck",
  "disableCollapse",
  "fiveColumns",
  "maxGroupColumns",
  "fullWidth",
  "useEqualHeights",
  "hideErrors",
  "showStats",
  "base",
  "providers",
  "background",
  "quicklaunch",
  "layout",
];

function settingsPath() {
  return path.join(CONF_DIR, SETTINGS_FILE);
}

// settings.yaml accepts `layout` either as a mapping or as a list of
// single-key mappings. Normalize to a mapping so the UI has one shape to
// deal with (mirrors getSettings() in utils/config/config.js).
function normalizeLayout(layout) {
  if (Array.isArray(layout)) {
    const out = {};
    layout.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const name = Object.keys(item)[0];
      if (name) out[name] = item[name];
    });
    return out;
  }
  return layout;
}

// Order known keys first, then append anything else untouched.
function orderSettings(model) {
  const out = {};
  SETTINGS_KEY_ORDER.forEach((key) => {
    if (model[key] !== undefined) out[key] = model[key];
  });
  Object.keys(model).forEach((key) => {
    if (out[key] === undefined) out[key] = model[key];
  });
  return out;
}

// Drop keys the UI cleared out ("" / null / undefined) so they fall back to
// homepage defaults instead of being written as empty values.
function pruneEmpty(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return value;
  const out = {};
  Object.entries(value).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (typeof v === "object" && !Array.isArray(v)) {
      const nested = pruneEmpty(v);
      if (Object.keys(nested).length === 0) return;
      out[k] = nested;
      return;
    }
    out[k] = v;
  });
  return out;
}

// `layout` is special: the key order decides the order groups are rendered in,
// so an entry with no options still carries meaning and must not be pruned
// away. Only the options inside each group get cleaned.
function pruneLayout(layout) {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return undefined;
  const out = {};
  Object.entries(layout).forEach(([group, options]) => {
    if (!group) return;
    out[group] = options && typeof options === "object" && !Array.isArray(options) ? pruneEmpty(options) : {};
  });
  return Object.keys(out).length ? out : undefined;
}

export async function readSettingsModel() {
  checkAndCopyConfig(SETTINGS_FILE);

  const file = settingsPath();
  let raw;
  try {
    // Read raw (no env-var substitution) so {{HOMEPAGE_VAR_x}} tokens survive
    // a save round-trip instead of being baked into the file.
    raw = await fs.readFile(file, "utf8");
  } catch (e) {
    return {};
  }

  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (e) {
    throw new Error(`Failed to parse ${SETTINGS_FILE}: ${e.message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  if (parsed.layout !== undefined) {
    parsed.layout = normalizeLayout(parsed.layout);
  }
  return parsed;
}

export async function writeSettingsModel(model) {
  if (!model || typeof model !== "object" || Array.isArray(model)) {
    throw new Error("Settings must be a YAML mapping (key: value)");
  }

  const file = settingsPath();

  try {
    const prev = await fs.readFile(file, "utf8");
    await fs.writeFile(`${file}.bak`, prev, "utf8");
  } catch (e) {
    // no previous file yet
  }

  const { layout, ...rest } = model;
  const cleanedLayout = pruneLayout(normalizeLayout(layout));
  const next = orderSettings({
    ...pruneEmpty(rest),
    ...(cleanedLayout ? { layout: cleanedLayout } : {}),
  });
  const yamlStr = yaml.dump(next, { lineWidth: -1, noRefs: true, sortKeys: false });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `---\n${yamlStr}`, "utf8");
  await fs.rename(tmp, file);
  return next;
}
