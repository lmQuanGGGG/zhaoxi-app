export type Session = {
  sessionId: string;
  role: "partner";
  userId: string;
  displayName: string;
  organizationId?: string;
  organizationName?: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
};

export type AuthState = { accessToken: string; refreshToken: string; session: Session };
export type PartnerOrganization = { id: string; code?: string; name: string; type?: string; memberRole?: string };

export type OrderStage = "assigned" | "preparing" | "ready_for_pickup" | "courier_booked" | "handed_off";

export type Order = {
  requestId: string;
  requestCode: string;
  status: string;
  stage: OrderStage;
  priority: "normal" | "high" | "urgent";
  serviceName: string;
  customerName: string;
  customerPhone?: string;
  addressText?: string;
  quantity: number;
  totalAmount: number;
  itemSubtotal?: number;
  deliveryGrossFee?: number;
  deliverySubsidy?: number;
  customerDeliveryFee?: number;
  deliveryDistanceKm?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  estimatedMinutes: number;
  estimatedReadyAt: string | null;
  overdueMinutes: number;
  elapsedMinutes: number;
  late: boolean;
  deliveryProvider?: string;
  deliveryProviderLabel?: string;
  createdAt: string;
};

export type QueueData = {
  generatedAt: string;
  counts: { waiting: number; preparing: number; ready: number; courier: number; late: number };
  items: Order[];
};
