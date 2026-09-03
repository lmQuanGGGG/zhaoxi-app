export const DELIVERY_JOB_STATUSES=["searching_driver","assigned","picked_up","delivering","delivered","cancelled"] as const;
export type DeliveryJobStatus=(typeof DELIVERY_JOB_STATUSES)[number];
export type DriverAvailability="offline"|"available"|"busy"|"suspended";
export type DriverProfile={id:string;userId:string;status:DriverAvailability;phone?:string;vehicleType:string;plateNumber?:string;updatedAt:string};
export type DeliveryJob={id:string;requestId:string;driverId?:string;status:DeliveryJobStatus;pickupAddress?:string;pickupLatitude?:string;pickupLongitude?:string;dropoffAddress?:string;dropoffLatitude?:string;dropoffLongitude?:string;requestCode?:string;customerName?:string;customerPhone?:string;title?:string;orderDetails?:Record<string,unknown>;dispatchDistanceKm?:number|null;dispatchEtaMinutes?:number|null;deliveryFee?:number;dispatchScore?:number;createdAt:string;updatedAt:string};
export type DeliveryLocationPoint={latitude:string;longitude:string;accuracyMeters?:string;heading?:string;speedMps?:string;recordedAt?:string;updatedAt?:string};
export type DeliveryTelemetry={isLive:boolean;isStale?:boolean;locationAgeSeconds?:number;distanceRemainingKm?:number;etaMinutes?:number;targetType?:"pickup"|"dropoff";lastUpdatedAt?:string|null};
export type DeliveryTimelineEvent={id:string;eventType:string;fromStatus?:string|null;toStatus?:string|null;metadata?:Record<string,unknown>;createdAt:string};
export type DeliveryTracking={job:DeliveryJob;driver?:{id:string;displayName:string;avatarUrl?:string;vehicleType:string;plateNumber?:string}|null;location?:DeliveryLocationPoint|null;path?:DeliveryLocationPoint[];timeline?:DeliveryTimelineEvent[];telemetry?:DeliveryTelemetry};
export const DELIVERY_TRANSITIONS:Record<DeliveryJobStatus,readonly DeliveryJobStatus[]>={searching_driver:["assigned","cancelled"],assigned:["picked_up","cancelled"],picked_up:["delivering","cancelled"],delivering:["delivered","cancelled"],delivered:[],cancelled:[]};
export function canTransitionDelivery(from:DeliveryJobStatus,to:DeliveryJobStatus){return DELIVERY_TRANSITIONS[from].includes(to);}
export function deliveryStageLabel(status:DeliveryJobStatus,locale:string){const labels:any={
 "vi-VN":{searching_driver:"Đang tìm tài xế",assigned:"Tài xế đã nhận chuyến",picked_up:"Đã lấy hàng",delivering:"Đang giao",delivered:"Đã giao hoàn thành",cancelled:"Đã hủy giao"},
 "zh-CN":{searching_driver:"正在寻找骑手",assigned:"骑手已接单",picked_up:"已取货",delivering:"配送中",delivered:"已送达",cancelled:"配送已取消"},
 "zh-TW":{searching_driver:"正在尋找騎手",assigned:"騎手已接單",picked_up:"已取貨",delivering:"配送中",delivered:"已送達",cancelled:"配送已取消"},
 "en-US":{searching_driver:"Finding driver",assigned:"Driver assigned",picked_up:"Picked up",delivering:"Delivering",delivered:"Delivered",cancelled:"Delivery cancelled"}};return labels[locale]?.[status]||status;}

export {DeliveryLiveMap,LiveDeliveryPanel} from "./live";
