# ZhaoXi 17.7.3 — Adaptive Phone + Tablet Glass UI

Baseline: ZhaoXi 17.7.2 TYPEFIX.

This checkpoint changes presentation only. Existing business modules, QR auth, single-language login, Platform Fee, Partner-owned Payment Gateway, delivery pricing and Google Maps/Routes wiring remain unchanged.

## Phone (<768px)
- No permanent left sidebar.
- Compact/collapsible shared topbar.
- Horizontally scrollable module rail directly below the topbar.
- Full-width single-column module surfaces.
- Fixed bottom quick navigation.
- Aggressive overflow guards for legacy inline grid layouts.

## Tablet (768px–1199px)
- Compact Glass sidebar preserving the approved tablet composition.
- Responsive KPI/service grids.
- Denser spacing without reducing business information.

Responsive mode is selected automatically by CSS viewport width and adapts on rotation.
