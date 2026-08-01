# my-homepage

> 基于 [gethomepage/homepage](https://github.com/gethomepage/homepage) 的二开版本，新增**内置后台管理**，让你无需手动编辑 YAML 就能可视化地添加、编辑、删除「站点链接」和「分类」。

[English version](./README_EN.md)

---

## ✨ 功能特性

- **可视化后台 `/admin`**：在网页上直接管理站点链接（bookmarks）和分类（groups），支持新增、编辑、删除、跨分类移动。
- **实时写回原生配置**：后台操作会直接写回 `config/bookmarks.yaml`（修改前自动备份为 `.bak`），与 homepage 原生格式完全兼容；返回首页 SWR 自动刷新即可看到变化。
- **复用现有登录鉴权**：后台页面与 `api/admin/*` 接口自动受 homepage 的 `HOMEPAGE_AUTH_ENABLED`（密码 / OIDC）保护，无需另搞一套账号体系。
- **Docker / NAS 友好**：官方 `Dockerfile`（Next.js standalone 输出）+ 一键 `docker-compose.yml`，配置目录通过挂载卷持久化，适合飞牛 NAS（FnOS）等环境。
- **GHCR 自动构建**：推送代码后 GitHub Actions 自动构建多架构镜像并推送到 `ghcr.io/fu5502/my-homepage`，重装/多设备一键拉取。

---

## 🚀 快速开始（推荐 Docker / 飞牛 NAS）

本镜像已在 `ghcr.io/fu5502/my-homepage:latest` 自动构建。在飞牛 NAS（或任意装有 Docker 的机器）上：

```bash
# 1. 拉取镜像（公开仓库，无需登录）
docker pull ghcr.io/fu5502/my-homepage:latest

# 2. 准备好配置目录并放入 settings.yaml（见下方「开启登录」）
mkdir -p ./config

# 3. 用仓库里的 docker-compose.yml 启动
#    把本仓库的 docker-compose.yml 放到包含 ./config 的目录，进入该目录执行：
docker compose up -d
```

启动后访问 `http://<设备IP>:3000`。

> 如果你已经 `git clone` 了本仓库，直接 `docker compose up -d` 即可（compose 已配好挂载与 `HOMEPAGE_AUTH_ENABLED=true`）。

### 开启登录（强烈建议）

后台管理 `/admin` 默认被 `HOMEPAGE_AUTH_ENABLED` 保护，需要先在 `config/settings.yaml` 配置账号，否则任何人都能访问后台。

`config/settings.yaml` 示例：

```yaml
---
auth:
  users:
    - username: admin
      password: "你的密码"
```

更多鉴权方式（OIDC、Header 等）参见 [homepage 官方文档](https://gethomepage.dev/configs/settings/#auth)。

登录后，首页右下角会出现一个⚙️齿轮图标，点击进入 `/admin` 即可管理。

---

## 🖱️ 使用后台管理

1. 访问 `http://<设备IP>:3000/admin`（需先登录）。
2. **管理分类**：在「分类」区域新增 / 删除分组。
3. **管理站点链接**：在「链接」区域填写名称、URL、图标、描述、所属分类；支持编辑、删除、跨分类移动。
4. 每次保存都会实时写回 `config/bookmarks.yaml`，返回首页即可看到更新。

---

## 📁 新增 / 改动的文件（相对上游）

```
src/utils/config/admin.js          # 读取/写回 config/bookmarks.yaml（备份 + 原子写）
src/pages/api/admin/bookmarks.js   # 书签 CRUD 接口（GET/POST/PUT/DELETE）
src/pages/api/admin/groups.js      # 分类 CRUD 接口（GET/POST/DELETE）
src/pages/admin.jsx                # 后台管理页面
src/pages/index.jsx                # 首页新增「后台管理」入口（齿轮图标）
.github/workflows/fork-docker-publish.yml  # GHCR 多架构自动构建
docker-compose.yml                 # 飞牛 NAS / 通用部署
.npmrc                             # shamefully-hoist=true（Next 16 + pnpm 兼容性修复）
```

---

## 🛠️ 本地开发

```bash
pnpm install      # 仓库已含 .npmrc: shamefully-hoist=true，可直接构建
pnpm dev          # 开发模式，访问 http://localhost:3000
```

> 注意：本项目运行在 Next.js 16 + pnpm 环境下，若 `pnpm install` 报 `@swc/helpers` 找不到，
> 请确保 `.npmrc` 中的 `shamefully-hoist=true` 生效，或手动加 `--shamefully-hoist` 参数安装。

---

## 🐳 从源码构建镜像

如果你想自己构建镜像（而非使用 GHCR 预构建）：

```bash
docker build -t my-homepage:local .
docker run -d -p 3000:3000 -v $(pwd)/config:/config \
  -e HOMEPAGE_AUTH_ENABLED=true my-homepage:local
```

---

## 📝 配置格式

后台写入的数据与 homepage 原生 `bookmarks.yaml` 一致，例如：

```yaml
---
- Developer:
    - GitHub:
        href: https://github.com
        description: Code hosting
        icon: github.png
- News:
    - Hacker News:
        href: https://news.ycombinator.com
        icon: hn.png
```

详见 [homepage bookmarks 文档](https://gethomepage.dev/configs/bookmarks/)。

---

## 🔄 与上游同步

本仓库基于 `gethomepage/homepage` 的 `dev` 分支二开。如需合并上游更新，建议用 `git rebase` 将上游新提交合入本 fork，并重点检查 `src/pages/index.jsx` 与配置加载相关文件是否有冲突。

---

## 🙏 致谢

- 原项目：[gethomepage/homepage](https://github.com/gethomepage/homepage) —— 优秀的自托管仪表盘。
- 本二开仅在其基础上增加后台管理能力，核心仪表盘功能与版权归原项目所有。
