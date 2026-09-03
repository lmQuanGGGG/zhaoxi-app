# Sprint 14.8.1 – Search 2.0 Stylesheet Hotfix

Fixes the Customer production build failure caused by `app/search/page.tsx` importing the removed `legacy.module.css`. Search 2.0 now reuses `services.module.css`, which already contains the required `shell`, `searchHeader`, `body`, `state`, `list`, and `searchResult` classes.

No backend or database changes.
