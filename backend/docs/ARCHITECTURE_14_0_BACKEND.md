# ZhaoXi Backend Architecture 14.0

Foundation 14.0 introduces stable domain and service boundaries while preserving existing Next.js route handlers and database schema.

- `lib/core`: domain contracts, API envelopes and service context.
- `lib/services`: order, notification, marketplace, media and WeChat authentication service boundaries.
- `app/api`: transport adapters. Route handlers should progressively delegate business logic to services.
- `db`: persistence only.

WeChat QR authentication is represented by a provider interface. Real Open Platform integration is scheduled for Sprint 14.1 and requires official credentials.
