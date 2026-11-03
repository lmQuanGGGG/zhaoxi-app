import { after } from "next/server";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { modules, orderConversations, orderMessages, organizationMembers, organizations, serviceRequests } from "@/db/schema";
import { customerMobilePushService } from "@/lib/services/customer-mobile-push-service";
import { partnerOrderMessagePushService } from "@/lib/services/partner-order-message-push-service";

// Order chat: every order (any module) gets one conversation between the
// customer who placed it and the organization it is assigned to. Access is
// always re-derived from the order row, so a reassigned order moves its chat to
// the new store and the old store loses access immediately.

export type OrderChatSide = "customer" | "partner";

export type OrderChatMessage = {
  id: string;
  senderRole: OrderChatSide;
  body: string;
  createdAt: string;
  clientMessageId: string | null;
};

export type OrderChatThread = {
  thread: {
    id: string;
    kind: "order";
    requestId: string;
    requestCode: string;
    title: string;
    subtitle: string;
    status: string;
    moduleCode: string;
    canSend: boolean;
    counterpartReadAt: string | null;
  };
  messages: OrderChatMessage[];
};

export type OrderChatSummary = {
  id: string;
  kind: "order";
  requestId: string;
  requestCode: string;
  title: string;
  subtitle: string;
  moduleCode: string;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderRole: OrderChatSide | null;
  unreadCount: number;
};

type OrderRow = {
  id: string;
  requestCode: string;
  title: string;
  status: string;
  customerId: string | null;
  customerName: string;
  organizationId: string | null;
  organizationName: string | null;
  moduleCode: string | null;
};

const MAX_BODY = 2000;
const PAGE = 200;
const EPOCH = sql`'epoch'::timestamptz`;

function clean(value: unknown) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, MAX_BODY);
}

function cleanClientId(value: unknown) {
  const id = String(value ?? "").trim();
  return /^[A-Za-z0-9_.:-]{8,64}$/.test(id) ? id : null;
}

