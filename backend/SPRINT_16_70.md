# Sprint 16.70 — Customer Message Center, Conversation Threads & Unified Support Inbox

Built cumulatively on Sprint 16.69 GREEN/READY.

## Unified Message Center
`/messages` is now a conversation-oriented Customer inbox rather than a duplicate Notification Center.

It unifies existing Customer conversations from:
- Housing,
- Travel,
- Payment Support,
- ZhaoXi Support threads.

Notification history remains in `/notifications`; messaging and notifications are now separate but connected surfaces.

## Existing workflow preservation
Housing, Travel and Payment threads continue using the existing message stores and message services.
The unified Message Center dispatches sends/read actions back to:
- `housingMessagingService`
- `travelMessagingService`
- `paymentSupportService`

No duplicate conversation state is created for those business modules.

## ZhaoXi Support
Customer can create durable ZhaoXi Support threads with a subject and first message.
Support threads use dedicated tables:
- `customer_support_threads`
- `customer_support_messages`

This establishes a persistent Support Inbox foundation while the existing ZhaoXi Assistant remains directly accessible from Message Center.

## Conversation behavior
Each thread exposes:
- conversation category,
- title,
- latest message,
- last activity time,
- unread count,
- thread status.

Customer can:
- filter threads,
- open a thread,
- mark incoming messages read,
- send a reply,
- create a ZhaoXi Support conversation.

## Product architecture
Customer messaging structure:
- Home / Back
- Message Center
- Notification Center
- ZhaoXi Assistant
- Deep business conversations.

## Migration
Migration required: `npm run db:apply:16.70`.

Single-language remains mandatory.
