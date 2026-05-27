# Implementation

## Shipped

- Updated `apps/web/src/client/pages/Login.tsx` and `apps/web/src/client/index.css` so the login card matches the approved visual direction: compact brand block, calmer card surface, dark primary action, and a better-proportioned captcha row.
- Updated `apps/desktop/src/renderer/components/layout/Sidebar.tsx` so the prompt tag section follows the folder tree in the sidebar flow instead of being fixed to the bottom.
- Kept prompt tags as wrapping self-width chips, increased the default visible tag cap to 24, and added compact prompt-count badges.
- Sorted prompt sidebar tags by associated prompt count descending, with name sorting as the tie-breaker. Durable catalog-only tags remain visible without a zero badge.
- Removed the old prompt-tag resize path while preserving the existing Skills tag resize behavior.
- Added a sidebar regression test that verifies prompt tag usage ordering, per-prompt de-duplication, count display, and catalog-only tag visibility.

## Verification

- `pnpm --filter @prompthub/web typecheck` passed via `D:\nodejs\corepack.cmd`.
- `pnpm --filter @prompthub/web-cloudflare typecheck` passed via `D:\nodejs\corepack.cmd`.
- `pnpm --filter @prompthub/web build:client` passed via `D:\nodejs\corepack.cmd`.
- `pnpm --filter @prompthub/web test -- src/client/pages/Login.test.tsx` passed: 6 tests.
- `apps/desktop/node_modules/.bin/vitest.cmd run tests/unit/components/sidebar.test.tsx` passed: 15 tests.

## Notes

- `pnpm --filter @prompthub/desktop typecheck` still fails before this change's files on existing unrelated errors in Skill settings/projects and rule platform typing.
- An accidental full desktop Vitest run was triggered by a wrong `pnpm` argument form. The target `sidebar.test.tsx` passed inside that run, but the full suite still has unrelated Windows path, permissions, updater, and rules workspace failures.
