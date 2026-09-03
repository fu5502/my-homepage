import { beforeEach, describe, expect, it, vi } from "vitest";

import createMockRes from "test-utils/create-mock-res";

const { httpProxy, getServiceWidget, logger } = vi.hoisted(() => ({
  httpProxy: vi.fn(),
  getServiceWidget: vi.fn(),
  logger: { debug: vi.fn(), error: vi.fn() },
}));

vi.mock("utils/logger", () => ({
  default: () => logger,
}));
vi.mock("utils/config/service-helpers", () => ({
  default: getServiceWidget,
}));
vi.mock("utils/proxy/http", () => ({
  httpProxy,
}));

import fnosmusicProxyHandler from "./proxy";

describe("widgets/fnosmusic/proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing service or group", async () => {
    const req = { query: { group: "", service: "" } };
    const res = createMockRes();

    await fnosmusicProxyHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid proxy service type" });
  });

  it("returns 400 for missing widget or key", async () => {
    getServiceWidget.mockResolvedValueOnce(null);
    const req = { query: { group: "g", service: "s" } };
    const res = createMockRes();

    await fnosmusicProxyHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid proxy service type" });

    getServiceWidget.mockResolvedValueOnce({ type: "fnosmusic", url: "http://nas" });
    const res2 = createMockRes();
    await fnosmusicProxyHandler(req, res2);
    expect(res2.statusCode).toBe(400);
    expect(res2.body).toEqual({ error: "Missing widget key" });
  });

  it("fetches stats and play history successfully when helper fails", async () => {
    getServiceWidget.mockResolvedValue({
      type: "fnosmusic",
      url: "http://192.168.99.147:5666",
      key: "test-token",
    });

    httpProxy
      .mockResolvedValueOnce([
        200,
        "application/json",
        Buffer.from(JSON.stringify({ code: 0, msg: "", data: { total: 4454 } })),
      ])
      .mockResolvedValueOnce([
        200,
        "application/json",
        Buffer.from(JSON.stringify({ code: 0, msg: "", data: { total: 313 } })),
      ])
      .mockResolvedValueOnce([
        200,
        "application/json",
        Buffer.from(JSON.stringify({ code: 0, msg: "", data: { total: 242 } })),
      ])
      .mockResolvedValueOnce([
        200,
        "application/json",
        Buffer.from(
          JSON.stringify({
            code: 0,
            msg: "",
            data: {
              list: [
                {
                  guid: "test-guid",
                  title: "惩罚",
                  artists: [{ name: "阿杜" }],
                  album: { name: "坚持到底" },
                  duration: 224938,
                  updatedAt: 1788247992,
                },
              ],
            },
          }),
        ),
      ])
      .mockRejectedValueOnce(new Error("helper not available"));

    const req = { query: { group: "media", service: "fnos_music" } };
    const res = createMockRes();

    await fnosmusicProxyHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.stats).toEqual({
      songs: 4454,
      albums: 313,
      artists: 242,
    });
    expect(res.body.nowPlaying.title).toBe("惩罚");
    expect(res.body.nowPlaying.isPlaying).toBe(false);
  });

  it("uses real-time helper when available", async () => {
    getServiceWidget.mockResolvedValue({
      type: "fnosmusic",
      url: "http://192.168.99.147:5666",
      key: "test-token",
    });

    httpProxy
      .mockResolvedValueOnce([200, "application/json", Buffer.from(JSON.stringify({ code: 0, data: { total: 10 } }))])
      .mockResolvedValueOnce([200, "application/json", Buffer.from(JSON.stringify({ code: 0, data: { total: 2 } }))])
      .mockResolvedValueOnce([200, "application/json", Buffer.from(JSON.stringify({ code: 0, data: { total: 1 } }))])
      .mockResolvedValueOnce([200, "application/json", Buffer.from(JSON.stringify({ code: 0, data: { list: [] } }))])
      .mockResolvedValueOnce([
        200,
        "application/json",
        Buffer.from(
          JSON.stringify({
            code: 0,
            data: {
              title: "西出阳关",
              artist: "阿杜",
              album: "I DO",
              duration: 244058,
              playedAt: 1788436174801,
              elapsed: 50000,
              percent: 20.5,
              isPlaying: true,
            },
          }),
        ),
      ]);

    const req = { query: { group: "media", service: "fnos_music" } };
    const res = createMockRes();

    await fnosmusicProxyHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.nowPlaying).toEqual({
      title: "西出阳关",
      artist: "阿杜",
      album: "I DO",
      duration: 244058,
      playedAt: 1788436174801,
      elapsed: 50000,
      percent: 20.5,
      isPlaying: true,
    });
  });
});
