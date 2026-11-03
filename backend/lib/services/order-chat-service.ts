import { after } from "next/server";
import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { modules, orderConversations, orderMessageAttachments, orderMessages, organizationMembers, organizations, serviceRequests } from "@/db/schema";
import { customerMobilePushService } from "@/lib/services/customer-mobile-push-service";
import { partnerOrderMessagePushService } from "@/lib/services/partner-order-message-push-service";

// Order chat: every order (any module) gets one conversation between the
// customer who placed it and the organization it is assigned to. Access is
// always re-derived from the order row, so a reassigned order moves its chat to
// the new store and the old store loses access immediately.

export type OrderChatSide = "customer" | "partner";

export type OrderChatAttachment = {
  id: string;
  /** Path on the backend; fetch it with the same bearer token as the chat. */
  url: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
};

export type OrderChatMessage = {
  id: string;
  senderRole: OrderChatSide;
  body: string;
  createdAt: string;
  clientMessageId: string | null;
  attachments: OrderChatAttachment[];
};

export type OrderChatUpload = { bytes: Uint8Array; width?: unknown; height?: unknown };

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
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
/** Uploaded but not yet sent photos one person may hold in a conversation (24h). */
const MAX_PENDING_UPLOADS = 20;
export const PHOTO_PREVIEW = "[Ảnh]";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

const attachmentColumns = {
  id: orderMessageAttachments.id,
  messageId: orderMessageAttachments.messageId,
  mimeType: orderMessageAttachments.mimeType,
  width: orderMessageAttachments.width,
  height: orderMessageAttachments.height,
  sizeBytes: orderMessageAttachments.sizeBytes,
};
type AttachmentRow = { id: string; messageId: string | null; mimeType: string; width: number | null; height: number | null; sizeBytes: number };

function toAttachment(row: AttachmentRow): OrderChatAttachment {
  return { id: row.id, url: `/api/order-chat-attachments/${row.id}`, mimeType: row.mimeType, width: row.width, height: row.height, sizeBytes: row.sizeBytes };
}

function toMessage(row: typeof orderMessages.$inferSelect, attachments: AttachmentRow[] = []): OrderChatMessage {
  return {
    id: row.id,
    senderRole: row.senderRole as OrderChatSide,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    clientMessageId: row.clientMessageId,
    attachments: attachments.filter((a) => a.messageId === row.id).map(toAttachment),
  };
}

/** The real image type from the file's magic bytes; the client's MIME type is not trusted. */
function sniffImage(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "heic" | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(ascii(8, 12))) return "heic";
  return null;
}

function dimension(value: unknown) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 && n <= 20000 ? n : null;
}

