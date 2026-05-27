# Design

## Login captcha

Keep the existing React markup in `apps/web/src/client/pages/Login.tsx` and adjust only the scoped auth CSS in `apps/web/src/client/index.css`.

- Use a two-column grid for captcha preview and refresh button.
- Give the preview and refresh controls the same height.
- Preserve `object-fit: contain` and let the captcha SVG keep its natural ratio inside a taller preview box.

## Sidebar tags

Keep folder item markup and styling intact. Adjust the sidebar body flow in `apps/desktop/src/renderer/components/layout/Sidebar.tsx` so folder and prompt tag sections share the same vertical scroll context.

- Remove the prompt tag resize handle and fixed `tagsSectionHeight` behavior for prompt tags.
- Keep skill tag resize behavior unchanged.
- Keep prompt tags as wrapping chips.
- Increase the default visible prompt tag cap to 24 before requiring "show all".
- Compute prompt tag counts from unique tags per prompt, then merge durable catalog tags with count zero.

