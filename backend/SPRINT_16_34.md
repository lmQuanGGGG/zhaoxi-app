# Sprint 16.34 — Restaurant Finance Ledger & Settlement Detail

- Settlement drill-down to immutable order snapshot.
- Admin +/- adjustments require a reason and are allowed only while Draft.
- Partner payable recalculates from food revenue, delivery subsidy, platform commission and adjustments.
- Status/payment history is sourced from settlement audit events.
- Admin and Partner can export order-level CSV reports.
- Partner is read-only and authorization remains organization-scoped.
- Platform commission remains zero until an explicit ZhaoXi commercial policy is configured.
