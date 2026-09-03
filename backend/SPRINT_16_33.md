# Sprint 16.33 — Platform Financial Reconciliation & Restaurant Settlement

Adds immutable settlement snapshots, Draft → Ready → Confirmed → Paid workflow, Partner read-only reconciliation, Admin settlement controls and audit logs. Partner payable is `foodRevenue - deliverySubsidy - platformCommission + adjustments`. Platform commission defaults to 0 because no commercial commission policy has been approved yet.
