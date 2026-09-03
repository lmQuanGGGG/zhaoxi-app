export const FOUNDATION_VERSION = "14.0.0";
export const MOBILE_APP_MAX_WIDTH = 520;
export const SERVICE_MODULES = ["food","housing","visa","car-rental","translation","travel","payment","community","market","emergency"] as const;
export type ServiceModuleCode = (typeof SERVICE_MODULES)[number];
export const APP_ROLES = ["customer","partner","admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];
export const POLLING = { orderAlertsMs: 5000, notificationsMs: 5000, recommendationsMs: 10000 } as const;
