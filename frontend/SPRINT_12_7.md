# Sprint 12.7 — Media Upload & Multi-Service Marketplace

## Partner media upload

Partner can choose local image files for:

- store logo;
- up to 10 slideshow banners;
- product, food and service images;
- replacement images for existing catalog items.

Images are validated as JPG, PNG, WEBP or GIF and limited to 5 MB each. Files are uploaded to Vercel Blob and the resulting public URL is stored in the existing organization/service metadata.

## Vercel setup

Connect a Vercel Blob store to the `zhaoxi-partner` project. Vercel provides `BLOB_READ_WRITE_TOKEN` automatically after the integration is connected. Apply it to Production, Preview and Development as needed.

## Service-specific catalog fields

The shared catalog manager now adapts to food, housing, car rental, visa, translation, travel, payment, community, marketplace and emergency services. Extra attributes remain in service metadata, so this sprint does not require a database migration.
