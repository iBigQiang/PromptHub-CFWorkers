# Implementation

## Shipped

- Updated `apps/web/src/client/pages/Login.tsx` and `apps/web/src/client/index.css` so the login card matches the approved visual direction: compact brand block, calmer card surface, dark primary action, and a better-proportioned captcha row.
- Updated `apps/desktop/src/renderer/components/layout/Sidebar.tsx` so the prompt tag section follows the folder tree in the sidebar flow instead of being fixed to the bottom.
- Kept prompt tags as wrapping self-width chips, increased the default visible tag cap to 24, and added compact prompt-count badges.
- Sorted prompt sidebar tags by associated prompt count descending, with name sorting as the tie-breaker. Durable catalog-only tags remain visible without a zero badge.
- Removed the old prompt-tag resize path while preserving the existing Skills tag resize behavior.
- Added a sidebar regression test that verifies prompt tag usage ordering, per-prompt de-duplication, count display, and catalog-only tag visibility.
- Refined the Cloudflare login page with a scoped `web-login-page` pass: calmer Apple-like background, tighter card sizing, centered brand block, consistent 8px rhythm, quieter captcha controls, and mobile-safe captcha layout.
- Replaced the Cloudflare Worker short arithmetic captcha with a five-character mixed alphanumeric SVG captcha. The response no longer exposes a solvable arithmetic `prompt`; it keeps desktop sync compatibility by embedding the existing path-glyph signatures inside the SVG image data.
- Updated the Cloudflare admin registration helper so it can still handle legacy arithmetic prompts and can fall back to a locally saved SVG captcha for manual first-admin creation.
- Added a desktop self-hosted auth regression test for the five-character Worker captcha image format used by local client sync.

## Verification

- `pnpm --filter @prompthub/web typecheck` passed via `D:\nodejs\corepack.cmd`.
- `pnpm --filter @prompthub/web-cloudflare typecheck` passed via `D:\nodejs\corepack.cmd`.
- `pnpm --filter @prompthub/web build:client` passed via `D:\nodejs\corepack.cmd`.
- `pnpm --filter @prompthub/web test -- src/client/pages/Login.test.tsx` passed: 6 tests.
- `apps/desktop/node_modules/.bin/vitest.cmd run tests/unit/components/sidebar.test.tsx` passed: 15 tests.
- `apps/desktop/node_modules/.bin/vitest.cmd run apps/desktop/tests/unit/services/self-hosted-auth.test.ts` passed: 3 tests.
- Live deploy of the first scoped login page visual pass succeeded as Worker version `219672fb-cf2c-422b-b976-05ed11d21d9d`; `/health` returned OK, unauthenticated `/api/prompts` returned JSON `401`, and `/login` referenced `/assets/index-CdKe4HgI.css` plus `/assets/index-Db5dY1qo.js`.

## Notes

- `pnpm --filter @prompthub/desktop typecheck` still fails before this change's files on existing unrelated errors in Skill settings/projects and rule platform typing.
- An accidental full desktop Vitest run was triggered by a wrong `pnpm` argument form. The target `sidebar.test.tsx` passed inside that run, but the full suite still has unrelated Windows path, permissions, updater, and rules workspace failures.
- The final Worker captcha update has not been deployed yet because the external deploy approval was rejected by the Codex usage-limit gate. Run `pnpm --filter @prompthub/web build:client` if web assets change again, then run `wrangler deploy` from `apps/web-cloudflare` once external execution is available.
