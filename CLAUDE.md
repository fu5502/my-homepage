# CLAUDE.md

> AI Agent Guidelines for `my-homepage` (Fork of gethomepage/homepage with built-in visual admin).
> Detailed project documentation is available in [AGENTS.md](./AGENTS.md).

## Quick Reference Commands

- **Package Manager**: Always use `pnpm` (never `npm` or `yarn`). Requires `shamefully-hoist=true` in `.npmrc`.
- **Install**: `pnpm install`
- **Dev**: `pnpm dev`
- **Build**: `pnpm build`
- **Test**: `pnpm test` or `pnpm vitest run <path-to-test>`
- **Lint**: `pnpm run lint`
- **Format (MANDATORY before commit)**: `npx prettier --write <modified-files>`

## Critical CI Requirements

- Pre-commit checks in GitHub Actions strictly enforce `prettier@3.3.3` with `prettier-plugin-organize-imports@4.1.0`.
- Always format changed `.js`, `.jsx`, `.md`, and `.yaml` files with Prettier before committing.

## Key Files for Admin Feature

- Backend config read/write & backup: `src/utils/config/admin.js`
- Admin API endpoints: `src/pages/api/admin/` (`bookmarks.js`, `services.js`, `groups.js`, `service-groups.js`)
- Admin UI: `src/pages/admin.jsx`
- Dashboard entry icon: `src/pages/index.jsx`
- Unit tests: `src/utils/config/admin.test.js`, `src/__tests__/pages/api/admin/bookmarks.test.js`

See [AGENTS.md](./AGENTS.md) for architecture deep dive, in-place update logic, and feature patterns.
