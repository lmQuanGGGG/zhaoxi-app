ZhaoXi 19.0.0 Sprint B1.4 - Enum Default Semantic Normalization

Scope
- Comparator-only patch.
- Treat PostgreSQL enum defaults rendered as 'value'::enum_type as semantically equal to the declared Drizzle enum literal.
- No database writes.
- No schema changes.
- No migrations.
- No API/auth/payment/WeChat/Platform changes.

Expected reconciliation gate after overlay:
MATCHED_TABLES=84 MISSING_TABLES=6 EXTRA_TABLES=0 STRUCTURAL_ISSUES=0 INFORMATIONAL_DIFFERENCES=7
ISSUES_BY_KIND={}
INFO_BY_KIND={"INDEX_NAME_DIFFERENCE":7}
Exit code remains 10 because six declared tables are intentionally still missing in production.
