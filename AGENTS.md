# AGENTS.md - 智能体协作与开发指南

> 本文档专为接手此项目的 AI 智能体（如 Cursor, Claude Code, Antigravity, Devin, GitHub Copilot 等）设计，旨在帮助新智能体快速理解项目架构、技术栈、核心定制逻辑与开发规范，避免重复排查踩坑。

---

## 1. 项目定位与背景

- **上游原项目**：[gethomepage/homepage](https://github.com/gethomepage/homepage)（官方 `dev` 分支）。
- **当前 Fork 仓库**：`fu5502/my-homepage`。
- **核心二开诉求**：
  原版 Homepage 所有服务（`services.yaml`）和书签（`bookmarks.yaml`）都需要直接在服务器上手动编辑 YAML 文件。本项目在此基础上新增了**内置可视化后台管理（`/admin`）**，允许用户直接在网页端：
  - 增删改查书签（Bookmarks）与分类（Groups）；
  - 增删改查服务（Services）与分组（Service Groups），包括图标、跳转链接、Docker 容器绑定、健康检查、监控组件（`widget`）与列表选项（`options`）；
  - **原地排序保护**：编辑已有书签或服务时保留当前排序位置，不被追加到列表末尾；
  - **可视化拖拽排序**：支持通过拖拽手柄直观调整书签和服务在组内的显示顺序；
  - **原子写与自动备份**：写入配置文件前自动生成 `.bak` 备份文件，并通过 `.tmp` 文件原子重命名，确保配置永不因崩溃损坏；
  - **原生权限复用**：直接接入 Homepage 内置的 `HOMEPAGE_AUTH_*` 登录鉴权，无需额外账号系统。
- **发布与部署模式**：
  GitHub Actions 会在推送至 `main` 分支时自动构建多架构 Docker 镜像（`linux/amd64`, `linux/arm64`）并推送到 GitHub Container Registry：`ghcr.io/fu5502/my-homepage:latest`，主要面向飞牛 NAS（FnOS）、群晖 DSM 或 Linux 服务器。

---

## 2. 核心架构与二开代码地图

本项目所有自定义二开功能均保持了对官方目录结构的最小侵入：

```
homepage/
├── src/
│   ├── utils/config/
│   │   ├── admin.js                 # 核心配置读写工具库（重点）
│   │   └── admin.test.js            # admin 工具函数的单元测试
│   ├── pages/
│   │   ├── admin.jsx                # 可视化管理面板页面（/admin）
│   │   ├── index.jsx                # 首页仪表盘（右下角植入齿轮入口）
│   │   └── api/
│   │       └── admin/               # 后台 CRUD API 接口集合
│   │           ├── bookmarks.js     # 书签 CRUD & PATCH 排序
│   │           ├── groups.js        # 书签分类 CRUD
│   │           ├── services.js      # 服务 CRUD & PATCH 排序
│   │           └── service-groups.js# 服务分组 CRUD
│   └── __tests__/
│       ├── pages/api/admin/bookmarks.test.js # 书签 API 测试
│       └── pages/index.test.jsx     # 首页渲染与滤镜测试
├── .github/workflows/
│   ├── fork-docker-publish.yml      # GHCR 镜像构建工作流
│   ├── lint.yml                     # 代码风格检查（Prettier + ESLint）
│   └── test.yml                     # Vitest 单元测试工作流
├── docker-compose.yml               # 飞牛 NAS / 生产部署配置文件
├── .env.example                     # 敏感环境变量模版
├── .npmrc                           # 配置 shamefully-hoist=true 确保依赖解析
└── AGENTS.md                        # 本指南
```

### 核心模块技术细节

#### (1) `src/utils/config/admin.js`

- **读写逻辑**：通过 `js-yaml` 解析并写回 `config/bookmarks.yaml` 和 `config/services.yaml`。
- **备份与原子写**：
  - 写入前调用 `fs.copyFile` 生成 `.bak`。
  - 使用 `fs.writeFile` 写入 `.tmp` 临时文件，确认成功后再 `fs.rename` 替换原文件，防止并发或断电写坏配置。
- **顺序保持（In-place Update）**：
  在 `updateBookmark` 和 `updateService` 中，如果目标分组与原分组一致（`oldGroup === group`），使用 `findIndex` 找到原项目下标并就地替换，保留列表顺序；仅在跨分组移动时才从旧组移除并追加到新组末尾。
- **拖拽排序（Reorder）**：
  `reorderBookmarks({ group, order })` 与 `reorderServices({ group, order })` 接收客户端传递的该组全量名称数组，按新的索引映射重建数组。

#### (2) `src/pages/api/admin/*.js`

- 规范的 RESTful API：
  - `GET`：获取全量列表。
  - `POST`：新增条目。
  - `PUT`：修改条目。
  - `DELETE`：删除条目。
  - `PATCH`：重新排序（接收 `{ group, order: string[] }`）。

#### (3) `src/pages/admin.jsx`

- 包含「书签 / 链接」与「服务 / 分组」两个顶级标签页。
- 对复杂的 `widget`（如 customapi、openwrt 等）和 `options` 字段，采用**原始 YAML 文本框**进行编辑和反序列化，避免表单映射丢失上游未知的自定义字段。
- 支持 HTML5 原生拖拽事件（`onDragStart`, `onDragOver`, `onDrop`），拖拽松开后自动调用 `PATCH` 接口持久化顺序。

---

## 3. 开发环境与命令速查

本项目基于 **Next.js 16** 与 **React 19**，使用 **pnpm** 管理依赖。

> ⚠️ **强制规范**：**切勿使用 npm 或 yarn**，必须使用 `pnpm`。由于 Next.js 16 与 React 19 的包解析机制，根目录必须保留 `.npmrc`（内容为 `shamefully-hoist=true`）。

### 常用命令

| 操作               | 命令                              | 说明                                                  |
| :----------------- | :-------------------------------- | :---------------------------------------------------- |
| **安装依赖**       | `pnpm install`                    | 请确保 `.npmrc` 生效                                  |
| **启动开发服务器** | `pnpm dev`                        | 运行于 `http://localhost:3000`                        |
| **执行单元测试**   | `pnpm test`                       | 执行全量 Vitest 测试                                  |
| **单测指定文件**   | `pnpm vitest run <测试文件路径>`  | 例如 `pnpm vitest run src/utils/config/admin.test.js` |
| **项目生产构建**   | `pnpm build`                      | 检查 Next.js 编译与 standalone 模式                   |
| **代码格式化**     | `npx prettier --write <文件路径>` | **修改代码后必跑**                                    |
| **代码规范检查**   | `pnpm run lint`                   | ESLint 检查                                           |

---

## 4. 关键避坑与代码规范（极其重要）

新智能体在提交代码前，**必须严格遵守以下规范**，否则 GitHub Actions CI 将会挂掉：

### 1. Prettier 与 Pre-commit 检查（CI 硬性约束）

GitHub Actions 的 `Lint` 工作流会运行 `pre-commit`，严格校验 `prettier@3.3.3` 和 `prettier-plugin-organize-imports@4.1.0`：

- **每次编辑任何 `.js`、`.jsx`、`.md`、`.yaml` 文件后，必须在终端执行**：
  ```bash
  npx prettier --write "修改的文件路径"
  ```
- 也可以直接使用 `npx prettier --check "修改的文件路径"` 预先验证是否合规。

### 2. 测试流水线与 Codecov 注意事项

- `.github/workflows/test.yml` 中的 Codecov 上传步骤已设置 `fail_ci_if_error: false`，因为在个人 fork 仓库中未配置 `CODECOV_TOKEN`，无需强求 codecov 上传成功，但 **Vitest 测试本身必须 100% 通过**。
- `src/__tests__/pages/index.test.jsx` 中断言背景滤镜时，应检查元素的 `style.backdropFilter` 属性而非 CSS 类名（由于 Tailwind v4 运行时动态类限制，背景滤镜是通过行内样式生效的）。

### 3. Git 分支与推送

- 当前二开开发分支为 `main`。
- 推送至 `main` 分支后会触发 `Fork Docker Build & Push (GHCR)`，自动构建 `ghcr.io/fu5502/my-homepage:latest`。

---

## 5. 常见拓展需求指引（智能体接手参考）

如果用户提出新的功能需求，请参考以下实现模式：

1. **若需要增加其他 YAML 配置的可视化管理（如 `widgets.yaml`, `docker.yaml`, `settings.yaml`）**：
   - 参考 `src/utils/config/admin.js`，添加对应配置的解析、校验、备份及原子写入函数。
   - 在 `src/pages/api/admin/` 下新增对应的 REST 接口文件。
   - 在 `src/pages/admin.jsx` 中新增对应的新 Tab 面板。
2. **若需要实现容器自动更新**：
   - 优先推荐在 `docker-compose.yml` 中引入 `containrrr/watchtower`，利用 `watchtower.enable=true` 标签实现优雅热更新。
3. **若需与上游最新版本同步（Rebase Upstream）**：
   - 上游仓库为 `https://github.com/gethomepage/homepage.git`，分支为 `dev`。
   - 关注 `src/pages/index.jsx` 与依赖升级（如 Next.js/Tailwind 的版本变动）。
