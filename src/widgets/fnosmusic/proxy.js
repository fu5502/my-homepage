import getServiceWidget from "utils/config/service-helpers";
import createLogger from "utils/logger";
import { httpProxy } from "utils/proxy/http";

const proxyName = "fnosmusicProxyHandler";
const logger = createLogger(proxyName);

export default async function fnosmusicProxyHandler(req, res) {
  const { group, service, index } = req.query;

  if (!group || !service) {
    logger.debug("Invalid or missing service '%s' or group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  const widget = await getServiceWidget(group, service, index);

  if (!widget) {
    logger.debug("Invalid or missing widget for service '%s' in group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  if (!widget.key) {
    logger.debug("Invalid or missing key for service '%s' in group '%s'", service, group);
    return res.status(400).json({ error: "Missing widget key" });
  }

  const cleanUrl = (widget.url || "").replace(/\/+$/, "");
  if (!cleanUrl) {
    return res.status(400).json({ error: "Missing widget url" });
  }

  const baseApiUrl = cleanUrl.endsWith("/music") ? `${cleanUrl}/api/v1` : `${cleanUrl}/music/api/v1`;

  const headers = {
    "content-type": "application/json",
    Cookie: `music-token=${widget.key}`,
    ...(widget.customHeaders || {}),
  };

  async function fetchEndpoint(apiPath) {
    const targetUrl = new URL(apiPath);
    const [status, , data] = await httpProxy(targetUrl, { headers });
    if (status !== 200) {
      throw new Error(`fnOS Music API HTTP error: ${status}`);
    }
    const json = JSON.parse(Buffer.from(data).toString());
    if (json.code !== 0) {
      throw new Error(json.msg || `fnOS Music API returned code ${json.code}`);
    }
    return json.data;
  }

  try {
    const [tracksResult, albumsResult, artistsResult, playHistoryResult] = await Promise.allSettled([
      fetchEndpoint(`${baseApiUrl}/track/list?page=1&pageSize=1`),
      fetchEndpoint(`${baseApiUrl}/album/list?page=1&pageSize=1`),
      fetchEndpoint(`${baseApiUrl}/artist/list?page=1&pageSize=1`),
      fetchEndpoint(`${baseApiUrl}/play-history/list?page=1&pageSize=1`),
    ]);

    const statsFailCount = [tracksResult, albumsResult, artistsResult].filter((r) => r.status === "rejected").length;
    if (statsFailCount === 3) {
      const firstError =
        tracksResult.status === "rejected" ? tracksResult.reason : new Error("Failed to load fnOS Music stats");
      throw firstError;
    }

    const stats = {
      songs: tracksResult.status === "fulfilled" ? (tracksResult.value?.total ?? null) : null,
      albums: albumsResult.status === "fulfilled" ? (albumsResult.value?.total ?? null) : null,
      artists: artistsResult.status === "fulfilled" ? (artistsResult.value?.total ?? null) : null,
    };

    let nowPlaying = null;
    if (playHistoryResult.status === "fulfilled" && playHistoryResult.value?.list?.length > 0) {
      const item = playHistoryResult.value.list[0];
      const artistName = Array.isArray(item.artists)
        ? item.artists
            .map((a) => a.name)
            .filter(Boolean)
            .join(", ")
        : item.artist?.name || "";

      nowPlaying = {
        title: item.title || "",
        artist: artistName,
        album: item.album?.name || "",
        duration: item.duration || 0,
        playedAt: item.updatedAt || item.createdAt || null,
      };
    }

    return res.status(200).json({ stats, nowPlaying });
  } catch (e) {
    if (e) logger.error(e);
    return res.status(500).json({ error: { message: e.message } });
  }
}
