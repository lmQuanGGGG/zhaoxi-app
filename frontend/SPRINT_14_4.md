# Sprint 14.4 — Payment Core

This sprint adds the payment domain on top of the locked Foundation/Auth/Delivery architecture.

## Platform
- Shared `@zhaoxi/payment` package.
- Customer checkout payment method selector.
- Cash on delivery enabled by default.
- Bank transfer and WeChat Pay become enabled only when Backend reports that their configuration is present.
- Customer order detail, Partner order center and Admin oversight read the same payment method/status from order details.

## Backend
- See the matching Backend Sprint 14.4 package for persistent transactions/events and capability detection.

## Next
Sprint 14.5 connects the live WeChat Pay provider flow when merchant credentials are available.
