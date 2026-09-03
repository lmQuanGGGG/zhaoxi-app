# Sprint 13.7 Backend
Adds ETA metadata to service requests and automatically completes expired timed orders as `completed` with `deliveryStage: finding_courier`. No database migration is required because the existing `details` JSONB field is used.
