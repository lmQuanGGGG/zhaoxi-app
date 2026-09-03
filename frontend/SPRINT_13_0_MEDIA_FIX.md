# Sprint 13.0 Final Media Fix

- Removes organization/store name from Partner login, top header, dashboard card, and floating session toolbar.
- Shows local image preview immediately after selecting logo, banner, or item image.
- Replaces local preview with the public Vercel Blob URL after upload succeeds.
- Shows upload errors near the top of Partner service management.
- Banner slideshow previews selected local images while upload is running.
- Raises media limit to 5 MB to match the interface copy.
- Requires `BLOB_READ_WRITE_TOKEN` on the `zhaoxi-partner` Vercel project for persistence and Customer synchronization.
