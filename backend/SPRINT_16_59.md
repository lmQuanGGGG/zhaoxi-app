# Sprint 16.59 — Partner Compliance Case, Corrective Action Plan & Quality Recovery

Built cumulatively on 16.58 GREEN/READY.

Admin can open one active compliance case per Partner with a reason and deadline. The case snapshots quality/risk at opening.
Partner can submit a corrective action plan containing summary, root cause and action items, then add evidence references and notes.
Admin can approve the plan, require changes, move the Partner into monitoring, confirm quality recovery, or close the case.
Recovery stores a fresh quality/risk snapshot so improvement is auditable.
Every case has a timeline. Admin case opening/review is audit logged.
Cases are stored in organization metadata; no database migration.

Compliance cases are operational governance only: advisoryOnly, noAutomaticFeeChange and noFundControl are invariant. Cases never freeze Partner funds, alter payment routing, perform refunds, or automatically modify platform usage fees.

Single-language mandatory.
