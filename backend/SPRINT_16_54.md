# Sprint 16.54 — Payment Operations, Refund Workflow & Exception Management
Cumulative on 16.53 GREEN/READY.

Partner can close eligible unpaid payment intents and request refunds for paid intents through the exact Partner-owned provider/merchant used by the payment intent. Every operation requires a reason, passes runtime health guard, uses the provider adapter, writes transaction history and audit logs.

Refund money remains Partner merchant -> Customer. ZhaoXi never holds, transfers, settles, or manually refunds Customer funds.

Failed close/refund operations create a payment exception. Admin can view unresolved exceptions and mark an operational exception resolved with a note. Admin resolution changes only ZhaoXi operational metadata and never moves funds.

Provider runtime success/failure is updated from operation results. Primary/fallback method resolution follows the stored payment intent.

No database migration. Operation/exception state persists in service request details.
Single-language remains mandatory.
