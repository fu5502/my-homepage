import { beforeEach, describe, expect, it, vi } from "vitest";

const { fs, config } = vi.hoisted(() => ({
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    rename: vi.fn(),
    readdir: vi.fn(),
  },
  config: {
    CONF_DIR: "/conf",
    default: vi.fn(),
  },
}));

vi.mock("fs", () => ({
  promises: fs,
}));

vi.mock("utils/config/config", () => ({
  CONF_DIR: config.CONF_DIR,
  default: config.default,
}));

import {
  addBookmark,
  deleteBookmark,
  readBookmarksModel,
  reorderBookmarks,
  updateBookmark,
  addService,
  deleteService,
  readServicesModel,
  reorderServices,
  updateService,
} from "./admin";

describe("utils/config/admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Bookmarks", () => {
    it("updateBookmark preserves position when editing within the same group", async () => {
      const initialYaml = `
---
- Dev:
    - GitHub:
        - href: https://github.com
    - GitLab:
        - href: https://gitlab.com
    - Gitea:
        - href: https://gitea.io
`;
      fs.readFile.mockResolvedValue(initialYaml);
      fs.writeFile.mockResolvedValue();
      fs.rename.mockResolvedValue();

      // Edit GitLab (middle element at index 1)
      const updatedModel = await updateBookmark({
        oldGroup: "Dev",
        oldName: "GitLab",
        group: "Dev",
        name: "GitLab CE",
        href: "https://gitlab.example.com",
        abbr: "GL",
      });

      const devGroup = updatedModel.find((g) => g.name === "Dev");
      expect(devGroup).toBeDefined();
      expect(devGroup.bookmarks.map((b) => b.name)).toEqual(["GitHub", "GitLab CE", "Gitea"]);
      expect(devGroup.bookmarks[1]).toEqual({
        name: "GitLab CE",
        href: "https://gitlab.example.com",
        abbr: "GL",
      });
    });

    it("updateBookmark preserves position when editing the first element", async () => {
      const initialYaml = `
---
- Dev:
    - GitHub:
        - href: https://github.com
    - GitLab:
        - href: https://gitlab.com
`;
      fs.readFile.mockResolvedValue(initialYaml);
      fs.writeFile.mockResolvedValue();
      fs.rename.mockResolvedValue();

      const updatedModel = await updateBookmark({
        oldGroup: "Dev",
        oldName: "GitHub",
        group: "Dev",
        name: "GitHub Enterprise",
        href: "https://github.corp.com",
      });

      const devGroup = updatedModel.find((g) => g.name === "Dev");
      expect(devGroup.bookmarks.map((b) => b.name)).toEqual(["GitHub Enterprise", "GitLab"]);
    });

    it("updateBookmark moves to new group when group changed", async () => {
      const initialYaml = `
---
- Dev:
    - GitHub:
        - href: https://github.com
- Ops:
    - Grafana:
        - href: https://grafana.com
`;
      fs.readFile.mockResolvedValue(initialYaml);
      fs.writeFile.mockResolvedValue();
      fs.rename.mockResolvedValue();

      const updatedModel = await updateBookmark({
        oldGroup: "Dev",
        oldName: "GitHub",
        group: "Ops",
        name: "GitHub",
        href: "https://github.com",
      });

      const devGroup = updatedModel.find((g) => g.name === "Dev");
      const opsGroup = updatedModel.find((g) => g.name === "Ops");
      expect(devGroup.bookmarks).toHaveLength(0);
      expect(opsGroup.bookmarks.map((b) => b.name)).toEqual(["Grafana", "GitHub"]);
    });

    it("reorderBookmarks updates bookmark order within group", async () => {
      const initialYaml = `
---
- Dev:
    - GitHub:
        - href: https://github.com
    - GitLab:
        - href: https://gitlab.com
    - Gitea:
        - href: https://gitea.io
`;
      fs.readFile.mockResolvedValue(initialYaml);
      fs.writeFile.mockResolvedValue();
      fs.rename.mockResolvedValue();

      const updatedModel = await reorderBookmarks({
        group: "Dev",
        order: ["Gitea", "GitHub", "GitLab"],
      });

      const devGroup = updatedModel.find((g) => g.name === "Dev");
      expect(devGroup.bookmarks.map((b) => b.name)).toEqual(["Gitea", "GitHub", "GitLab"]);
    });
  });

  describe("Services", () => {
    it("updateService preserves position when editing within the same group", async () => {
      const initialYaml = `
---
- Media:
    - Plex:
        href: https://plex.tv
    - Jellyfin:
        href: https://jellyfin.org
    - Emby:
        href: https://emby.media
`;
      fs.readFile.mockResolvedValue(initialYaml);
      fs.writeFile.mockResolvedValue();
      fs.rename.mockResolvedValue();

      // Edit Jellyfin (middle element at index 1)
      const updatedModel = await updateService({
        oldGroup: "Media",
        oldName: "Jellyfin",
        group: "Media",
        name: "Jellyfin Server",
        href: "https://jellyfin.local:8096",
        icon: "jellyfin.png",
      });

      const mediaGroup = updatedModel.find((g) => g.name === "Media");
      expect(mediaGroup).toBeDefined();
      expect(mediaGroup.services.map((s) => s.name)).toEqual(["Plex", "Jellyfin Server", "Emby"]);
      expect(mediaGroup.services[1]).toEqual({
        name: "Jellyfin Server",
        href: "https://jellyfin.local:8096",
        icon: "jellyfin.png",
      });
    });

    it("updateService preserves position when editing the first element", async () => {
      const initialYaml = `
---
- Media:
    - Plex:
        href: https://plex.tv
    - Jellyfin:
        href: https://jellyfin.org
`;
      fs.readFile.mockResolvedValue(initialYaml);
      fs.writeFile.mockResolvedValue();
      fs.rename.mockResolvedValue();

      const updatedModel = await updateService({
        oldGroup: "Media",
        oldName: "Plex",
        group: "Media",
        name: "Plex Media Server",
        href: "https://plex.tv:32400",
      });

      const mediaGroup = updatedModel.find((g) => g.name === "Media");
      expect(mediaGroup.services.map((s) => s.name)).toEqual(["Plex Media Server", "Jellyfin"]);
    });

    it("updateService moves to new group when group changed", async () => {
      const initialYaml = `
---
- Media:
    - Plex:
        href: https://plex.tv
- Tools:
    - Portainer:
        href: https://portainer.io
`;
      fs.readFile.mockResolvedValue(initialYaml);
      fs.writeFile.mockResolvedValue();
      fs.rename.mockResolvedValue();

      const updatedModel = await updateService({
        oldGroup: "Media",
        oldName: "Plex",
        group: "Tools",
        name: "Plex",
        href: "https://plex.tv",
      });

      const mediaGroup = updatedModel.find((g) => g.name === "Media");
      const toolsGroup = updatedModel.find((g) => g.name === "Tools");
      expect(mediaGroup.services).toHaveLength(0);
      expect(toolsGroup.services.map((s) => s.name)).toEqual(["Portainer", "Plex"]);
    });

    it("reorderServices updates service order within group", async () => {
      const initialYaml = `
---
- Media:
    - Plex:
        href: https://plex.tv
    - Jellyfin:
        href: https://jellyfin.org
    - Emby:
        href: https://emby.media
`;
      fs.readFile.mockResolvedValue(initialYaml);
      fs.writeFile.mockResolvedValue();
      fs.rename.mockResolvedValue();

      const updatedModel = await reorderServices({
        group: "Media",
        order: ["Emby", "Plex", "Jellyfin"],
      });

      const mediaGroup = updatedModel.find((g) => g.name === "Media");
      expect(mediaGroup.services.map((s) => s.name)).toEqual(["Emby", "Plex", "Jellyfin"]);
    });
  });
});
