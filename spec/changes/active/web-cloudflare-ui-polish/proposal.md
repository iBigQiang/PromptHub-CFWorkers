# Web Cloudflare UI Polish

## Why

The Cloudflare self-hosted web UI should feel aligned with the desktop client while staying practical for browser use. The current login captcha controls have mismatched proportions, and the prompt tag section in the left sidebar is pinned to the bottom with a small fixed height, making tag filtering harder when many tags exist.

## Scope

- Improve the web auth captcha row sizing without changing auth behavior.
- Keep the folder tree's existing visual design while letting the prompt tag section follow underneath it.
- Keep prompt tags as a wrapping tag cloud, show more tags by default, and sort prompt tags by associated prompt count.

## Out of Scope

- Redesigning folder rows or prompt cards.
- Changing local-only skills/rules filesystem actions.
- Changing the Cloudflare data contract beyond tag display ordering in the renderer.

