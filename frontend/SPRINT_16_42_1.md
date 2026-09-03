# Sprint 16.42.1 — Housing Inventory Import Path Hotfix

Platform-only hotfix on Sprint 16.42.

Fix:
- Correct PartnerWorkspaceNav relative import in:
  `apps/partner/app/housing-inventory/HousingInventoryManager.tsx`
- Old: `../../PartnerWorkspaceNav`
- New: `../PartnerWorkspaceNav`

No Backend change.
No database migration.
No behavior change.