function preview(body: string, max = 140) {
  const text = body.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toMessage(row: typeof orderMessages.$inferSelect): OrderChatMessage {
  return { id: row.id, senderRole: row.senderRole as OrderChatSide, body: row.body, createdAt: row.createdAt.toISOString(), clientMessageId: row.clientMessageId };
}

/** Runs after the HTTP response when called inside a request, otherwise immediately. */
function runInBackground(task: () => Promise<unknown>) {
  const run = () => task().catch((error) => console.error("[order-chat]", error));
  try {
    after(run);
  } catch {
    void run();
  }
}

export class OrderChatService {
  private async order(requestId: string): Promise<OrderRow | undefined> {
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) return undefined;
    const [row] = await getDb()
      .select({
        id: serviceRequests.id,
        requestCode: serviceRequests.requestCode,
        title: serviceRequests.title,
        status: serviceRequests.status,
        customerId: serviceRequests.customerId,
        customerName: serviceRequests.customerName,
        organizationId: serviceRequests.assignedOrganizationId,
        organizationName: organizations.name,
        moduleCode: modules.code,
      })
      .from(serviceRequests)
      .leftJoin(organizations, eq(organizations.id, serviceRequests.assignedOrganizationId))
      .leftJoin(modules, eq(modules.id, serviceRequests.moduleId))
      .where(eq(serviceRequests.id, requestId))
      .limit(1);
    return row;
  }

  private async assertMember(userId: string, organizationId: string) {
    if (!organizationId) throw new Error("PARTNER_FORBIDDEN");
    const [member] = await getDb()
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.isActive, true)))
      .limit(1);
    if (!member) throw new Error("PARTNER_FORBIDDEN");
  }

  /** The order, if this customer placed it. Unknown and foreign orders look the same. */
  private async customerOrder(userId: string, requestId: string) {
    const order = await this.order(requestId);
    if (!order || order.customerId !== userId) throw new Error("ORDER_CHAT_NOT_FOUND");
    return order;
  }

  /** The order, if it is currently assigned to an organization this user belongs to. */
  private async partnerOrder(userId: string, organizationId: string, requestId: string) {
    await this.assertMember(userId, organizationId);
    const order = await this.order(requestId);
    if (!order || order.organizationId !== organizationId) throw new Error("ORDER_CHAT_NOT_FOUND");
    return order;
  }

  private async conversation(requestId: string) {
    const [row] = await getDb().select().from(orderConversations).where(eq(orderConversations.serviceRequestId, requestId)).limit(1);
    return row;
  }

  private async ensureConversation(order: OrderRow) {
    if (!order.customerId || !order.organizationId) throw new Error("ORDER_CHAT_UNAVAILABLE");
    const existing = await this.conversation(order.id);
    if (existing) return existing;
    await getDb()
      .insert(orderConversations)
      .values({ serviceRequestId: order.id, customerId: order.customerId, organizationId: order.organizationId })
      .onConflictDoNothing({ target: orderConversations.serviceRequestId });
    const created = await this.conversation(order.id);
    if (!created) throw new Error("ORDER_CHAT_UNAVAILABLE");
    return created;
  }

  private async thread(side: OrderChatSide, order: OrderRow): Promise<OrderChatThread> {
    const conversation = await this.conversation(order.id);
    const rows = conversation
      ? await getDb().select().from(orderMessages).where(eq(orderMessages.conversationId, conversation.id)).orderBy(desc(orderMessages.createdAt)).limit(PAGE)
      : [];
    return {
      thread: {
        id: `order:${order.id}`,
        kind: "order",
        requestId: order.id,
        requestCode: order.requestCode,
        title: side === "customer" ? order.organizationName || order.title : order.customerName,
        subtitle: side === "customer" ? order.requestCode : `${order.requestCode} · ${order.title}`,
        status: order.status,
        moduleCode: order.moduleCode || "",
        canSend: Boolean(order.customerId && order.organizationId),
        counterpartReadAt: iso(side === "customer" ? conversation?.partnerLastReadAt : conversation?.customerLastReadAt),
      },
      messages: rows.reverse().map(toMessage),
    };
  }

  private async send(side: OrderChatSide, senderUserId: string, order: OrderRow, bodyInput: unknown, clientIdInput?: unknown) {
    const body = clean(bodyInput);
    if (!body) throw new Error("ORDER_MESSAGE_REQUIRED");
    const clientMessageId = cleanClientId(clientIdInput);
    const conversation = await this.ensureConversation(order);
    const db = getDb();
    const [inserted] = await db
      .insert(orderMessages)
      .values({ conversationId: conversation.id, senderRole: side, senderUserId, body, clientMessageId })
      .onConflictDoNothing()
      .returning();
    // A retried send (same clientMessageId) returns the original and does not notify again.
    if (!inserted) {
      const [original] = clientMessageId
        ? await db.select().from(orderMessages).where(and(eq(orderMessages.conversationId, conversation.id), eq(orderMessages.clientMessageId, clientMessageId))).limit(1)
        : [];
      if (!original) throw new Error("ORDER_MESSAGE_FAILED");
      return toMessage(original);
    }
    const at = inserted.createdAt;
    await db
      .update(orderConversations)
      .set({
        organizationId: order.organizationId!,
        lastMessageAt: at,
        lastMessagePreview: preview(body),
        lastSenderRole: side,
        updatedAt: at,
        ...(side === "customer" ? { customerLastReadAt: at } : { partnerLastReadAt: at }),
      })
      .where(eq(orderConversations.id, conversation.id));
    runInBackground(() => this.notify(side, order, body));
    return toMessage(inserted);
  }

  private async notify(side: OrderChatSide, order: OrderRow, body: string) {
    const threadId = `order:${order.id}`;
    if (side === "partner" && order.customerId) {
      const store = order.organizationName || order.requestCode;
      await customerMobilePushService.sendToUser(order.customerId, "message", () => ({ title: `💬 ${store}`, body: preview(body) }), { url: `/messages?thread=${threadId}`, threadId, requestId: order.id });
    }
    if (side === "customer" && order.organizationId) {
      await partnerOrderMessagePushService.send(order.organizationId, { requestId: order.id, title: `💬 ${order.customerName} · ${order.requestCode}`, body: preview(body) });
    }
  }

  private async markRead(side: OrderChatSide, order: OrderRow) {
    const now = new Date();
    await getDb()
      .update(orderConversations)
      .set(side === "customer" ? { customerLastReadAt: now } : { partnerLastReadAt: now })
      .where(eq(orderConversations.serviceRequestId, order.id));
    return { read: true, readAt: now.toISOString() };
  }

  /** Messages from the other side newer than this side's read cursor. */
  private unreadExpression(side: OrderChatSide) {
    const from = side === "customer" ? "partner" : "customer";
    const cursor = side === "customer" ? orderConversations.customerLastReadAt : orderConversations.partnerLastReadAt;
    return sql<number>`(select count(*)::int from ${orderMessages} m where m.conversation_id = ${orderConversations.id} and m.sender_role = ${from} and m.created_at > coalesce(${cursor}, ${EPOCH}))`;
  }

  private async list(side: OrderChatSide, scope: ReturnType<typeof eq>): Promise<OrderChatSummary[]> {
    const rows = await getDb()
      .select({
        requestId: serviceRequests.id,
        requestCode: serviceRequests.requestCode,
        title: serviceRequests.title,
        status: serviceRequests.status,
        customerName: serviceRequests.customerName,
        organizationName: organizations.name,
        moduleCode: modules.code,
        lastMessage: orderConversations.lastMessagePreview,
        lastMessageAt: orderConversations.lastMessageAt,
        lastSenderRole: orderConversations.lastSenderRole,
        unreadCount: this.unreadExpression(side),
      })
      .from(orderConversations)
      .innerJoin(serviceRequests, eq(serviceRequests.id, orderConversations.serviceRequestId))
      .leftJoin(organizations, eq(organizations.id, serviceRequests.assignedOrganizationId))
      .leftJoin(modules, eq(modules.id, serviceRequests.moduleId))
      .where(and(scope, isNotNull(orderConversations.lastMessageAt)))
      .orderBy(desc(orderConversations.lastMessageAt))
      .limit(100);
    return rows.map((row) => ({
      id: `order:${row.requestId}`,
      kind: "order",
      requestId: row.requestId,
      requestCode: row.requestCode,
      title: side === "customer" ? row.organizationName || row.title : row.customerName,
      subtitle: side === "customer" ? row.requestCode : `${row.requestCode} · ${row.title}`,
      moduleCode: row.moduleCode || "",
      status: row.status,
      lastMessage: row.lastMessage || "",
      lastMessageAt: iso(row.lastMessageAt) || "",
      lastSenderRole: (row.lastSenderRole as OrderChatSide | null) ?? null,
      unreadCount: Number(row.unreadCount || 0),
    }));
  }

  // Customer side
  customerThreads(userId: string) {
    return this.list("customer", eq(serviceRequests.customerId, userId));
  }
  async customerThread(userId: string, requestId: string) {
    return this.thread("customer", await this.customerOrder(userId, requestId));
  }
  async customerSend(userId: string, requestId: string, body: unknown, clientMessageId?: unknown) {
    return this.send("customer", userId, await this.customerOrder(userId, requestId), body, clientMessageId);
  }
  async customerRead(userId: string, requestId: string) {
    return this.markRead("customer", await this.customerOrder(userId, requestId));
  }

  // Partner side
  async partnerThreads(userId: string, organizationId: string) {
    await this.assertMember(userId, organizationId);
    const threads = await this.list("partner", eq(serviceRequests.assignedOrganizationId, organizationId));
    return { threads, summary: { total: threads.length, unread: threads.reduce((sum, x) => sum + x.unreadCount, 0) } };
  }
  async partnerUnread(userId: string, organizationId: string) {
    await this.assertMember(userId, organizationId);
    const [row] = await getDb()
      .select({ unread: sql<number>`count(*)::int` })
      .from(orderMessages)
      .innerJoin(orderConversations, eq(orderConversations.id, orderMessages.conversationId))
      .innerJoin(serviceRequests, eq(serviceRequests.id, orderConversations.serviceRequestId))
      .where(and(
        eq(serviceRequests.assignedOrganizationId, organizationId),
        eq(orderMessages.senderRole, "customer"),
        sql`${orderMessages.createdAt} > coalesce(${orderConversations.partnerLastReadAt}, ${EPOCH})`,
      ));
    return { unread: Number(row?.unread || 0) };
  }
  async partnerThread(userId: string, organizationId: string, requestId: string) {
    return this.thread("partner", await this.partnerOrder(userId, organizationId, requestId));
  }
  async partnerSend(userId: string, organizationId: string, requestId: string, body: unknown, clientMessageId?: unknown) {
    return this.send("partner", userId, await this.partnerOrder(userId, organizationId, requestId), body, clientMessageId);
  }
  async partnerRead(userId: string, organizationId: string, requestId: string) {
    return this.markRead("partner", await this.partnerOrder(userId, organizationId, requestId));
  }
}

export const orderChatService = new OrderChatService();

/** HTTP status for an order chat error code. */
export function orderChatErrorStatus(code: string) {
  if (code === "ORDER_CHAT_NOT_FOUND") return 404;
  if (code === "PARTNER_FORBIDDEN") return 403;
  return 422;
}
