# my-homepage

> A fork of [gethomepage/homepage](https://github.com/gethomepage/homepage) with a **built-in admin backend**, so you can visually add, edit, and delete site links (bookmarks) and categories (groups) without hand-editing YAML.

[中文文档](./README.md)

---

## ✨ Features

- **Visual admin at `/admin`**: Manage site links (bookmarks) and categories (groups) directly in the browser — create, edit, delete, and move items between categories.
- **Writes back to native config**: Admin actions write directly to `config/bookmarks.yaml` (a `.bak` backup is made before each change) and stay fully compatible with homepage's native format. Return to the dashboard and SWR auto-refreshes to show the changes.
- **Reuses existing auth**: The `/admin` page and `api/admin/*` endpoints are automatically protected by homepage's `HOMEPAGE_AUTH_ENABLED` (password / OIDC) — no separate account system needed.
- **Docker / NAS friendly**: Official `Dockerfile` (Next.js standalone output) plus a ready-to-use `docker-compose.yml`. The config directory is persisted via a mounted volume, ideal for environments like FnOS (a NAS OS).
- **GHCR auto-build**: On every push, GitHub Actions builds a multi-arch image and pushes it to `ghcr.io/fu5502/my-homepage` for one-click pull on reinstall / multiple devices.

---

## 🐳 Docker Compose Deployment (Recommended)

Prebuilt multi-arch images (`linux/amd64` and `linux/arm64`) are hosted on GitHub Container Registry (GHCR), ready for one-click deployment on FnOS NAS, Synology DSM, Linux servers, etc.

### Option 1: Quick Start via Git Clone

If you have cloned this repository to your local machine or NAS:

```bash
git clone https://github.com/fu5502/my-homepage.git
cd my-homepage

# 1. Copy the environment configuration template
cp .env.example .env

# 2. Edit .env with your own password and access URL
nano .env

# 3. Start the container
docker compose up -d
```

---

### Option 2: Lightweight Deployment in a Standalone Directory

If you do not need the full source code, simply create a directory (e.g. `/opt/homepage` or `/vol1/1000/docker/homepage`) and add the following two files:

#### 1. Create `docker-compose.yml`

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
      # ===== Authentication (Password method) =====
      - HOMEPAGE_AUTH_ENABLED=${HOMEPAGE_AUTH_ENABLED:-true}
      - HOMEPAGE_AUTH_PASSWORD=${HOMEPAGE_AUTH_PASSWORD:?Please set HOMEPAGE_AUTH_PASSWORD in .env}
      - HOMEPAGE_AUTH_SECRET=${HOMEPAGE_AUTH_SECRET:?Please set HOMEPAGE_AUTH_SECRET in .env}
      - HOMEPAGE_EXTERNAL_URL=${HOMEPAGE_EXTERNAL_URL:?Please set HOMEPAGE_EXTERNAL_URL in .env}
      # ===== Permissions and Networking =====
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - HOSTNAME=0.0.0.0
      - HOMEPAGE_ALLOWED_HOSTS=${HOMEPAGE_ALLOWED_HOSTS:-localhost:3000}
```

#### 2. Create `.env`

```bash
# Enable login authentication
HOMEPAGE_AUTH_ENABLED=true

# Login password (single global password; the login page only requires password, no username)
HOMEPAGE_AUTH_PASSWORD=change-me-please

# Session secret (random string; generate via: openssl rand -base64 32)
HOMEPAGE_AUTH_SECRET=change-me-random-string

# Public base URL (required by next-auth, replace with your NAS IP or domain)
HOMEPAGE_EXTERNAL_URL=http://192.168.1.100:3000

# Host validation whitelist (comma-separated; must include your access URL with port)
HOMEPAGE_ALLOWED_HOSTS=192.168.1.100:3000,localhost:3000

# Host port mapping (default: 3000)
HOMEPAGE_PORT=3000

# Container runtime UID and GID (defaults to 1000 for standard NAS users)
PUID=1000
PGID=1000
```

#### 3. Start and Access

```bash
# Create persistent config directory
mkdir -p ./config

# Pull image and start
docker compose pull
docker compose up -d
```

Visit `http://<device-IP>:3000` in your browser. After logging in, click the ⚙️ gear icon in the bottom-right corner to open the `/admin` visual dashboard.

---

### 🔄 Image Updates and Upgrades

Whenever this repository is updated, GHCR automatically builds the latest image. In the directory containing your `docker-compose.yml`, run:

```bash
docker compose pull
docker compose up -d
```

---

### ⚠️ Environment Variables Reference

| Variable                     | Purpose                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `HOMEPAGE_AUTH_ENABLED=true` | Enables authentication (protects `/admin` UI and API)                                               |
| `HOMEPAGE_AUTH_PASSWORD`     | Login password (single global password)                                                             |
| `HOMEPAGE_AUTH_SECRET`       | Session secret (random string; generate with `openssl rand -base64 32`)                             |
| `HOMEPAGE_EXTERNAL_URL`      | Public access URL required by NextAuth (e.g. `http://192.168.1.100:3000`)                           |
| `HOMEPAGE_ALLOWED_HOSTS`     | Host header whitelist (comma-separated; e.g. `192.168.1.100:3000,localhost:3000`)                   |
| `PUID` / `PGID`              | File owner UID/GID (default `1000`) to ensure permissions match between mounted `./config` and host |

> ⚠️ Note: Keep your password and secrets safe in `.env` and never commit real credentials to a public Git repository. For other auth methods (OIDC, header auth), see the [homepage documentation](https://gethomepage.dev/configs/settings/#auth).

---

## 🖱️ Using the Admin Backend

1. Go to `http://<device-IP>:3000/admin` (log in first).
2. **Manage categories**: Add / delete groups in the "Categories" section.
3. **Manage links**: Fill in name, URL, icon, description, and category in the "Links" section; supports editing, deleting, and moving across categories.
4. Every save writes back to `config/bookmarks.yaml` in real time; return to the dashboard to see the update.

---

## 📁 Files Added / Changed (vs. upstream)

```
src/utils/config/admin.js          # Read/write config/bookmarks.yaml (backup + atomic write)
src/pages/api/admin/bookmarks.js   # Bookmark CRUD API (GET/POST/PUT/DELETE)
src/pages/api/admin/groups.js      # Category CRUD API (GET/POST/DELETE)
src/pages/admin.jsx                # Admin UI page
src/pages/index.jsx                # Dashboard "Admin" entry (gear icon)
.github/workflows/fork-docker-publish.yml  # GHCR multi-arch auto-build
docker-compose.yml                 # FnOS / generic deployment
.npmrc                             # shamefully-hoist=true (Next 16 + pnpm compat fix)
```

---

## 🛠️ Local Development

```bash
pnpm install      # repo includes .npmrc: shamefully-hoist=true for a clean build
pnpm dev          # dev mode, visit http://localhost:3000
```

> Note: This project runs on Next.js 16 + pnpm. If `pnpm install` complains about a missing `@swc/helpers`,
> make sure `.npmrc`'s `shamefully-hoist=true` is in effect, or install with `--shamefully-hoist`.

> 🤖 **AI Agent Guidelines**: If you or your AI agents (e.g. Cursor, Claude Code, Devin, Copilot) are continuing development on this project, please refer to [AGENTS.md](./AGENTS.md) for full architecture details, code maps, CI requirements, and gotchas.

---

## 🐳 Build Image From Source

If you'd rather build the image yourself instead of using GHCR:

```bash
docker build -t my-homepage:local .
docker run -d -p 3000:3000 -v $(pwd)/config:/config \
  -e HOMEPAGE_AUTH_ENABLED=true \
  -e HOMEPAGE_AUTH_PASSWORD=your-password \
  -e HOMEPAGE_AUTH_SECRET=$(openssl rand -hex 32) \
  -e HOMEPAGE_EXTERNAL_URL=http://your-ip:3000 \
  my-homepage:local
```

---

## 📝 Config Format

Data written by the admin backend is identical to homepage's native `bookmarks.yaml`, e.g.:

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

See the [homepage bookmarks docs](https://gethomepage.dev/configs/bookmarks/) for details.

---

## 🔄 Syncing With Upstream

This repo is forked from `gethomepage/homepage`'s `dev` branch. To merge upstream updates, use `git rebase` to bring in new commits and watch for conflicts in `src/pages/index.jsx` and config-loading related files.

---

## 🙏 Acknowledgements

- Original project: [gethomepage/homepage](https://github.com/gethomepage/homepage) — an excellent self-hosted dashboard.
- This fork only adds the admin backend on top of it; the core dashboard functionality and copyright belong to the original project.
