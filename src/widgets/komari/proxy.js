import getServiceWidget from "utils/config/service-helpers";
import createLogger from "utils/logger";
import { formatApiCall, sanitizeErrorURL } from "utils/proxy/api-helpers";
import { httpProxy } from "utils/proxy/http";
import widgets from "widgets/widgets";

const proxyName = "komariProxyHandler";
const logger = createLogger(proxyName);

export default async function komariProxyHandler(req, res) {
  const { group, service, index } = req.query;

  if (!group || !service) {
    logger.debug("Invalid or missing service '%s' or group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  const widget = await getServiceWidget(group, service, index);
  if (!widget || !widgets?.[widget.type]?.api) {
    logger.debug("Invalid or missing widget for service '%s' in group '%s'", service, group);
    return res.status(400).json({ error: "Invalid widget configuration" });
  }

  if (!widget.url) {
    logger.debug("Missing widget url for service '%s' in group '%s'", service, group);
    return res.status(400).json({ error: "Missing widget url" });
  }

  const headers = {
    "Content-Type": "application/json",
    ...(widget.customHeaders || {}),
  };
  if (widget.key) {
    headers.Authorization = `Bearer ${widget.key}`;
  }

  try {
    const apiTemplate = widgets[widget.type].api;
    const nodesUrl = new URL(formatApiCall(apiTemplate, { endpoint: "nodes", ...widget }));

    const [nodesStatus, , nodesRawData] = await httpProxy(nodesUrl, {
      method: "GET",
      headers,
    });

    if (nodesStatus >= 400) {
      logger.error("HTTP Error %d calling Komari nodes API %s", nodesStatus, sanitizeErrorURL(nodesUrl));
      return res.status(nodesStatus).json({
        error: {
          message: `Failed to fetch Komari nodes: ${nodesStatus}`,
          url: sanitizeErrorURL(nodesUrl),
        },
      });
    }

    let nodes = nodesRawData;
    if (Buffer.isBuffer(nodes)) {
      nodes = JSON.parse(nodes.toString("utf-8"));
    }
    const nodesList = Array.isArray(nodes) ? nodes : nodes?.data || nodes?.nodes || [];

    // 集群概览模式 (未指定 nodeId)
    if (!widget.nodeId) {
      const now = Date.now();
      const onlineNodes = nodesList.filter((node) => {
        if (node.status) return String(node.status).toLowerCase() === "online";
        if (node.updated_at) {
          const updated = new Date(node.updated_at).getTime();
          return now - updated < 120000;
        }
        return true;
      });

      return res.status(200).json({
        mode: "cluster",
        total: nodesList.length,
        online: onlineNodes.length,
        offline: nodesList.length - onlineNodes.length,
        totalCores: nodesList.reduce((acc, n) => acc + (Number(n.cpu_cores) || 0), 0),
        totalMem: nodesList.reduce((acc, n) => acc + (Number(n.mem_total) || 0), 0),
        totalDisk: nodesList.reduce((acc, n) => acc + (Number(n.disk_total) || 0), 0),
      });
    }

    // 单节点监控模式 (指定了 nodeId)
    const targetNode = nodesList.find(
      (n) => n.uuid === widget.nodeId || n.name === widget.nodeId || String(n.id) === String(widget.nodeId),
    );

    if (!targetNode) {
      return res.status(404).json({
        error: {
          message: `Node with id/name '${widget.nodeId}' not found`,
        },
      });
    }

    const recentUrl = new URL(
      formatApiCall(apiTemplate, {
        endpoint: `recent/${encodeURIComponent(targetNode.uuid)}`,
        ...widget,
      }),
    );

    const [recentStatus, , recentRawData] = await httpProxy(recentUrl, {
      method: "GET",
      headers,
    });

    if (recentStatus >= 400) {
      logger.error("HTTP Error %d calling Komari recent API %s", recentStatus, sanitizeErrorURL(recentUrl));
      return res.status(recentStatus).json({
        error: {
          message: `Failed to fetch telemetry for node '${targetNode.name}'`,
          url: sanitizeErrorURL(recentUrl),
        },
      });
    }

    let recent = recentRawData;
    if (Buffer.isBuffer(recent)) {
      recent = JSON.parse(recent.toString("utf-8"));
    }

    let recentReport = null;
    if (Array.isArray(recent)) {
      recentReport = recent.length > 0 ? recent[recent.length - 1] : null;
    } else if (Array.isArray(recent?.data)) {
      recentReport = recent.data.length > 0 ? recent.data[recent.data.length - 1] : null;
    } else {
      recentReport = recent?.data || recent || null;
    }

    const isOnline = Boolean(recentReport);
    const ramUsed = Number(recentReport?.ram?.used ?? 0);
    const ramTotal = Number(recentReport?.ram?.total ?? targetNode.mem_total ?? 0);
    const diskUsed = Number(recentReport?.disk?.used ?? 0);
    const diskTotal = Number(recentReport?.disk?.total ?? targetNode.disk_total ?? 0);

    return res.status(200).json({
      mode: "node",
      uuid: targetNode.uuid,
      name: targetNode.name,
      status: isOnline ? targetNode.status || "online" : "offline",
      region: targetNode.region || "",
      cpu: Number(recentReport?.cpu?.usage ?? recentReport?.cpu ?? 0),
      ram: {
        used: ramUsed,
        total: ramTotal,
        percent: ramTotal > 0 ? (ramUsed / ramTotal) * 100 : 0,
      },
      disk: {
        used: diskUsed,
        total: diskTotal,
        percent: diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0,
      },
      network: {
        up: Number(recentReport?.network?.up ?? 0),
        down: Number(recentReport?.network?.down ?? 0),
      },
      uptime: Number(recentReport?.uptime ?? 0),
      updated_at: recentReport?.updated_at || null,
    });
  } catch (err) {
    logger.error("Exception in komariProxyHandler: %s", err.message);
    return res.status(500).json({ error: { message: err.message } });
  }
}
