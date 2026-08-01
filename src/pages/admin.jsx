import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import yaml from "js-yaml";
import { BiArrowBack, BiCog, BiPencil, BiPlus, BiTrash } from "react-icons/bi";

// ----------------------------- 书签 标签 -----------------------------

const LINK_FIELDS = [
  { key: "name", label: "名称", required: true, placeholder: "GitHub" },
  { key: "href", label: "链接 URL", required: true, placeholder: "https://github.com" },
  { key: "abbr", label: "缩写 (2字母)", placeholder: "GH" },
  { key: "icon", label: "图标文件名", placeholder: "github.png" },
  { key: "description", label: "描述", placeholder: "代码托管平台" },
];

function BookmarksPanel() {
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
    <div className="space-y-6">
      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow">
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
          {LINK_FIELDS.map((f) => (
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

      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow">
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

      <p className="mt-2 text-xs opacity-50 flex items-center gap-1">
        <BiPlus /> 改动会实时写回 config/bookmarks.yaml，返回首页即可看到更新。
      </p>
    </div>
  );
}

// ----------------------------- 服务 标签 -----------------------------

const SERVICE_FIELDS = [
  { key: "name", label: "服务名称", required: true, placeholder: "Synology" },
  { key: "href", label: "跳转 URL", required: true, placeholder: "https://zyweb.top:5001/" },
  { key: "icon", label: "图标 URL", placeholder: "https://.../icon.png" },
  { key: "description", label: "描述", placeholder: "群晖外网访问" },
  { key: "server", label: "Docker 主机", placeholder: "my-docker（可空）" },
  { key: "container", label: "容器名", placeholder: "portainer（可空）" },
  { key: "ping", label: "健康检查地址/IP", placeholder: "http://192.168.99.3:5000（可空）" },
];

function ServicesPanel() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newGroup, setNewGroup] = useState("");

  const [form, setForm] = useState(emptyServiceForm());
  const [editing, setEditing] = useState(null);
  const [widgetText, setWidgetText] = useState("");
  const [optionsText, setOptionsText] = useState("");

  function emptyServiceForm() {
    return { group: "", name: "", href: "", icon: "", description: "", server: "", container: "", ping: "", showStats: false };
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/services");
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
    setForm(emptyServiceForm());
    setEditing(null);
    setWidgetText("");
    setOptionsText("");
  };

  const parseYamlBlock = (text, label) => {
    if (!text || !text.trim()) return undefined;
    try {
      return yaml.load(text);
    } catch (e) {
      throw new Error(`${label} 不是合法 YAML：${e.message}`);
    }
  };

  const submitService = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const widget = parseYamlBlock(widgetText, "widget");
      const options = parseYamlBlock(optionsText, "options");
      const payload = {
        ...form,
        showStats: form.showStats === true || form.showStats === "true",
        widget,
        options,
      };
      const res = editing
        ? await fetch("/api/admin/services", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, oldGroup: editing.group, oldName: editing.name }),
          })
        : await fetch("/api/admin/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
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

  const deleteService = async (group, name) => {
    if (!confirm(`确定删除服务 "${name}" ？`)) return;
    setError("");
    try {
      const res = await fetch("/api/admin/services", {
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

  const editService = (group, svc) => {
    setEditing({ group, name: svc.name });
    setForm({
      group,
      name: svc.name,
      href: svc.href || "",
      icon: svc.icon || "",
      description: svc.description || "",
      server: svc.server || "",
      container: svc.container || "",
      ping: svc.ping || "",
      showStats: Boolean(svc.showStats),
    });
    // 把对象/数组转回 YAML 文本，方便在文本框里编辑
    setWidgetText(svc.widget && typeof svc.widget === "object" && Object.keys(svc.widget).length ? yaml.dump(svc.widget, { lineWidth: -1 }) : "");
    setOptionsText(svc.options && Array.isArray(svc.options) && svc.options.length ? yaml.dump(svc.options, { lineWidth: -1 }) : "");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addGroupFn = async (e) => {
    e.preventDefault();
    setError("");
    if (!newGroup.trim()) return;
    try {
      const res = await fetch("/api/admin/service-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroup.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "添加分组失败");
      }
      setGroups(await res.json());
      setNewGroup("");
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteGroupFn = async (name) => {
    if (!confirm(`确定删除分组 "${name}" 及其下所有服务？`)) return;
    setError("");
    try {
      const res = await fetch("/api/admin/service-groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("删除分组失败");
      setGroups(await res.json());
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow">
        <h2 className="font-semibold mb-3">
          {editing ? `编辑服务：${editing.group} / ${editing.name}` : "添加服务"}
        </h2>
        <form onSubmit={submitService} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1">分组</label>
            <select
              className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              value={form.group}
              onChange={(e) => setForm({ ...form, group: e.target.value })}
              required
            >
              <option value="">选择分组</option>
              {groups.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          {SERVICE_FIELDS.map((f) => (
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
          <label className="flex items-center gap-2 col-span-1 sm:col-span-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.showStats)}
              onChange={(e) => setForm({ ...form, showStats: e.target.checked })}
            />
            展开组件统计 (showStats)
          </label>

          <div className="sm:col-span-2">
            <label className="block text-xs mb-1">
              widget（监控组件，原始 YAML；留空表示无。第一行通常是 <code>type: xxx</code>）
            </label>
            <textarea
              className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 font-mono text-xs"
              rows={6}
              value={widgetText}
              placeholder={"type: qbittorrent\nurl: http://192.168.99.3:8080\nusername: admin\npassword: fugang520123"}
              onChange={(e) => setWidgetText(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs mb-1">
              options（列表，原始 YAML；留空表示无。如 openwrt：每行 <code>- 项目</code>）
            </label>
            <textarea
              className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 font-mono text-xs"
              rows={3}
              value={optionsText}
              placeholder={"- cpu\n- memory\n- temperature"}
              onChange={(e) => setOptionsText(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="px-4 py-2 rounded bg-theme-500 text-white hover:bg-theme-600">
              {editing ? "保存修改" : "添加服务"}
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

      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow">
        <h2 className="font-semibold mb-3">添加分组</h2>
        <form onSubmit={addGroupFn} className="flex gap-2">
          <input
            className="flex-1 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            value={newGroup}
            placeholder="分组名称，如 服务器监控"
            onChange={(e) => setNewGroup(e.target.value)}
            required
          />
          <button type="submit" className="px-4 py-2 rounded bg-theme-500 text-white hover:bg-theme-600">
            添加分组
          </button>
        </form>
      </div>

      {loading ? (
        <p className="text-sm opacity-60">加载中…</p>
      ) : (
        <div className="space-y-4">
          {groups.length === 0 && (
            <p className="text-sm opacity-60">还没有任何分组，先在上方添加一个分组吧。</p>
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
                  <BiTrash /> 删除分组
                </button>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {g.services.map((svc) => (
                  <li key={svc.name} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-med-ium truncate">{svc.name}</div>
                      <div className="text-xs opacity-60 truncate">{svc.href}</div>
                      {svc.widget?.type && (
                        <div className="text-[10px] opacity-50 truncate">widget: {svc.widget.type}</div>
                      )}
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => editService(g.name, svc)}
                        className="text-theme-600 dark:text-theme-400 hover:underline text-sm flex items-center gap-1"
                      >
                        <BiPencil /> 编辑
                      </button>
                      <button
                        onClick={() => deleteService(g.name, svc.name)}
                        className="text-red-500 hover:underline text-sm flex items-center gap-1"
                      >
                        <BiTrash /> 删除
                      </button>
                    </div>
                  </li>
                ))}
                {g.services.length === 0 && <li className="py-2 text-xs opacity-60">（空分组）</li>}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs opacity-50 flex items-center gap-1">
        <BiPlus /> 改动会实时写回 config/services.yaml，返回首页即可看到更新。
      </p>
    </div>
  );
}

// ----------------------------- 外壳 / 标签切换 -----------------------------

export default function Admin() {
  const [tab, setTab] = useState("bookmarks");

  return (
    <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BiCog /> 后台管理
          </h1>
          <Link href="/" className="flex items-center gap-1 text-theme-600 dark:text-theme-400 hover:underline">
            <BiArrowBack /> 返回首页
          </Link>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("bookmarks")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === "bookmarks"
                ? "bg-theme-500 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}
          >
            书签 / 链接
          </button>
          <button
            onClick={() => setTab("services")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === "services"
                ? "bg-theme-500 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}
          >
            服务 / 分组
          </button>
        </div>

        {tab === "bookmarks" ? <BookmarksPanel /> : <ServicesPanel />}
      </div>
    </div>
  );
}
