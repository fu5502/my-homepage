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

## 🚀 Quick Start (Docker / FnOS NAS recommended)

The image is already built at `ghcr.io/fu5502/my-homepage:latest`. On a FnOS NAS (or any machine with Docker):

```bash
# 1. Pull the image (public repo, no login needed)
docker pull ghcr.io/fu5502/my-homepage:latest

# 2. Prepare a config directory with settings.yaml (see "Enable Auth" below)
mkdir -p ./config

# 3. Start with the repo's docker-compose.yml
#    Put docker-compose.yml in a folder that contains ./config, then run:
docker compose up -d
```

Then visit `http://<device-IP>:3000`.

> If you've already `git clone`d this repo, just run `docker compose up -d` (the compose file already sets up the volume mount and `HOMEPAGE_AUTH_ENABLED=true`).

### Enable Auth (strongly recommended)

Both `/admin` and `api/admin/*` are protected by `HOMEPAGE_AUTH_ENABLED`. **Note: in this homepage version, password login is driven by environment variables, NOT the `auth.users` block in `settings.yaml`.** The following 4 variables must all be present for next-auth to register the "Password" provider:

| Variable                     | Purpose                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `HOMEPAGE_AUTH_ENABLED=true` | enable auth                                                                                      |
| `HOMEPAGE_AUTH_PASSWORD`     | login password (single global password — the sign-in page only asks for a password, no username) |
| `HOMEPAGE_AUTH_SECRET`       | session secret (random string; changing it invalidates existing sessions)                        |
| `HOMEPAGE_EXTERNAL_URL`      | public base URL, required by next-auth, e.g. `http://192.168.1.100:3000`                         |

These variables come from a `.env` file in the repository root (**gitignored, never committed**). First-time setup:

```bash
cp .env.example .env   # then edit .env with your own password and base URL
docker compose up -d
```

Generate `HOMEPAGE_AUTH_SECRET` with `openssl rand -base64 32`. When using `docker run`, pass the same variables as `-e` flags.

> ⚠️ Never put real passwords in `docker-compose.yml`, the README, or any file tracked by Git.

For OIDC / header auth, see the [homepage docs](https://gethomepage.dev/configs/settings/#auth).

After logging in, a ⚙️ gear icon appears at the bottom-right of the dashboard — click it to open `/admin`.

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
