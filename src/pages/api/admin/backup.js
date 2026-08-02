import { readAllConfigs, writeAllConfigs } from "utils/config/admin";

function backupFilename(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `my-homepage-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours(),
  )}${p(d.getMinutes())}${p(d.getSeconds())}.json`;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const files = await readAllConfigs();
      const bundle = {
        app: "my-homepage",
        version: 1,
        exportedAt: new Date().toISOString(),
        files,
      };
      const body = JSON.stringify(bundle, null, 2);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${backupFilename(Date.now())}"`);
      return res.status(200).send(body);
    }

    if (req.method === "POST") {
      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({ error: "请求体必须是一个对象" });
      }
      if (!body.files || typeof body.files !== "object" || Array.isArray(body.files)) {
        return res.status(400).json({ error: "备份文件缺少 files 字段或格式不正确" });
      }
      const written = await writeAllConfigs(body.files);

      // The dashboard is statically generated (getStaticProps), so restored
      // settings only show up after the page is regenerated.
      let revalidated = false;
      try {
        await res.revalidate("/");
        revalidated = true;
      } catch (e) {
        console.warn("backup restored but revalidate failed: %s", e.message);
      }

      const names = Object.keys(body.files).filter((k) => typeof body.files[k] === "string");
      return res.status(200).json({ written, revalidated, files: names });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Internal error" });
  }
}
