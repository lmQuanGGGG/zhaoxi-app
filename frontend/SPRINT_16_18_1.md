# Sprint 16.18.1 — Personal Center JSX Stability Hotfix

Cumulative hotfix on Sprint 16.18.

- Keeps the full 16.18 Personal Center, Saved Identity, ZhaoXi ID, saved addresses, device security, and checkout prefill behavior.
- Moves Profile form-control CSS out of the inline JSX `<style>` block and into the existing Customer CSS module.
- The `Field` helper now returns a simple, explicit JSX tree with one parent `<label>`.
- No Customer data contract, route, locale, or Personal Center feature is removed.
- Single-language remains mandatory.
