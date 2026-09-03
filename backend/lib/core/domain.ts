export const APP_ROLES = ["customer","partner","admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];
export const SERVICE_MODULES = ["food","housing","visa","car-rental","translation","travel","payment","community","market","emergency"] as const;
export type ServiceModuleCode = (typeof SERVICE_MODULES)[number];
export const REQUEST_STATUSES = ["new","reviewing","assigned","accepted","in_progress","waiting_customer","completed","cancelled","rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type DeliveryStage = "preparing"|"finding_courier"|"delivering"|"delivered";
