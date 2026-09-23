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

export type DailyAnalytics = {
  date: string;
  orders: number;
  completed: number;
  gmv: number;
  foodRevenue: number;
  promotionDiscount: number;
  couponDiscount: number;
  deliverySubsidy: number;
};

export type TopItemAnalytics = {
  serviceId: string;
  name: string;
  quantity: number;
  revenue: number;
  discount: number;
  orders: number;
};

export type CampaignAnalytics = {
  id: string;
  code: string;
  title: string;
  enabled: boolean;
  usedCount: number;
  totalUsageLimit: number | null;
  completedOrders: number;
  completedDiscount: number;
  completedRevenue: number;
  periodRedemptions: number;
  periodRedeemedDiscount: number;
  discountType: string;
  discountValue: number;
};

export type AnalyticsData = {
  periodDays: number;
  generatedAt: string;
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    inProgress: number;
    completionRate: number;
    cancellationRate: number;
  };
  revenue: {
    gmv: number;
    itemBaseRevenue: number;
    itemPromotionDiscount: number;
    couponDiscount: number;
    foodRevenue: number;
    deliveryGrossFee: number;
    deliverySubsidy: number;
    customerDeliveryFee: number;
    averageOrderValue: number;
  };
  operations: {
    averagePreparationMinutes: number;
    preparationSamples: number;
  };
  daily: DailyAnalytics[];
  topItems: TopItemAnalytics[];
  campaignPerformance: CampaignAnalytics[];
};
