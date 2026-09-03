export type UserRole = "customer" | "partner" | "operator" | "admin";
export type ServiceModuleId =
  | "food"
  | "housing"
  | "visa"
  | "car-rental"
  | "translation"
  | "travel"
  | "payment"
  | "community"
  | "market"
  | "emergency";

export type RequestStatus =
  | "new"
  | "confirmed"
  | "processing"
  | "waiting_customer"
  | "completed"
  | "cancelled";

export interface ServiceRequest {
  id: string;
  moduleId: ServiceModuleId;
  customerId: string;
  partnerId?: string;
  status: RequestStatus;
  title: string;
  createdAt: string;
  updatedAt: string;
}
