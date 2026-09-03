# Sprint 16.15 — ZhaoXi Unified Customer Experience

Cumulative release on Sprint 16.14.

## Core Customer UX contracts
1. One consistent global glass top bar on every navigated Customer screen.
2. Admin controls the Customer welcome banner content, visual effect, and optional effect rotation.
3. Recommendations use smaller cards in a smooth horizontal carousel; default rotation is 60 seconds.
4. Bottom navigation is larger and uses glassmorphism.
5. Messages are organized around Home, Notification Center, and ZhaoXi Assistant; notification actions remain compact.
6. Profile/coupon labels follow the selected locale.
7. Emergency categories route to ZhaoXi Assistant; basic help is automated and 1-to-1 staff escalation is marked paid.
8. Food/restaurant previews are compact enough for multiple merchants on one mobile viewport.
9. Every life-service module routes to the matching module UI rather than reusing the restaurant screen.

## Global single-language contract
After a locale is selected, visible UI must use only that locale across entry, guest loading, navigation, routed pages, empty/error states, support, profile, and future components. Bilingual UI strings are not permitted. Brand names and dynamic data separators are not considered bilingual UI.
