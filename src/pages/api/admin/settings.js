import { readSettingsModel, writeSettingsModel } from "utils/config/admin";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json(await readSettingsModel());
    }

    if (req.method === "POST") {
      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({ error: "请求体必须是一个对象" });
      }

      const saved = await writeSettingsModel(body);

      // The dashboard is statically generated (getStaticProps), so settings
      // changes only show up after the page is regenerated.
      let revalidated = false;
      try {
        await res.revalidate("/");
        revalidated = true;
      } catch (e) {
        console.warn("settings saved but revalidate failed: %s", e.message);
      }

      return res.status(200).json({ settings: saved, revalidated });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Internal error" });
  }
}
