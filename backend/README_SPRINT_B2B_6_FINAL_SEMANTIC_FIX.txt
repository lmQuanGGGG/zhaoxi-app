ZhaoXi 19.0.0 Sprint B2B.6 Final Semantic Comparator Fix

Scope:
- compare-disposable-schema-contract.mjs
  * normalizes declared Drizzle index expressions such as table.viewedAt.desc() to the physical column viewed_at for shape comparison.
  * preserves existing index uniqueness and column-order checks.

- compare-production-disposable-semantics.mjs
  * treats explicit NULLS FIRST/LAST as semantically irrelevant only when the indexed column is NOT NULL in the inspected snapshot.
  * does not globally ignore NULL ordering for nullable columns.

This patch does not modify db/schema.ts, canonical SQL, bootstrap data, production data, or runtime code.

Expected post-overlay gates:
- node --check for both scripts: PASS
- compare-disposable-schema-contract.mjs: STRUCTURAL_ISSUES=0, exit code 0
- compare-production-disposable-semantics.mjs: SEMANTIC_CHECK_DRIFT=0, SEMANTIC_INDEX_DRIFT=0, HISTORICAL_UNIQUE_INFO=7
