# my-homepage

> 基于 [gethomepage/homepage](https://github.com/gethomepage/homepage) 的二开版本，新增**内置后台管理**，让你无需手动编辑 YAML 就能可视化地添加、编辑、删除「站点链接」和「分类」。

[English version](./README_EN.md)

---

## ✨ 功能特性

- **可视化后台 `/admin`**：在网页上直接管理站点链接（bookmarks）和分类（groups），以及**服务（services）和分组**（对应 `services.yaml`，含图标、跳转、健康检查、Docker 主机/容器、`widget` 监控组件与 `options` 列表），支持新增、编辑、删除、跨分组移动。
- **实时写回原生配置**：后台操作会直接写回 `config/bookmarks.yaml` 或 `config/services.yaml`（修改前自动备份为 `.bak`），与 homepage 原生格式完全兼容；返回首页 SWR 自动刷新即可看到变化。`widget` / `options` 这类复杂结构在后台用原始 YAML 文本框编辑，零丢失。
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

后台管理 `/admin` 与 `api/admin/*` 默认被 `HOMEPAGE_AUTH_ENABLED` 保护。**注意：本版本 homepage 的密码登录走环境变量，而不是 `settings.yaml` 的 `auth.users`**，必须同时具备以下 4 个环境变量，next-auth 才会注册「密码」登录方式：

| 变量                         | 作用                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| `HOMEPAGE_AUTH_ENABLED=true` | 开启鉴权                                                       |
| `HOMEPAGE_AUTH_PASSWORD`     | 登录密码（单一全局密码，登录页只填密码、无需用户名）           |
| `HOMEPAGE_AUTH_SECRET`       | 会话密钥（随机串，改了会让已登录会话失效）                     |
| `HOMEPAGE_EXTERNAL_URL`      | 外部访问地址，next-auth 必填，例如 `http://192.168.1.100:3000` |

这些变量由仓库根目录的 `.env` 提供（**已被 .gitignore 排除，不会提交到 Git**）。首次部署：

```bash
cp .env.example .env   # 然后编辑 .env，填入自己的密码与访问地址
docker compose up -d
```

`HOMEPAGE_AUTH_SECRET` 可用 `openssl rand -base64 32` 生成。若用 `docker run`，请自行把这些变量补成 `-e` 参数。

> ⚠️ 切勿把真实密码写进 `docker-compose.yml`、README 或任何会提交到 Git 的文件。

OIDC / Header 等其他鉴权方式见 [homepage 官方文档](https://gethomepage.dev/configs/settings/#auth)。

登录后，首页右下角会出现一个⚙️齿轮图标，点击进入 `/admin` 即可管理。

---

## 🖱️ 使用后台管理

后台 `/admin` 顶部有两个标签：

- **书签 / 链接**：管理 `bookmarks.yaml` 的分类与站点链接（名称、URL、缩写、图标、描述）。
- **服务 / 分组**：管理 `services.yaml` 的分组与服务。

**管理服务步骤：**

1. 访问 `http://<设备IP>:3000/admin`（需先登录），切到「服务 / 分组」标签。
2. 先新增一个分组（如「服务器监控」），或直接往已有分组里加服务。
3. 填写服务公共字段：名称、跳转 URL、图标、描述、Docker 主机、容器名、健康检查地址、是否展开统计。
4. `widget`（监控组件）与 `options`（列表）用**原始 YAML 文本框**填写（第一行通常是 `type: xxx`），粘贴你现有的配置即可，支持所有 widget 类型（含 customapi 的 `mappings`、openwrt 的 `options` 等）。
5. 每次保存都会实时写回 `config/services.yaml`，返回首页即可看到更新。

---

## 📁 新增 / 改动的文件（相对上游）

```
src/utils/config/admin.js          # 读取/写回 config/bookmarks.yaml 与 services.yaml（备份 + 原子写）
src/pages/api/admin/bookmarks.js   # 书签 CRUD 接口（GET/POST/PUT/DELETE）
src/pages/api/admin/groups.js      # 分类 CRUD 接口（GET/POST/DELETE）
src/pages/api/admin/services.js    # 服务 CRUD 接口（GET/POST/PUT/DELETE）
src/pages/api/admin/service-groups.js  # 服务分组 CRUD 接口（GET/POST/DELETE）
src/pages/admin.jsx                # 后台管理页面（书签 / 服务 双标签）
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
  -e HOMEPAGE_AUTH_ENABLED=true \
  -e HOMEPAGE_AUTH_PASSWORD=你的密码 \
  -e HOMEPAGE_AUTH_SECRET=$(openssl rand -hex 32) \
  -e HOMEPAGE_EXTERNAL_URL=http://你的IP:3000 \
  my-homepage:local
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
