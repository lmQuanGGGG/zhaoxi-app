# ZhaoXi 18.0.1 — Mobile Workspace Migration

First migration layer after the 18.0 Adaptive Glass baseline.

## Contract
- Phone (<768px): no horizontal page overflow; legacy multi-column grids collapse to one column.
- Tables remain usable with local horizontal scrolling rather than forcing the whole page wider.
- Forms, images, charts, code blocks and content surfaces are constrained to the viewport.
- Admin workspaces inherit SF Pro/system typography, Aurora background and white/glass card treatment.
- Tablet (768–1199px): content remains fluid and uses available width.
- Business logic, API routes, authentication and QR access are unchanged.

## Shared primitives
`mobileWorkspaceTokens`, `mobileCardStyle`, and `mobileFieldStyle` are now available in `@zhaoxi/ui` for progressive native migration of individual modules.
