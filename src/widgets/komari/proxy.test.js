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
vi.mock("widgets/widgets", () => ({
  default: {
    komari: {
      api: "{url}/api/{endpoint}",
    },
  },
}));

import komariProxyHandler from "./proxy";

describe("widgets/komari/proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing service or group", async () => {
    const req = { query: { group: "", service: "" } };
    const res = createMockRes();

    await komariProxyHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid proxy service type" });
  });

  it("returns 400 for missing widget or url", async () => {
    getServiceWidget.mockResolvedValueOnce(null);
    const req = { query: { group: "g", service: "s" } };
    const res = createMockRes();

    await komariProxyHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid widget configuration" });

    getServiceWidget.mockResolvedValueOnce({ type: "komari" });
    const res2 = createMockRes();
    await komariProxyHandler(req, res2);
    expect(res2.statusCode).toBe(400);
    expect(res2.body).toEqual({ error: "Missing widget url" });
  });

  it("returns cluster overview when nodeId is not configured", async () => {
    getServiceWidget.mockResolvedValue({
      type: "komari",
      url: "http://komari.local:8080",
    });

    const mockNodes = [
      {
        uuid: "uuid-1",
        name: "Node 1",
        status: "online",
        cpu_cores: 4,
        mem_total: 8589934592,
        disk_total: 100000000000,
      },
      {
        uuid: "uuid-2",
        name: "Node 2",
        status: "offline",
        cpu_cores: 2,
        mem_total: 4294967296,
        disk_total: 50000000000,
      },
    ];

    httpProxy.mockResolvedValueOnce([200, "application/json", Buffer.from(JSON.stringify(mockNodes))]);

    const req = { query: { group: "servers", service: "komari" } };
    const res = createMockRes();

    await komariProxyHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      mode: "cluster",
      total: 2,
      online: 1,
      offline: 1,
      totalCores: 6,
      totalMem: 12884901888,
      totalDisk: 150000000000,
    });
  });

  it("returns node telemetry in single node mode by name and attaches Bearer key", async () => {
    getServiceWidget.mockResolvedValue({
      type: "komari",
      url: "https://komari.example.com",
      key: "secret-token",
      nodeId: "Tokyo-01",
    });

    const mockNodes = [
      { uuid: "uuid-tokyo", name: "Tokyo-01", cpu_cores: 2, mem_total: 4000, disk_total: 20000, region: "JP" },
    ];

    const mockRecent = [
      {
        cpu: { usage: 15.5 },
        ram: { used: 2000, total: 4000 },
        disk: { used: 5000, total: 20000 },
        network: { up: 100000, down: 500000 },
        uptime: 3600,
        updated_at: "2026-09-04T00:00:00Z",
      },
    ];

    httpProxy
      .mockResolvedValueOnce([200, "application/json", Buffer.from(JSON.stringify(mockNodes))])
      .mockResolvedValueOnce([200, "application/json", Buffer.from(JSON.stringify(mockRecent))]);

    const req = { query: { group: "servers", service: "komari" } };
    const res = createMockRes();

    await komariProxyHandler(req, res);

    expect(httpProxy).toHaveBeenCalledTimes(2);
    expect(httpProxy.mock.calls[0][1].headers.Authorization).toBe("Bearer secret-token");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      mode: "node",
      uuid: "uuid-tokyo",
      name: "Tokyo-01",
      status: "online",
      region: "JP",
      cpu: 15.5,
      ram: {
        used: 2000,
        total: 4000,
        percent: 50,
      },
      disk: {
        used: 5000,
        total: 20000,
        percent: 25,
      },
      network: {
        up: 100000,
        down: 500000,
      },
      uptime: 3600,
      updated_at: "2026-09-04T00:00:00Z",
    });
  });

  it("returns 404 when nodeId cannot be found in nodes list", async () => {
    getServiceWidget.mockResolvedValue({
      type: "komari",
      url: "http://komari.local",
      nodeId: "non-existent-node",
    });

    httpProxy.mockResolvedValueOnce([
      200,
      "application/json",
      Buffer.from(JSON.stringify([{ uuid: "uuid-1", name: "Node 1" }])),
    ]);

    const req = { query: { group: "servers", service: "komari" } };
    const res = createMockRes();

    await komariProxyHandler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toContain("not found");
  });
});
