# ZhaoXi 18.0 — Adaptive Glass UI Architecture

UI-only architecture release. Existing business APIs and operational rules are preserved.

## Baseline
- SF Pro Display / native Apple system font stack.
- Aurora soft pastel background: lavender, ice blue, blush.
- White/translucent glass cards, 16–20px radius, soft shadow.
- Brand accent `#10B981`.
- One language at a time; no bilingual UI copy.
- Shared top bar: language, theme, notifications, menu/logout by role and viewport.

## Adaptive behavior
- Phone `<768px`: no fixed sidebar; full-width mobile workspace + bottom navigation + drawer.
- Tablet `768–1199px`: compact navigation rail and 2-column-capable content.
- Desktop `>=1200px`: full administration workspace.
- Module content is constrained to viewport; forms and controls are fluid.
- Desktop tables must have a dedicated mobile card/list representation as modules are migrated; horizontal page overflow is prohibited.

## Admin dashboard order on phone
1. Welcome + period
2. 2x2 KPI grid
3. Top partners
4. Service overview
5. Bottom navigation

Notifications are accessed from the top-bar bell and are not duplicated on the dashboard.
