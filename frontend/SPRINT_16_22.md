# Sprint 16.22 — Notification Center, Real-time Customer Updates & Deep Linking

Cumulative release on Sprint 16.21.

- Customer notifications now use authenticated server-side state rather than localStorage read/delete lists.
- Order status, payment status, and ZhaoXi Assistant replies are unified into one Notification Center.
- Notification Center refreshes every 5 seconds and refreshes again when the app regains focus.
- Bottom navigation shows the persistent unread count.
- Tapping a notification marks it read and deep-links to the exact order or Assistant conversation.
- Mark-all-read and clear-all are compact secondary actions.
- Single-language remains mandatory.
