# Sprint 4 Design Tokens

## Source

- `apps/web/src/design-system/tokens.json`
- Generated: `apps/web/src/design-system/tokens.css`
- Generated: `apps/web/src/design-system/tokens.ts`

## Token Groups

- `color`: brand, accent, semantic status, surfaces, sidebar, text and border colors.
- `radius`: compact radii for controls, surfaces and shell elements.
- `spacing`: 2-40px density scale plus legacy aliases.
- `typography`: Chinese enterprise UI font stack, page title, section title, body, meta, line-height and weight tokens.
- `border`: base, subtle and strong border aliases.
- `shadow`: restrained elevation for commercial SaaS surfaces.
- `layout`: sidebar width, topbar height, content max width and table minimum width.
- `focus`: accessible focus ring and outline.
- `density`: control height, table row height and page gap.

## Compatibility

Legacy variables such as `--ep-color-primary-bg`, `--ep-space-md` and `--ep-border-base` remain generated, so existing components keep working while new commercial tokens are available.

## Governance

Hardcoded colors, gradients, external UI frameworks, raw tables/buttons outside primitives and non-`eds-`/`enterprise-` static classes remain blocked by `npm run ui:scan`.
