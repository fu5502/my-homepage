import { beforeEach, describe, expect, it, vi } from "vitest";

import createMockRes from "test-utils/create-mock-res";

const { admin } = vi.hoisted(() => ({
  admin: {
    readBookmarksModel: vi.fn(),
    addBookmark: vi.fn(),
    updateBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
    reorderBookmarks: vi.fn(),
  },
}));

vi.mock("utils/config/admin", () => admin);

import handler from "pages/api/admin/bookmarks";

describe("pages/api/admin/bookmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles GET request", async () => {
    admin.readBookmarksModel.mockResolvedValueOnce([{ name: "Group1", bookmarks: [] }]);
    const req = { method: "GET" };
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual([{ name: "Group1", bookmarks: [] }]);
  });

  it("handles PUT request for updating a bookmark", async () => {
    admin.updateBookmark.mockResolvedValueOnce([{ name: "Group1", bookmarks: [{ name: "Site" }] }]);
    const req = {
      method: "PUT",
      body: {
        oldGroup: "Group1",
        oldName: "OldSite",
        group: "Group1",
        name: "Site",
        href: "https://example.com",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(admin.updateBookmark).toHaveBeenCalledWith({
      oldGroup: "Group1",
      oldName: "OldSite",
      group: "Group1",
      name: "Site",
      href: "https://example.com",
      abbr: undefined,
      icon: undefined,
      description: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("handles PATCH request for reordering bookmarks", async () => {
    admin.reorderBookmarks.mockResolvedValueOnce([{ name: "Group1", bookmarks: [] }]);
    const req = {
      method: "PATCH",
      body: {
        group: "Group1",
        order: ["B", "A"],
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(admin.reorderBookmarks).toHaveBeenCalledWith({
      group: "Group1",
      order: ["B", "A"],
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects PATCH with invalid parameters", async () => {
    const req = {
      method: "PATCH",
      body: { group: "Group1" },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ error: "group and order[] are required" });
  });
});
