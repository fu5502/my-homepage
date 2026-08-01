import {
  addService,
  deleteService,
  readServicesModel,
  reorderServices,
  updateService,
} from "utils/config/admin";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json(await readServicesModel());
    }

    if (req.method === "POST") {
      const { group, name, href, icon, description, server, container, showStats, ping, widget, options } =
        req.body || {};
      if (!group || !name || !href) {
        return res.status(400).json({ error: "group, name and href are required" });
      }
      return res
        .status(200)
        .json(await addService({ group, name, href, icon, description, server, container, showStats, ping, widget, options }));
    }

    if (req.method === "PUT") {
      const {
        oldGroup,
        oldName,
        group,
        name,
        href,
        icon,
        description,
        server,
        container,
        showStats,
        ping,
        widget,
        options,
      } = req.body || {};
      if (!oldGroup || !oldName || !group || !name || !href) {
        return res.status(400).json({ error: "oldGroup, oldName, group, name and href are required" });
      }
      return res.status(200).json(
        await updateService({
          oldGroup,
          oldName,
          group,
          name,
          href,
          icon,
          description,
          server,
          container,
          showStats,
          ping,
          widget,
          options,
        }),
      );
    }

    if (req.method === "DELETE") {
      const { group, name } = req.body || {};
      if (!group || !name) {
        return res.status(400).json({ error: "group and name are required" });
      }
      return res.status(200).json(await deleteService({ group, name }));
    }

    if (req.method === "PATCH") {
      const { group, order } = req.body || {};
      if (!group || !Array.isArray(order)) {
        return res.status(400).json({ error: "group and order[] are required" });
      }
      return res.status(200).json(await reorderServices({ group, order }));
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Internal error" });
  }
}
