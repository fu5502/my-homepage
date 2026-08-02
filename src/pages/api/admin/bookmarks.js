import { addBookmark, deleteBookmark, readBookmarksModel, updateBookmark } from "utils/config/admin";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json(await readBookmarksModel());
    }

    if (req.method === "POST") {
      const { group, name, abbr, href, icon, description } = req.body || {};
      if (!group || !name || !href) {
        return res.status(400).json({ error: "group, name and href are required" });
      }
      return res.status(200).json(await addBookmark({ group, name, abbr, href, icon, description }));
    }

    if (req.method === "PUT") {
      const { oldGroup, oldName, group, name, abbr, href, icon, description } = req.body || {};
      if (!oldGroup || !oldName || !group || !name || !href) {
        return res.status(400).json({ error: "oldGroup, oldName, group, name and href are required" });
      }
      return res
        .status(200)
        .json(await updateBookmark({ oldGroup, oldName, group, name, abbr, href, icon, description }));
    }

    if (req.method === "DELETE") {
      const { group, name } = req.body || {};
      if (!group || !name) {
        return res.status(400).json({ error: "group and name are required" });
      }
      return res.status(200).json(await deleteBookmark({ group, name }));
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Internal error" });
  }
}
