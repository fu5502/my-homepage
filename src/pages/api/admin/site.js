import { readSiteModel, writeSiteModel } from "utils/config/admin";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json(await readSiteModel());
    }

    if (req.method === "POST") {
      const { copyright, github } = req.body || {};
      return res.status(200).json(
        await writeSiteModel({
          copyright: typeof copyright === "string" ? copyright : "",
          github: typeof github === "string" ? github : "",
        }),
      );
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Internal error" });
  }
}
