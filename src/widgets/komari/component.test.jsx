// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "test-utils/render-with-providers";
import { expectBlockValue } from "test-utils/widget-assertions";

const { useWidgetAPI } = vi.hoisted(() => ({ useWidgetAPI: vi.fn() }));

vi.mock("utils/proxy/use-widget-api", () => ({
  default: useWidgetAPI,
}));

import Component from "./component";

describe("widgets/komari/component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders cluster placeholders while loading when nodeId is omitted", () => {
    useWidgetAPI.mockReturnValue({ data: undefined, error: undefined });

    const { container } = renderWithProviders(<Component service={{ widget: { type: "komari" } }} />, {
      settings: { hideErrors: false },
    });

    expect(container.querySelectorAll(".service-block")).toHaveLength(2);
    expect(screen.getByText("komari.nodes")).toBeInTheDocument();
    expect(screen.getByText("komari.online")).toBeInTheDocument();
  });

  it("renders single node placeholders while loading when nodeId is provided", () => {
    useWidgetAPI.mockReturnValue({ data: undefined, error: undefined });

    const { container } = renderWithProviders(
      <Component service={{ widget: { type: "komari", nodeId: "tokyo-node" } }} />,
      {
        settings: { hideErrors: false },
      },
    );

    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expect(screen.getByText("komari.name")).toBeInTheDocument();
    expect(screen.getByText("komari.status")).toBeInTheDocument();
    expect(screen.getByText("komari.cpu")).toBeInTheDocument();
    expect(screen.getByText("komari.memory")).toBeInTheDocument();
  });

  it("renders cluster overview when mode is cluster", () => {
    useWidgetAPI.mockReturnValue({
      data: {
        mode: "cluster",
        total: 10,
        online: 8,
        offline: 2,
        totalCores: 32,
        totalMem: 68719476736,
        totalDisk: 1099511627776,
      },
      error: undefined,
    });

    const { container } = renderWithProviders(<Component service={{ widget: { type: "komari" } }} />, {
      settings: { hideErrors: false },
    });

    expect(container.querySelectorAll(".service-block")).toHaveLength(2);
    expectBlockValue(container, "komari.nodes", 10);
    expectBlockValue(container, "komari.online", "8 / 10");
  });

  it("renders single node telemetry when mode is node", () => {
    useWidgetAPI.mockReturnValue({
      data: {
        mode: "node",
        uuid: "uuid-1",
        name: "Tokyo-01",
        status: "online",
        cpu: 25.5,
        ram: { percent: 45.2, used: 4000, total: 8000 },
        disk: { percent: 60.0, used: 60000, total: 100000 },
        network: { up: 102400, down: 2048000 },
        uptime: 7200,
      },
      error: undefined,
    });

    const { container } = renderWithProviders(
      <Component service={{ widget: { type: "komari", nodeId: "Tokyo-01" } }} />,
      {
        settings: { hideErrors: false },
      },
    );

    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expectBlockValue(container, "komari.name", "Tokyo-01");
    expectBlockValue(container, "komari.status", "komari.online");
    expectBlockValue(container, "komari.cpu", 25.5);
    expectBlockValue(container, "komari.memory", 45.2);
  });

  it("respects fields filtering in single node mode", () => {
    useWidgetAPI.mockReturnValue({
      data: {
        mode: "node",
        uuid: "uuid-1",
        name: "Tokyo-01",
        status: "online",
        cpu: 25.5,
        ram: { percent: 45.2 },
        disk: { percent: 60.0 },
        network: { up: 1024, down: 2048 },
      },
      error: undefined,
    });

    const { container } = renderWithProviders(
      <Component service={{ widget: { type: "komari", nodeId: "Tokyo-01", fields: ["cpu", "disk"] } }} />,
      {
        settings: { hideErrors: false },
      },
    );

    expect(container.querySelectorAll(".service-block")).toHaveLength(2);
    expectBlockValue(container, "komari.cpu", 25.5);
    expectBlockValue(container, "komari.disk", 60);
    expect(screen.queryByText("komari.name")).not.toBeInTheDocument();
    expect(screen.queryByText("komari.memory")).not.toBeInTheDocument();
  });
});
