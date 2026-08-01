import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import yaml from "js-yaml";
import {
  BiArrowBack, BiBook, BiCheckCircle, BiCog, BiChevronDown, BiChevronRight,
  BiErrorCircle, BiGlobe, BiLogOut, BiPencil, BiPlus, BiServer, BiSlider, BiTrash,
} from "react-icons/bi";
import { signOut } from "next-auth/react";

// 仓库地址固定显示在页脚（首页 + 后台），与首页保持一致
const GITHUB_REPO_URL = "https://github.com/fu5502/my-homepage";
const Version = dynamic(() => import("components/version"), { ssr: false });

// --------------------- 通用小组件 ---------------------

// 友好的内联二次确认：先显示「删除」，点击后就地变成「确认 / 取消」，不再弹原生对话框
function ConfirmButton({ label, hint = "确定要删除吗？", confirmText = "确认", onConfirm, className }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  if (!armed) {
    return (
      <button type="button" className={className} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="opacity-70">{hint}</span>
      <button
        type="button"
        className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmText}
      </button>
      <button type="button" className="opacity-60 hover:opacity-100" onClick={() => setArmed(false)}>
        取消
      </button>
    </span>
  );
}

// 分组输入：既能从已有分组里选，也能直接输入新分组名（后端会自动创建该分组）
function GroupInput({ listId, value, groups, onChange, placeholder }) {
  return (
    <>
      <input
        list={listId}
        className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      <datalist id={listId}>
        {groups.map((g) => (
          <option key={g.name} value={g.name} />
        ))}
      </datalist>
    </>
  );
}

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
  const [notice, setNotice] = useState("");

  const [expanded, setExpanded] = useState(() => new Set());
  const toggleGroup = (name) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

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
    setNotice("");
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
      const label = editing ? `已更新链接「${editing.name}」` : `已添加链接「${form.name}」`;
      setGroups(await res.json());
      setNotice(label);
      resetForm();
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteLink = async (group, name) => {
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, name }),
      });
      if (!res.ok) throw new Error("删除失败");
      setGroups(await res.json());
      setNotice(`已删除链接「${name}」`);
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

  const deleteGroupFn = async (name) => {
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("删除分类失败");
      setGroups(await res.json());
      setNotice(`已删除分类「${name}」`);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm opacity-60">管理首页的快捷链接，按分类分组。点击分类标题可展开 / 收起，下方可新增或编辑链接。</p>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-3 py-2 text-sm">
          <BiErrorCircle className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-3 py-2 text-sm">
          <BiCheckCircle className="shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow">
        <h2 className="font-semibold mb-3">
          {editing ? `编辑链接：${editing.group} / ${editing.name}` : "添加站点链接"}
        </h2>
        <form onSubmit={submitLink} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1">分类</label>
            <GroupInput
              listId="bm-groups"
              value={form.group}
              groups={groups}
              onChange={(v) => setForm({ ...form, group: v })}
              placeholder="选择或输入新分类，如 开发工具"
            />
            <p className="text-[11px] opacity-50 mt-1">直接输入新分类名即可自动创建。</p>
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

      <p className="text-xs opacity-50">提示：在上方「分类」里直接输入一个不存在的名称，就会自动新建该分类。</p>

      {loading ? (
        <p className="text-sm opacity-60">加载中…</p>
      ) : (
        <div className="space-y-4">
          {groups.length === 0 && (
            <p className="text-sm opacity-60">还没有任何分类，先在上方添加一个分类吧。</p>
          )}
          {groups.map((g) => {
            const open = expanded.has(g.name);
            return (
              <div
                key={g.name}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.name)}
                    className="flex items-center gap-1 font-semibold hover:text-theme-600 dark:hover:text-theme-400"
                    title={open ? "收起" : "展开"}
                  >
                    {open ? <BiChevronDown /> : <BiChevronRight />}
                    <span>{g.name}</span>
                    <span className="text-xs opacity-50 font-normal">({g.bookmarks.length})</span>
                  </button>
                  <ConfirmButton
                    label={<><BiTrash /> 删除分类</>}
                    hint="删除该分类及全部链接？"
                    className="text-red-500 hover:underline text-sm flex items-center gap-1"
                    onConfirm={() => deleteGroupFn(g.name)}
                  />
                </div>
                {open && (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {g.bookmarks.map((bm) => (
                      <li key={bm.name} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{bm.name}</div>
                          <div className="text-xs opacity-60 truncate">{bm.href}</div>
                        </div>
                        <div className="flex gap-3 shrink-0 items-center">
                          <button
                            onClick={() => editLink(g.name, bm)}
                            className="text-theme-600 dark:text-theme-400 hover:underline text-sm flex items-center gap-1"
                          >
                            <BiPencil /> 编辑
                          </button>
                          <ConfirmButton
                            label={<><BiTrash /> 删除</>}
                            hint="删除该链接？"
                            className="text-red-500 hover:underline text-sm flex items-center gap-1"
                            onConfirm={() => deleteLink(g.name, bm.name)}
                          />
                        </div>
                      </li>
                    ))}
                    {g.bookmarks.length === 0 && <li className="py-2 text-xs opacity-60">（空分类）</li>}
                  </ul>
                )}
              </div>
            );
          })}
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
  { key: "ping", label: "健康检查地址/IP", placeholder: "http://192.168.1.100:5000（可空）" },
];