function attachmentIdsOf(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("ATTACHMENT_INVALID");
  const ids = [...new Set(value.map((x) => String(x)))];
  if (ids.length > MAX_ATTACHMENTS) throw new Error("ATTACHMENT_LIMIT");
  if (ids.some((id) => !UUID.test(id))) throw new Error("ATTACHMENT_INVALID");
  return ids;
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
    const attachments = rows.length
      ? await getDb().select(attachmentColumns).from(orderMessageAttachments).where(inArray(orderMessageAttachments.messageId, rows.map((m) => m.id)))
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
      messages: rows.reverse().map((row) => toMessage(row, attachments)),
    };
  }

  private async messageWithAttachments(row: typeof orderMessages.$inferSelect) {
    const attachments = await getDb().select(attachmentColumns).from(orderMessageAttachments).where(eq(orderMessageAttachments.messageId, row.id));
    return toMessage(row, attachments);
  }

  private async send(side: OrderChatSide, senderUserId: string, order: OrderRow, bodyInput: unknown, clientIdInput?: unknown, attachmentInput?: unknown) {
    const body = clean(bodyInput);
    const attachmentIds = attachmentIdsOf(attachmentInput);
    if (!body && !attachmentIds.length) throw new Error("ORDER_MESSAGE_REQUIRED");
    const clientMessageId = cleanClientId(clientIdInput);
    const conversation = await this.ensureConversation(order);
    const db = getDb();
    // A retried send (same clientMessageId) returns the original and does not notify again.
    const existing = async () => {
      const [original] = clientMessageId
        ? await db.select().from(orderMessages).where(and(eq(orderMessages.conversationId, conversation.id), eq(orderMessages.clientMessageId, clientMessageId))).limit(1)
        : [];
      return original ? this.messageWithAttachments(original) : null;
    };
    const retried = await existing();
    if (retried) return retried;
    // The message and its photos land together: photos must be this sender's own
    // unsent uploads in this conversation, otherwise nothing is written.
    const inserted = await db.transaction(async (tx) => {
      const [message] = await tx
        .insert(orderMessages)
        .values({ conversationId: conversation.id, senderRole: side, senderUserId, body, clientMessageId })
        .onConflictDoNothing()
        .returning();
      if (!message) return null;
      if (attachmentIds.length) {
        const claimed = await tx
          .update(orderMessageAttachments)
          .set({ messageId: message.id })
          .where(and(
            inArray(orderMessageAttachments.id, attachmentIds),
            eq(orderMessageAttachments.conversationId, conversation.id),
            eq(orderMessageAttachments.uploaderUserId, senderUserId),
            isNull(orderMessageAttachments.messageId),
          ))
          .returning({ id: orderMessageAttachments.id });
        if (claimed.length !== attachmentIds.length) throw new Error("ATTACHMENT_INVALID");
      }
      return message;
    });
    if (!inserted) {
      const original = await existing();
      if (!original) throw new Error("ORDER_MESSAGE_FAILED");
      return original;
    }
    const at = inserted.createdAt;
    await db
      .update(orderConversations)
      .set({
        organizationId: order.organizationId!,
        lastMessageAt: at,
        lastMessagePreview: preview(body || PHOTO_PREVIEW),
        lastSenderRole: side,
        updatedAt: at,
        ...(side === "customer" ? { customerLastReadAt: at } : { partnerLastReadAt: at }),
      })
      .where(eq(orderConversations.id, conversation.id));
    runInBackground(() => this.notify(side, order, body || (attachmentIds.length > 1 ? `${PHOTO_PREVIEW} ×${attachmentIds.length}` : PHOTO_PREVIEW)));
    return this.messageWithAttachments(inserted);
  }

  private async upload(side: OrderChatSide, uploaderUserId: string, order: OrderRow, file: OrderChatUpload): Promise<OrderChatAttachment> {
    if (!file.bytes.length) throw new Error("ATTACHMENT_REQUIRED");
    if (file.bytes.length > MAX_ATTACHMENT_BYTES) throw new Error("IMAGE_TOO_LARGE");
    const type = sniffImage(file.bytes);
    // HEIC is converted to JPEG on the device before upload; the server cannot decode it.
    if (type === "heic") throw new Error("IMAGE_HEIC_UNSUPPORTED");
    if (!type) throw new Error("IMAGE_TYPE_UNSUPPORTED");
    const conversation = await this.ensureConversation(order);
    const db = getDb();
    const [pending] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderMessageAttachments)
      .where(and(
        eq(orderMessageAttachments.conversationId, conversation.id),
        eq(orderMessageAttachments.uploaderUserId, uploaderUserId),
        isNull(orderMessageAttachments.messageId),
        gt(orderMessageAttachments.createdAt, new Date(Date.now() - 24 * 3600_000)),
      ));
    if (Number(pending?.count || 0) >= MAX_PENDING_UPLOADS) throw new Error("TOO_MANY_PENDING_UPLOADS");
    const [row] = await db
      .insert(orderMessageAttachments)
      .values({ conversationId: conversation.id, uploaderRole: side, uploaderUserId, mimeType: type, sizeBytes: file.bytes.length, width: dimension(file.width), height: dimension(file.height), data: Buffer.from(file.bytes) })
      .returning(attachmentColumns);
    return toAttachment(row);
  }

  /** Photo bytes for someone in the conversation; unsent uploads only for their uploader. */
  async attachment(viewer: { userId: string; role: string; organizationId?: string | null }, attachmentId: string) {
    if (!UUID.test(attachmentId)) throw new Error("ATTACHMENT_NOT_FOUND");
    const [row] = await getDb()
      .select({
        mimeType: orderMessageAttachments.mimeType,
        data: orderMessageAttachments.data,
        messageId: orderMessageAttachments.messageId,
        uploaderUserId: orderMessageAttachments.uploaderUserId,
        requestId: orderConversations.serviceRequestId,
      })
      .from(orderMessageAttachments)
      .innerJoin(orderConversations, eq(orderConversations.id, orderMessageAttachments.conversationId))
      .where(eq(orderMessageAttachments.id, attachmentId))
      .limit(1);
    if (!row) throw new Error("ATTACHMENT_NOT_FOUND");
    if (viewer.role === "customer") await this.customerOrder(viewer.userId, row.requestId);
    else if (viewer.role === "partner") await this.partnerOrder(viewer.userId, String(viewer.organizationId || ""), row.requestId);
    else throw new Error("ATTACHMENT_NOT_FOUND");
    if (!row.messageId && row.uploaderUserId !== viewer.userId) throw new Error("ATTACHMENT_NOT_FOUND");
    return { mimeType: row.mimeType, data: row.data };
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
  async customerSend(userId: string, requestId: string, body: unknown, clientMessageId?: unknown, attachmentIds?: unknown) {
    return this.send("customer", userId, await this.customerOrder(userId, requestId), body, clientMessageId, attachmentIds);
  }
  async customerUpload(userId: string, requestId: string, file: OrderChatUpload) {
    return this.upload("customer", userId, await this.customerOrder(userId, requestId), file);
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
  async partnerSend(userId: string, organizationId: string, requestId: string, body: unknown, clientMessageId?: unknown, attachmentIds?: unknown) {
    return this.send("partner", userId, await this.partnerOrder(userId, organizationId, requestId), body, clientMessageId, attachmentIds);
  }
  async partnerUpload(userId: string, organizationId: string, requestId: string, file: OrderChatUpload) {
    return this.upload("partner", userId, await this.partnerOrder(userId, organizationId, requestId), file);
  }
  async partnerRead(userId: string, organizationId: string, requestId: string) {
    return this.markRead("partner", await this.partnerOrder(userId, organizationId, requestId));
  }
}

export const orderChatService = new OrderChatService();

/** HTTP status for an order chat error code. */
export function orderChatErrorStatus(code: string) {
  if (code === "ORDER_CHAT_NOT_FOUND" || code === "ATTACHMENT_NOT_FOUND") return 404;
  if (code === "PARTNER_FORBIDDEN") return 403;
  if (code === "ATTACHMENT_LIMIT" || code === "ATTACHMENT_REQUIRED") return 400;
  if (code === "IMAGE_TOO_LARGE") return 413;
  if (code === "IMAGE_TYPE_UNSUPPORTED" || code === "IMAGE_HEIC_UNSUPPORTED") return 415;
  if (code === "TOO_MANY_PENDING_UPLOADS") return 429;
  return 422;
}

/** Reads the single `file` part of a multipart photo upload. */
export async function readOrderChatUpload(request: Request): Promise<OrderChatUpload & { organizationId: string }> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_ATTACHMENT_BYTES + 64 * 1024) throw new Error("IMAGE_TOO_LARGE");
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof Blob)) throw new Error("ATTACHMENT_REQUIRED");
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("IMAGE_TOO_LARGE");
  return { bytes: new Uint8Array(await file.arrayBuffer()), width: form.get("width"), height: form.get("height"), organizationId: String(form.get("organizationId") || "") };
}
