import { readSiteModel } from "utils/config/admin";

// Public (session-protected, like the rest of the app) read endpoint that the
// homepage footer uses to render the configured copyright + github link.
export default async function handler(req, res) {
  try {
    return res.status(200).json(await readSiteModel());
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Internal error" });
  }
}