function ServicesPanel() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [expanded, setExpanded] = useState(() => new Set());
  const toggleGroup = (name) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

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
    setNotice("");
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
      const label = editing ? `已更新服务「${editing.name}」` : `已添加服务「${form.name}」`;
      setGroups(await res.json());
      setNotice(label);
      resetForm();
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteService = async (group, name) => {
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/services", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, name }),
      });
      if (!res.ok) throw new Error("删除失败");
      setGroups(await res.json());
      setNotice(`已删除服务「${name}」`);
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

  const deleteGroupFn = async (name) => {
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/service-groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("删除分组失败");
      setGroups(await res.json());
      setNotice(`已删除分组「${name}」`);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm opacity-60">管理首页的服务卡片与监控组件，按分组归类。点击分组标题展开 / 收起，下方可新增或编辑服务。</p>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-3 py-2 text-sm">
          <BiErrorCircle className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-3 py-2 text-sm">
          <BiCheckCircle className="shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow">
        <h2 className="font-semibold mb-3">
          {editing ? `编辑服务：${editing.group} / ${editing.name}` : "添加服务"}
        </h2>
        <form onSubmit={submitService} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1">分组</label>
            <GroupInput
              listId="svc-groups"
              value={form.group}
              groups={groups}
              onChange={(v) => setForm({ ...form, group: v })}
              placeholder="选择或输入新分组，如 服务器监控"
            />
            <p className="text-[11px] opacity-50 mt-1">直接输入新分组名即可自动创建。</p>
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
              placeholder={"type: qbittorrent\nurl: http://192.168.1.100:8080\nusername: your-username\npassword: your-password"}
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

      <p className="text-xs opacity-50">提示：在上方「分组」里直接输入一个不存在的名称，就会自动新建该分组。</p>

      {loading ? (
        <p className="text-sm opacity-60">加载中…</p>
      ) : (
        <div className="space-y-4">
          {groups.length === 0 && (
            <p className="text-sm opacity-60">还没有任何分组，先在上方添加一个分组吧。</p>
          )}
          {groups.map((g) => {
            const open = expanded.has(g.name);
            return (
              <div
                key={g.name}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.name)}
                    className="flex items-center gap-1 font-semibold hover:text-theme-600 dark:hover:text-theme-400"
                    title={open ? "收起" : "展开"}
                  >
                    {open ? <BiChevronDown /> : <BiChevronRight />}
                    <span>{g.name}</span>
                    <span className="text-xs opacity-50 font-normal">({g.services.length})</span>
                  </button>
                  <ConfirmButton
                    label={<><BiTrash /> 删除分组</>}
                    hint="删除该分组及全部服务？"
                    className="text-red-500 hover:underline text-sm flex items-center gap-1"
                    onConfirm={() => deleteGroupFn(g.name)}
                  />
                </div>
                {open && (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {g.services.map((svc) => (
                      <li key={svc.name} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{svc.name}</div>
                          <div className="text-xs opacity-60 truncate">{svc.href}</div>
                          {svc.widget?.type && (
                            <div className="text-[10px] opacity-50 truncate">widget: {svc.widget.type}</div>
                          )}
                        </div>
                        <div className="flex gap-3 shrink-0 items-center">
                          <button
                            onClick={() => editService(g.name, svc)}
                            className="text-theme-600 dark:text-theme-400 hover:underline text-sm flex items-center gap-1"
                          >
                            <BiPencil /> 编辑
                          </button>
                          <ConfirmButton
                            label={<><BiTrash /> 删除</>}
                            hint="删除该服务？"
                            className="text-red-500 hover:underline text-sm flex items-center gap-1"
                            onConfirm={() => deleteService(g.name, svc.name)}
                          />
                        </div>
                      </li>
                    ))}
                    {g.services.length === 0 && <li className="py-2 text-xs opacity-60">（空分组）</li>}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-xs opacity-50 flex items-center gap-1">
        <BiPlus /> 改动会实时写回 config/services.yaml，返回首页即可看到更新。
      </p>
    </div>
  );
}

// ----------------------------- 站点信息 标签 -----------------------------

function SitePanel() {
  const [copyright, setCopyright] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/site");
        if (!res.ok) throw new Error("加载失败");
        const data = await res.json();
        setCopyright(data.copyright || "");
        setError("");
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copyright }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }
      await res.json();
      setSavedAt(new Date().toLocaleString());
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm opacity-60">加载中…</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm opacity-60">这段信息会显示在首页页脚，目前只开放「版权信息」一项（GitHub 仓库地址固定展示，不可修改）。</p>
      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow">
        <h2 className="font-semibold mb-3">站点信息（页脚展示）</h2>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-xs mb-1">版权信息</label>
            <textarea
              className="w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              rows={3}
              value={copyright}
              placeholder="© 2026 fugang. 保留所有权利。"
              onChange={(e) => setCopyright(e.target.value)}
            />
            <p className="text-[11px] opacity-50 mt-1">支持纯文本，会显示在首页页脚左侧。</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-3 py-2 text-sm">
              <BiErrorCircle className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-theme-500 text-white hover:bg-theme-600 disabled:opacity-50">
              {saving ? "保存中…" : "保存"}
            </button>
            {savedAt && <span className="text-xs opacity-60">已于 {savedAt} 保存</span>}
          </div>
        </form>
      </div>
      <p className="mt-2 text-xs opacity-50 flex items-center gap-1">
        <BiPlus /> 改动会写回 config/site.yaml，返回首页即可在页脚看到更新。
      </p>
    </div>
  );
}

// ----------------------------- 全局设置 标签 -----------------------------

const THEME_COLORS = [
  "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime",
  "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia",
  "pink", "rose", "white",
];

const LANGUAGES = [
  ["zh-Hans", "简体中文"],
  ["zh-Hant", "繁體中文"],
  ["en", "English"],
  ["ja", "日本語"],
  ["ko", "한국어"],
  ["de", "Deutsch"],
  ["fr", "Français"],
  ["es", "Español"],
  ["ru", "Русский"],
];

const BLUR_LEVELS = ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"];

const SETTING_TEXTS = [
  { key: "title", label: "站点标题", placeholder: "我的导航页", hint: "浏览器标签页 + 页面顶部标题" },
  { key: "favicon", label: "Favicon 图标 URL", placeholder: "https://example.com/favicon.png" },
  { key: "base", label: "Base URL（反代到子路径时才填）", placeholder: "留空即可" },
];

const SETTING_SELECTS = [
  { key: "language", label: "界面语言", empty: "默认（English）", options: LANGUAGES },
  { key: "theme", label: "明暗主题", empty: "允许用户自行切换", options: [["light", "浅色"], ["dark", "深色"]] },
  { key: "color", label: "主题配色", empty: "允许用户自行切换", options: THEME_COLORS.map((c) => [c, c]) },
  {
    key: "headerStyle",
    label: "页眉样式",
    empty: "默认",
    options: [
      ["underlined", "underlined 下划线"],
      ["boxed", "boxed 盒子"],
      ["clean", "clean 简洁（隐藏搜索栏）"],
      ["boxedWidgets", "boxedWidgets 组件盒子"],
    ],
  },
  {
    key: "target",
    label: "链接打开方式",
    empty: "默认（新标签页）",
    options: [["_blank", "新标签页"], ["_self", "当前标签页"], ["_top", "顶层窗口"]],
  },
  { key: "iconStyle", label: "图标样式", empty: "默认", options: [["theme", "theme 主题着色"]] },
  { key: "statusStyle", label: "状态指示样式", empty: "默认", options: [["dot", "dot 圆点"], ["basic", "basic 文字"]] },
  { key: "cardBlur", label: "卡片毛玻璃", empty: "不启用", options: BLUR_LEVELS.map((b) => [b, b]) },
];

const SETTING_BOOLS = [
  { key: "hideVersion", label: "隐藏页脚版本号" },
  { key: "disableUpdateCheck", label: "关闭更新检查" },
  { key: "disableCollapse", label: "禁用分组折叠" },
  { key: "fiveColumns", label: "允许五列布局" },
  { key: "fullWidth", label: "全宽显示" },
  { key: "useEqualHeights", label: "卡片等高" },
  { key: "hideErrors", label: "隐藏组件错误提示" },
  { key: "showStats", label: "默认展开组件统计" },
];

const SETTING_NUMBERS = [
  { key: "maxGroupColumns", label: "分组最大列数", min: 1, max: 8, hint: "需 > 6 且在超宽屏下才生效" },
];

const BG_NUMBERS = [
  { key: "brightness", label: "亮度 brightness", min: 0, max: 200, fallback: 100, hint: "100 = 原始亮度，越小越暗" },
  { key: "opacity", label: "不透明度 opacity", min: 0, max: 100, fallback: 100, hint: "0 = 完全透明" },
  { key: "saturate", label: "饱和度 saturate", min: 0, max: 200, fallback: 100, hint: "0 = 完全黑白" },
  { key: "contrast", label: "对比度 contrast", min: 0, max: 200, fallback: 100, hint: "调低（70-80）更柔和" },
  { key: "grayscale", label: "灰度 grayscale", min: 0, max: 100, fallback: 0, hint: "100 = 完全黑白" },
  { key: "hueRotate", label: "色相旋转 hueRotate", min: 0, max: 360, fallback: 0, hint: "单位：度" },
];

// 与首页 buildBackdropFilter 同义，用于后台实时预览框（输入为本地 bg 状态，空字符串表示未设置）。
const PREVIEW_BLUR_PX = { none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 40, "3xl": 64 };
function buildBgPreviewFilter(bg) {
  const parts = [];
  const toNum = (v) => (v === "" || v === undefined ? undefined : Number(v));
  const blurRaw = bg.blur;
  if (blurRaw !== "" && blurRaw !== undefined && blurRaw !== null) {
    const px = typeof blurRaw === "number" ? blurRaw : (PREVIEW_BLUR_PX[blurRaw] ?? Number(blurRaw));
    if (Number.isFinite(px) && px > 0) parts.push(`blur(${px}px)`);
  }
  const sat = toNum(bg.saturate);
  if (sat !== undefined) parts.push(`saturate(${sat}%)`);
  const bri = toNum(bg.brightness);
  if (bri !== undefined) parts.push(`brightness(${bri}%)`);
  const con = toNum(bg.contrast);
  if (con !== undefined) parts.push(`contrast(${con}%)`);
  const gra = toNum(bg.grayscale);
  if (gra !== undefined) parts.push(`grayscale(${gra}%)`);
  const hue = toNum(bg.hueRotate);
  if (hue !== undefined) parts.push(`hue-rotate(${hue}deg)`);
  return parts.join(" ");
}

const LAYOUT_KNOWN_KEYS = ["icon", "style", "columns", "header", "iconsOnly", "initiallyCollapsed"];

const MANAGED_SETTING_KEYS = new Set([
  ...SETTING_TEXTS.map((f) => f.key),
  ...SETTING_SELECTS.map((f) => f.key),
  ...SETTING_BOOLS.map((f) => f.key),
  ...SETTING_NUMBERS.map((f) => f.key),
  "background",
  "layout",
  "providers",
]);

const inputCls = "w-full rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700";

function SettingsPanel() {
  const [fields, setFields] = useState({});
  const [bg, setBg] = useState({ image: "", blur: "" });
  const [bgExtra, setBgExtra] = useState({});
  const [layoutRows, setLayoutRows] = useState([]);
  const [providersText, setProvidersText] = useState("");
  const [advancedText, setAdvancedText] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();

      const nextFields = {};
      [...SETTING_TEXTS, ...SETTING_SELECTS].forEach((f) => {
        nextFields[f.key] = data[f.key] ?? "";
      });
      SETTING_BOOLS.forEach((f) => {
        nextFields[f.key] = Boolean(data[f.key]);
      });
      SETTING_NUMBERS.forEach((f) => {
        nextFields[f.key] = data[f.key] ?? "";
      });
      setFields(nextFields);

      // background 也允许写成一个纯字符串（老写法），统一成对象处理
      const bgSrc = typeof data.background === "string" ? { image: data.background } : data.background || {};
      const nextBg = { image: bgSrc.image ?? "", blur: bgSrc.blur ?? "" };
      BG_NUMBERS.forEach((f) => {
        nextBg[f.key] = bgSrc[f.key] ?? "";
      });
      setBg(nextBg);
      const knownBg = new Set(["image", "blur", ...BG_NUMBERS.map((f) => f.key)]);
      setBgExtra(Object.fromEntries(Object.entries(bgSrc).filter(([k]) => !knownBg.has(k))));

      const layout = data.layout && typeof data.layout === "object" && !Array.isArray(data.layout) ? data.layout : {};
      setLayoutRows(
        Object.entries(layout).map(([name, opt]) => {
          const o = opt && typeof opt === "object" && !Array.isArray(opt) ? opt : {};
          return {
            name,
            icon: o.icon ?? "",
            style: o.style ?? "",
            columns: o.columns ?? "",
            header: o.header === undefined ? "" : String(Boolean(o.header)),
            iconsOnly: Boolean(o.iconsOnly),
            initiallyCollapsed: Boolean(o.initiallyCollapsed),
            extra: Object.fromEntries(Object.entries(o).filter(([k]) => !LAYOUT_KNOWN_KEYS.includes(k))),
          };
        }),
      );

      setProvidersText(
        data.providers && typeof data.providers === "object" ? yaml.dump(data.providers, { lineWidth: -1 }) : "",
      );

      const rest = Object.fromEntries(Object.entries(data).filter(([k]) => !MANAGED_SETTING_KEYS.has(k)));
      setAdvancedText(Object.keys(rest).length ? yaml.dump(rest, { lineWidth: -1 }) : "");

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

  const setField = (key, value) => setFields((prev) => ({ ...prev, [key]: value }));
  const setBgField = (key, value) => setBg((prev) => ({ ...prev, [key]: value }));

  // 实时预览：根据当前 bg 状态计算滤镜与遮罩透明度（拖动即更新，无需保存）
  const bgPreviewFilter = buildBgPreviewFilter(bg);
  const bgPreviewTint =
    bg.opacity !== "" && bg.opacity !== undefined ? 1 - Number(bg.opacity) / 100 : 0;

  const updateRow = (idx, patch) =>
    setLayoutRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const moveRow = (idx, delta) =>
    setLayoutRows((prev) => {
      const target = idx + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });

  const buildPayload = () => {
    const advanced = advancedText.trim() ? yaml.load(advancedText) : {};
    if (advanced && (typeof advanced !== "object" || Array.isArray(advanced))) {
      throw new Error("「其他高级设置」必须是 key: value 形式的 YAML");
    }
    const payload = { ...(advanced || {}) };

    [...SETTING_TEXTS, ...SETTING_SELECTS].forEach((f) => {
      const v = String(fields[f.key] ?? "").trim();
      if (v) payload[f.key] = v;
      else delete payload[f.key];
    });
    SETTING_BOOLS.forEach((f) => {
      if (fields[f.key]) payload[f.key] = true;
      else delete payload[f.key];
    });
    SETTING_NUMBERS.forEach((f) => {
      const v = String(fields[f.key] ?? "").trim();
      if (v === "") {
        delete payload[f.key];
        return;
      }
      const n = Number(v);
      if (Number.isNaN(n)) throw new Error(`${f.label} 必须是数字`);
      payload[f.key] = n;
    });

    const background = { ...bgExtra };
    if (String(bg.image ?? "").trim()) background.image = String(bg.image).trim();
    if (String(bg.blur ?? "").trim()) background.blur = String(bg.blur).trim();
    BG_NUMBERS.forEach((f) => {
      const v = String(bg[f.key] ?? "").trim();
      if (v === "") return;
      const n = Number(v);
      if (Number.isNaN(n)) throw new Error(`背景「${f.label}」必须是数字`);
      background[f.key] = n;
    });
    if (Object.keys(background).length) payload.background = background;
    else delete payload.background;

    const layout = {};
    layoutRows.forEach((row) => {
      const name = String(row.name ?? "").trim();
      if (!name) return;
      const o = { ...row.extra };
      if (String(row.icon ?? "").trim()) o.icon = String(row.icon).trim();
      if (row.style) o.style = row.style;
      const cols = String(row.columns ?? "").trim();
      if (cols !== "") {
        const n = Number(cols);
        if (Number.isNaN(n)) throw new Error(`分组「${name}」的列数必须是数字`);
        o.columns = n;
      }
      if (row.header === "true") o.header = true;
      if (row.header === "false") o.header = false;
      if (row.iconsOnly) o.iconsOnly = true;
      if (row.initiallyCollapsed) o.initiallyCollapsed = true;
      layout[name] = o;
    });
    if (Object.keys(layout).length) payload.layout = layout;
    else delete payload.layout;

    if (providersText.trim()) {
      const p = yaml.load(providersText);
      if (!p || typeof p !== "object" || Array.isArray(p)) {
        throw new Error("「服务商 API Key」必须是 key: value 形式的 YAML");
      }
      payload.providers = p;
    } else {
      delete payload.providers;
    }

    return payload;
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }
      const data = await res.json();
      setNotice(
        data.revalidated
          ? `已于 ${new Date().toLocaleString()} 保存，首页已刷新`
          : `已于 ${new Date().toLocaleString()} 保存（首页缓存未自动刷新，可手动刷新页面）`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm opacity-60">加载中…</p>;

  const card = "p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow";

  return (
    <form onSubmit={save} className="space-y-6">
      <p className="text-sm opacity-60">管理首页的全局外观：标题、语言、主题、背景、布局与分组顺序等。保存会写回 config/settings.yaml（原文件 YAML 注释会丢失，配置本身不受影响）。</p>
      <div className={card}>
        <h2 className="font-semibold mb-3">基础设置</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SETTING_TEXTS.map((f) => (
            <div key={f.key}>
              <label className="block text-xs mb-1">{f.label}</label>
              <input
                className={inputCls}
                value={fields[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setField(f.key, e.target.value)}
              />
              {f.hint && <p className="text-[11px] opacity-50 mt-1">{f.hint}</p>}
            </div>
          ))}
          {SETTING_SELECTS.map((f) => {
            const current = fields[f.key] ?? "";
            const known = f.options.some(([v]) => v === current);
            return (
              <div key={f.key}>
                <label className="block text-xs mb-1">{f.label}</label>
                <select className={inputCls} value={current} onChange={(e) => setField(f.key, e.target.value)}>
                  <option value="">{f.empty}</option>
                  {/* 保留配置里已有但不在预设列表中的值，避免保存时被悄悄改掉 */}
                  {current !== "" && !known && <option value={current}>{current}（当前值）</option>}
                  {f.options.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          {SETTING_NUMBERS.map((f) => (
            <div key={f.key}>
              <label className="block text-xs mb-1">{f.label}</label>
              <input
                type="number"
                min={f.min}
                max={f.max}
                className={inputCls}
                value={fields[f.key] ?? ""}
                placeholder="未设置"
                onChange={(e) => setField(f.key, e.target.value)}
              />
              {f.hint && <p className="text-[11px] opacity-50 mt-1">{f.hint}</p>}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          {SETTING_BOOLS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(fields[f.key])}
                onChange={(e) => setField(f.key, e.target.checked)}
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      <div className={card}>
        <h2 className="font-semibold mb-3">背景设置</h2>
        <div className="space-y-3">
          <div className="relative h-44 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-900">
            {bg.image ? (
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${bg.image}')` }} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs opacity-50">未设置背景图片，无法预览</div>
            )}
            <div className="absolute inset-0" style={{ background: `rgba(17,24,39,${bgPreviewTint})` }} />
            <div className="absolute inset-0" style={{ backdropFilter: bgPreviewFilter, WebkitBackdropFilter: bgPreviewFilter }} />
            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/40 text-[11px] text-white">实时预览（拖动滑杆即时变化）</span>
          </div>
          <div>
            <label className="block text-xs mb-1">背景图片地址</label>
            <input
              className={inputCls}
              value={bg.image ?? ""}
              placeholder="/images/bg.png 或 https://example.com/bg.jpg"
              onChange={(e) => setBgField("image", e.target.value)}
            />
            <p className="text-[11px] opacity-50 mt-1">支持本地路径或网络 URL；留空则不使用背景图。</p>
          </div>
          <div>
            <label className="block text-xs mb-1">模糊程度 blur（px）</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                className="flex-1"
                min={0}
                max={64}
                step={1}
                value={bg.blur === "" ? 0 : bg.blur}
                onChange={(e) => setBgField("blur", e.target.value)}
              />
              <input
                type="number"
                className="w-24 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                min={0}
                max={64}
                value={bg.blur}
                placeholder="未设置"
                onChange={(e) => setBgField("blur", e.target.value)}
              />
              <button
                type="button"
                className="text-xs opacity-60 hover:opacity-100 shrink-0"
                onClick={() => setBgField("blur", "")}
              >
                清除
              </button>
            </div>
            <p className="text-[11px] opacity-50 mt-1">0 = 不模糊（留空表示不设置）。</p>
          </div>
          {BG_NUMBERS.map((f) => {
            const value = bg[f.key] ?? "";
            return (
              <div key={f.key}>
                <label className="block text-xs mb-1">{f.label}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    className="flex-1"
                    min={f.min}
                    max={f.max}
                    value={value === "" ? f.fallback : value}
                    onChange={(e) => setBgField(f.key, e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-24 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    min={f.min}
                    max={f.max}
                    value={value}
                    placeholder="未设置"
                    onChange={(e) => setBgField(f.key, e.target.value)}
                  />
                  <button
                    type="button"
                    className="text-xs opacity-60 hover:opacity-100 shrink-0"
                    onClick={() => setBgField(f.key, "")}
                  >
                    清除
                  </button>
                </div>
                <p className="text-[11px] opacity-50 mt-1">{f.hint}（留空表示不设置该效果）</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">分组布局 layout</h2>
          <button
            type="button"
            className="text-sm text-theme-600 dark:text-theme-400 hover:underline flex items-center gap-1"
            onClick={() =>
              setLayoutRows((prev) => [
                ...prev,
                { name: "", icon: "", style: "", columns: "", header: "", iconsOnly: false, initiallyCollapsed: false, extra: {} },
              ])
            }
          >
            <BiPlus /> 添加分组
          </button>
        </div>
        <p className="text-[11px] opacity-50 mb-3">
          分组名要和「服务 / 分组」「书签 / 链接」里的名称一致；此处的<b>先后顺序</b>决定首页的分组显示顺序。
        </p>
        <div className="space-y-3">
          {layoutRows.length === 0 && <p className="text-sm opacity-60">还没有配置任何分组布局。</p>}
          {layoutRows.map((row, idx) => (
            // 分组可以重名/为空，用下标作为 key 是这里唯一稳定的选择
            // eslint-disable-next-line react/no-array-index-key
            <div key={idx} className="p-3 rounded border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-1">分组名称</label>
                  <input
                    className={inputCls}
                    value={row.name}
                    placeholder="服务器监控"
                    onChange={(e) => updateRow(idx, { name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">图标 URL / 名称</label>
                  <input
                    className={inputCls}
                    value={row.icon}
                    placeholder="https://example.com/icon.png"
                    onChange={(e) => updateRow(idx, { icon: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">排列方式 style</label>
                  <select className={inputCls} value={row.style} onChange={(e) => updateRow(idx, { style: e.target.value })}>
                    <option value="">默认</option>
                    <option value="row">row 横排</option>
                    <option value="column">column 竖排</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1">列数 columns（style 为 row 时生效）</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    className={inputCls}
                    value={row.columns}
                    placeholder="未设置"
                    onChange={(e) => updateRow(idx, { columns: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">分组标题 header</label>
                  <select className={inputCls} value={row.header} onChange={(e) => updateRow(idx, { header: e.target.value })}>
                    <option value="">默认（显示）</option>
                    <option value="true">显示</option>
                    <option value="false">隐藏</option>
                  </select>
                </div>
                <div className="flex items-end gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.iconsOnly}
                      onChange={(e) => updateRow(idx, { iconsOnly: e.target.checked })}
                    />
                    仅图标
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.initiallyCollapsed}
                      onChange={(e) => updateRow(idx, { initiallyCollapsed: e.target.checked })}
                    />
                    默认折叠
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <button type="button" className="opacity-60 hover:opacity-100" onClick={() => moveRow(idx, -1)}>
                  ↑ 上移
                </button>
                <button type="button" className="opacity-60 hover:opacity-100" onClick={() => moveRow(idx, 1)}>
                  ↓ 下移
                </button>
                <button
                  type="button"
                  className="text-red-500 hover:underline flex items-center gap-1 ml-auto"
                  onClick={() => setLayoutRows((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <BiTrash /> 移除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={card}>
        <h2 className="font-semibold mb-3">服务商 API Key（providers）</h2>
        <textarea
          className={`${inputCls} font-mono text-xs`}
          rows={4}
          value={providersText}
          placeholder={"openweathermap: your-api-key\nweatherapi: your-api-key"}
          onChange={(e) => setProvidersText(e.target.value)}
        />
        <p className="text-[11px] opacity-50 mt-1">
          原始 YAML。这些密钥只在服务端使用，不会下发到首页。
        </p>
      </div>

      <details className={card}>
        <summary className="font-semibold cursor-pointer">其他高级设置（原始 YAML）</summary>
        <textarea
          className={`${inputCls} font-mono text-xs mt-3`}
          rows={8}
          value={advancedText}
          placeholder={"quicklaunch:\n  searchDescriptions: true\n  hideInternetSearch: true"}
          onChange={(e) => setAdvancedText(e.target.value)}
        />
        <p className="text-[11px] opacity-50 mt-1">
          上面表单没有覆盖到的 settings.yaml 字段都会出现在这里，保存时原样写回，不会丢失。
        </p>
      </details>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 px-3 py-2 text-sm">
          <BiErrorCircle className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-3 py-2 text-sm">
          <BiCheckCircle className="shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded bg-theme-500 text-white hover:bg-theme-600 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存设置"}
        </button>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600"
        >
          放弃修改并重新加载
        </button>
      </div>

      <p className="text-xs opacity-50">
        改动会写回 config/settings.yaml，并自动保留一份 settings.yaml.bak。
        <b>注意：保存后原文件里的 YAML 注释会丢失</b>（配置本身不受影响）。
      </p>
    </form>
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
          <div className="flex items-center gap-4">
            <ConfirmButton
              label={
                <span className="flex items-center gap-1">
                  <BiLogOut /> 退出登录
                </span>
              }
              hint="确定退出登录？"
              confirmText="退出"
              onConfirm={() => signOut({ callbackUrl: "/auth/signin" })}
              className="flex items-center gap-1 text-theme-600 dark:text-theme-400 hover:underline"
            />
            <Link href="/" className="flex items-center gap-1 text-theme-600 dark:text-theme-400 hover:underline">
              <BiArrowBack /> 返回首页
            </Link>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setTab("bookmarks")}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${
              tab === "bookmarks"
                ? "bg-theme-500 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <BiBook /> 书签 / 链接
          </button>
          <button
            onClick={() => setTab("services")}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${
              tab === "services"
                ? "bg-theme-500 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <BiServer /> 服务 / 分组
          </button>
          <button
            onClick={() => setTab("site")}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${
              tab === "site"
                ? "bg-theme-500 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <BiGlobe /> 站点信息
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${
              tab === "settings"
                ? "bg-theme-500 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <BiSlider /> 全局设置
          </button>
        </div>

        {tab === "bookmarks" && <BookmarksPanel />}
        {tab === "services" && <ServicesPanel />}
        {tab === "site" && <SitePanel />}
        {tab === "settings" && <SettingsPanel />}

        <div
          id="admin-footer"
          className="mt-12 pt-5 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs opacity-60"
        >
          <span className="min-w-0 truncate">后台管理 · 使用 gethomepage/homepage 二开</span>
          <div className="flex items-center gap-4">
            <Version />
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub"
              className="flex items-center gap-1 shrink-0 hover:opacity-100"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16v3.2c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
