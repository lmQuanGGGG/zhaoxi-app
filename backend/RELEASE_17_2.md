# ZhaoXi 17.2 — Major Cumulative Support Knowledge, Self-Service & Case Intelligence Release

Baseline: ZhaoXi 17.1 GREEN + READY.

## Major scope
- Public ZhaoXi Help Center
- Multilingual Support Knowledge Base
- Draft / Published / Archived article lifecycle
- Knowledge search by locale, category and relevant context
- Article helpful / not-helpful feedback
- Knowledge view and helpful-rate analytics
- Admin Knowledge Manager
- Case Intelligence inside Admin Support Desk
- Context-based related-article recommendations
- Rule-based case signals for payment / refund / urgent / housing / travel
- Priority recommendation
- Existing Support CRM automation rules surfaced as recommendations
- Customer Message Center deep-link to Help Center

## Case Intelligence safety
Case Intelligence is deterministic/rule-based and recommendation-only.
It cannot:
- auto-assign an agent,
- change case status,
- mutate priority without Admin action,
- perform financial actions,
- change Partner payment routing, settlements, refunds, platform fees or Partner funds.

## Knowledge analytics
Admin can see per-article:
- views,
- feedback count,
- helpful count,
- helpful rate.

## Migration
Run `npm run db:apply:17.2`.
Migration is idempotent and creates knowledge article, feedback and view tables.

Single-language UI remains mandatory.
