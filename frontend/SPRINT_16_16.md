# Sprint 16.16 — Customer Service Experience & ZhaoXi Assistant Flow

Cumulative release on Sprint 16.15.

## Customer service experience
- Every service module keeps its own routed screen and localized module identity.
- Non-food and food service browsers include a ZhaoXi Assistant entry without replacing the service content.
- Service detail uses the central ZhaoXi locale provider, keeps the global top bar, adds Assistant access, and keeps the glass bottom navigation.
- Secondary service headers sit below the global top bar and use the same glass visual system.

## ZhaoXi Assistant
- Emergency categories show a locale-specific basic guidance card before chat.
- The selected emergency topic is prefilled into ZhaoXi Assistant.
- Basic Assistant support can be enabled centrally.
- Paid 1-to-1 staff support is explicit and its fee/currency are Admin-configurable.
- Admin receives a Customer Support control panel.

## Global language contract
All visible Customer strings continue to follow one selected locale only. Bilingual labels are prohibited.
