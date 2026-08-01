import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BiArrowBack, BiCog, BiPencil, BiPlus, BiTrash } from "react-icons/bi";

const FIELDS = [
  { key: "name", label: "名称", required: true, placeholder: "GitHub" },
  { key: "href", label: "链接 URL", required: true, placeholder: "https://github.com" },
  { key: "abbr", label: "缩写 (2字母)", placeholder: "GH" },
  { key: "icon", label: "图标文件名", placeholder: "github.png" },
  { key: "description", label: "描述", placeholder: "代码托管平台" },
];

export default function Admin() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newGroup, setNewGroup] = useState("");

  const [form, setForm] = useState({ group: "", name: "", href: "", abbr: "", icon: "", description: "" });
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bookmarks");
      if (!res.ok) throw new Error("加载失败");
      setGroups(await res.json());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({ group: "", name: "", href: "", abbr: "", icon: "", description: "" });
    setEditing(null);
  };

  const submitLink = async (e) => {
    e.preventDefault();
    setError("");
    const body = { ...form };
    try {
      const res = editing
        ? await fetch("/api/admin/bookmarks", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, oldGroup: editing.group, oldName: editing.name }),
          })
        : await fetch("/api/admin/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }
      setGroups(await res.json());
      resetForm();
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteLink = async (group, name) => {
    if (!confirm(`确定删除链接 "${name}" ？`)) return;
    setError("");
    try {
      const res = await fetch("/api/admin/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, name }),
      });
      if (!res.ok) throw new Error("删除失败");
      setGroups(await res.json());
    } catch (e) {
      setError(e.message);
    }
  };

  const editLink = (group, bm) => {
    setEditing({ group, name: bm.name });
    setForm({
      group,
      name: bm.name,
      href: bm.href || "",
      abbr: bm.abbr || "",
      icon: bm.icon || "",
      description: bm.description || "",
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addGroupFn = async (e) => {
    e.preventDefault();
    setError("");
    if (!newGroup.trim()) return;
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroup.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "添加分类失败");
      }
      setGroups(await res.json());
      setNewGroup("");
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteGroupFn = async (name) => {
    if (!confirm(`确定删除分类 "${name}" 及其下所有链接？`)) return;
    setError("");
    try {
      const res = await fetch("/api/admin/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("删除分类失败");
      setGroups(await res.json());
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BiCog /> 书签后台管理
          </h1>
          <Link href="/" className="flex items-center gap-1 text-theme-600 dark:text-theme-400 hover:underline">
            <BiArrowBack /> 返回首页
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
          )}

        {/* Add / edit link */}
        <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow">
          <h2 className="font-semibold mb-3">
            {editing ? `编辑链接：${editing.group} / ${editing.name}` : "添加站点链接"}
          </h2>
          <form onSubmit={submitLink} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">分类</label>
              <select
                className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                required
              >
                <option value="">选择分类</option>
                {groups.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-xs mb-1">
                  {f.label}
                  {f.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  value={form[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  required={f.key === "name" || f.key === "href"}
                />
              </div>
            ))}
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="px-4 py-2 rounded bg-theme-500 text-white hover:bg-theme-600">
                {editing ? "保存修改" : "添加链接"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600"
                >
                  取消
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Add group */}
        <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow">
          <h2 className="font-semibold mb-3">添加分类</h2>
          <form onSubmit={addGroupFn} className="flex gap-2">
            <input
              className="flex-1 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              value={newGroup}
              placeholder="分类名称，如 开发工具"
              onChange={(e) => setNewGroup(e.target.value)}
              required
            />
            <button type="submit" className="px-4 py-2 rounded bg-theme-500 text-white hover:bg-theme-600">
              添加分类
            </button>
          </form>
        </div>

        {/* Groups list */}
        {loading ? (
          <p className="text-sm opacity-60">加载中…</p>
        ) : (
          <div className="space-y-4">
            {groups.length === 0 && (
              <p className="text-sm opacity-60">还没有任何分类，先在上方添加一个分类吧。</p>
            )}
            {groups.map((g) => (
              <div
                key={g.name}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{g.name}</h3>
                  <button
                    onClick={() => deleteGroupFn(g.name)}
                    className="text-red-500 hover:underline text-sm flex items-center gap-1"
                  >
                    <BiTrash /> 删除分类
                  </button>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {g.bookmarks.map((bm) => (
                    <li key={bm.name} className="py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{bm.name}</div>
                        <div className="text-xs opacity-60 truncate">{bm.href}</div>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <button
                          onClick={() => editLink(g.name, bm)}
                          className="text-theme-600 dark:text-theme-400 hover:underline text-sm flex items-center gap-1"
                        >
                          <BiPencil /> 编辑
                        </button>
                        <button
                          onClick={() => deleteLink(g.name, bm.name)}
                          className="text-red-500 hover:underline text-sm flex items-center gap-1"
                        >
                          <BiTrash /> 删除
                        </button>
                      </div>
                    </li>
                  ))}
                  {g.bookmarks.length === 0 && <li className="py-2 text-xs opacity-60">（空分类）</li>}
                </ul>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-xs opacity-50 flex items-center gap-1">
          <BiPlus /> 改动会实时写回 config/bookmarks.yaml，返回首页即可看到更新。
        </p>
      </div>
    </div>
  );
}
