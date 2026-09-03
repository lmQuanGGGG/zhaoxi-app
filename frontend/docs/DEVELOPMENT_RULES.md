# ZhaoXi Development Rules

1. Build new functionality in this order: Core packages, Backend/API, Customer, Partner, Admin, integration verification, release.
2. Do not duplicate shared UI, theme, auth, notification, media or order logic inside applications.
3. Do not hard-code mixed-language labels. Render only the selected locale.
4. API access should be typed and centralized.
5. Every release must pass verifier, TypeScript checks and all production builds.
6. Foundation 14.0 is the final large architecture change; Sprint 14.1+ adds modules without redesigning the foundation.
