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

## 🐳 Docker Compose 部署（推荐）

预构建多架构镜像（`linux/amd64` 与 `linux/arm64`）已托管在 GitHub Container Registry（GHCR），可在飞牛 NAS（FnOS）、Synology 群晖、Linux 服务器等环境中一键部署。

### 方式一：克隆仓库快速部署

如果你已克隆本仓库到本地/NAS：

```bash
git clone https://github.com/fu5502/my-homepage.git
cd my-homepage

# 1. 复制环境变量配置文件
cp .env.example .env

# 2. 编辑 .env，填入你的密码与访问地址（必填）
nano .env

# 3. 启动容器
docker compose up -d
```

---

### 方式二：独立目录轻量部署（无需克隆仓库）

如果不需要拉取完整源码，只需在一个空目录（如 `/vol1/1000/docker/homepage`）下创建以下两个文件即可：

#### 1. 创建 `docker-compose.yml`

```yaml
services:
  homepage:
    image: ghcr.io/fu5502/my-homepage:latest
    container_name: homepage
    restart: unless-stopped
    ports:
      - "${HOMEPAGE_PORT:-3000}:3000"
    volumes:
      - ./config:/config
    environment:
      # ===== 登录鉴权（密码方式）=====
      - HOMEPAGE_AUTH_ENABLED=${HOMEPAGE_AUTH_ENABLED:-true}
      - HOMEPAGE_AUTH_PASSWORD=${HOMEPAGE_AUTH_PASSWORD:?请先在 .env 中设置 HOMEPAGE_AUTH_PASSWORD}
      - HOMEPAGE_AUTH_SECRET=${HOMEPAGE_AUTH_SECRET:?请先在 .env 中设置 HOMEPAGE_AUTH_SECRET}
      - HOMEPAGE_EXTERNAL_URL=${HOMEPAGE_EXTERNAL_URL:?请先在 .env 中设置 HOMEPAGE_EXTERNAL_URL}
      # ===== 运行权限与网络 =====
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - HOSTNAME=0.0.0.0
      - HOMEPAGE_ALLOWED_HOSTS=${HOMEPAGE_ALLOWED_HOSTS:-localhost:3000}
```

#### 2. 创建 `.env` 环境变量配置文件

```bash
# 开启登录鉴权
HOMEPAGE_AUTH_ENABLED=true

# 登录密码（单一全局密码，登录页只填密码、无需用户名）
HOMEPAGE_AUTH_PASSWORD=change-me-please

# 会话密钥（随机字符串，可通过命令生成：openssl rand -base64 32）
HOMEPAGE_AUTH_SECRET=change-me-random-string

# 外部访问完整地址（必填，请替换为你的 NAS IP 或域名，带端口）
HOMEPAGE_EXTERNAL_URL=http://192.168.1.100:3000

# Host 校验白名单（逗号分隔，必须包含上面填写的访问地址与端口）
HOMEPAGE_ALLOWED_HOSTS=192.168.1.100:3000,localhost:3000

# 宿主机映射端口（可按需修改，如 3000 或 8080）
HOMEPAGE_PORT=3000

# 容器内运行用户 ID 与组 ID（飞牛 NAS 默认首个用户通常为 1000）
PUID=1000
PGID=1000
```

#### 3. 启动并访问

```bash
# 创建配置持久化目录
mkdir -p ./config

# 拉取镜像并启动
docker compose pull
docker compose up -d
```

启动后在浏览器访问 `http://<设备IP>:3000` 即可使用。登录后首页右下角会出现 ⚙️ 齿轮图标，点击即可进入 `/admin` 可视化后台管理。

---

### 🔄 镜像更新与升级

当代码仓库更新后，GHCR 会自动构建最新镜像。在 `docker-compose.yml` 所在目录执行以下命令即可一键平滑升级：

```bash
docker compose pull
docker compose up -d
```

---

### ⚠️ 环境变量说明与注意事项

| 变量                         | 说明                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| `HOMEPAGE_AUTH_ENABLED=true` | 开启登录鉴权（保护 `/admin` 后台与接口）                                                    |
| `HOMEPAGE_AUTH_PASSWORD`     | 登录密码（单一全局密码，登录页仅需输入密码，无需用户名）                                    |
| `HOMEPAGE_AUTH_SECRET`       | 会话密钥（随机串，可用 `openssl rand -base64 32` 生成）                                     |
| `HOMEPAGE_EXTERNAL_URL`      | 外部访问完整 URL（NextAuth 必填，例如 `http://192.168.1.100:3000`）                         |
| `HOMEPAGE_ALLOWED_HOSTS`     | Host 校验白名单（逗号分隔，如 `192.168.1.100:3000,localhost:3000`，不匹配会提示 Host 错误） |
| `PUID` / `PGID`              | 容器内文件所有者 ID（默认 `1000`），确保挂载的 `./config` 目录文件与 NAS 本地用户权限匹配   |

> ⚠️ 注意：密码等敏感信息请妥善保存在 `.env` 中，切勿将密码硬编码提交至公开 Git 仓库。其他鉴权方式（如 OIDC / Header）参见 [homepage 官方文档](https://gethomepage.dev/configs/settings/#auth)。

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

> 🤖 **智能体协作指南**：如果你或你的 AI 智能体（如 Cursor, Claude Code, Devin, Copilot 等）需要继续对此项目进行二开，请参考 [AGENTS.md](./AGENTS.md)，内含详细代码地图、CI 规范与开发避坑提示。

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
