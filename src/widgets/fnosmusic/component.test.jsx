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

describe("widgets/fnosmusic/component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders placeholders while loading", () => {
    useWidgetAPI.mockReturnValue({ data: undefined, error: undefined });

    const { container } = renderWithProviders(<Component service={{ widget: { type: "fnosmusic" } }} />, {
      settings: { hideErrors: false },
    });

    expect(container.querySelectorAll(".service-block")).toHaveLength(3);
    expect(screen.getByText("fnosmusic.songs")).toBeInTheDocument();
    expect(screen.getByText("fnosmusic.albums")).toBeInTheDocument();
    expect(screen.getByText("fnosmusic.artists")).toBeInTheDocument();
  });

  it("renders stats and now playing banner when data is ready", () => {
    useWidgetAPI.mockReturnValue({
      data: {
        stats: {
          songs: 4454,
          albums: 313,
          artists: 242,
        },
        nowPlaying: {
          title: "惩罚",
          artist: "阿杜",
          album: "坚持到底",
          duration: 224938,
        },
      },
      error: undefined,
    });

    const { container } = renderWithProviders(<Component service={{ widget: { type: "fnosmusic" } }} />, {
      settings: { hideErrors: false },
    });

    expect(container.querySelectorAll(".service-block")).toHaveLength(3);
    expectBlockValue(container, "fnosmusic.songs", 4454);
    expectBlockValue(container, "fnosmusic.albums", 313);
    expectBlockValue(container, "fnosmusic.artists", 242);

    expect(screen.getByText("惩罚")).toBeInTheDocument();
    expect(screen.getByText("- 阿杜")).toBeInTheDocument();
    expect(screen.getByText("03:44", { exact: false })).toBeInTheDocument();
  });

  it("respects fields filtering", () => {
    useWidgetAPI.mockReturnValue({
      data: {
        stats: {
          songs: 100,
          albums: 20,
          artists: 5,
        },
        nowPlaying: null,
      },
      error: undefined,
    });

    const { container } = renderWithProviders(
      <Component service={{ widget: { type: "fnosmusic", fields: ["songs"] } }} />,
      {
        settings: { hideErrors: false },
      },
    );

    expect(container.querySelectorAll(".service-block")).toHaveLength(1);
    expectBlockValue(container, "fnosmusic.songs", 100);
    expect(screen.queryByText("fnosmusic.albums")).not.toBeInTheDocument();
  });
});
