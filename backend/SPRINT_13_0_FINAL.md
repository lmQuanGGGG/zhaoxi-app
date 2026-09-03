# Sprint 13.0 Final

The existing service and organization metadata APIs support the final catalog behavior:

- `organizations.metadata.logoUrl` and `bannerUrls` hold published media.
- `services.metadata.imageUrl` holds the published item image.
- `services.metadata.isAvailable` controls temporary sold-out locking without deleting history.
- No database migration is required.
