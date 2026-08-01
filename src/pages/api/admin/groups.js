import { addGroup, deleteGroup, readBookmarksModel } from "utils/config/admin";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const model = await readBookmarksModel();
      return res.status(200).json(model.map((g) => g.name));
    }

    if (req.method === "POST") {
      const { name } = req.body || {};
      if (!name) {
        return res.status(400).json({ error: "name is required" });
      }
      return res.status(200).json(await addGroup(name));
    }

    if (req.method === "DELETE") {
      const { name } = req.body || {};
      if (!name) {
        return res.status(400).json({ error: "name is required" });
      }
      return res.status(200).json(await deleteGroup(name));
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Internal error" });
  }
}
