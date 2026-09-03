import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  modules,
  moduleTranslations,
  organizations,
  organizationMembers,
  serviceRequests,
  serviceRequestStatusHistory,
  services,
  serviceTranslations,
  users,
} from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { localeFromRequest, normalizeLocale } from "@/lib/locale";
import { asObject, optionalRecord, optionalString, requiredString, ValidationError } from "@/lib/validation";
import { completeExpiredOrders } from "@/lib/order-timers";
import { paymentService } from "@/lib/services/payment-service";
import { authenticatedSession } from "@/lib/auth-request";
import { deliveryIntelligenceService } from "@/lib/services/delivery-intelligence-service";
import { restaurantAvailabilityService } from "@/lib/services/restaurant-availability-service";
import {foodCommercialService} from "@/lib/services/food-commercial-service";
import {restaurantCouponService,type CouponEvaluation} from "@/lib/services/restaurant-coupon-service";

export const dynamic = "force-dynamic";

function makeRequestCode() {
  const now = new Date();
  const date = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `ZX-${date}-${suffix}`;
}

export async function GET(request: Request) {
  try {
    await completeExpiredOrders();
    const url = new URL(request.url);
    const locale = localeFromRequest(request);
    const session = await authenticatedSession(request);
    if (!session) return errorResponse("Authentication required.", 401, { code: "AUTH_REQUIRED" });
    const phone = url.searchParams.get("phone")?.trim();
    const mine = url.searchParams.get("mine") === "1";
    const scope = url.searchParams.get("scope");
    const status = url.searchParams.get("status")?.trim();
    const organizationId = url.searchParams.get("organizationId")?.trim();
    const codes = (url.searchParams.get("codes") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 30);

    const filters = [];
    if (session.role === "customer") {
      filters.push(eq(serviceRequests.customerId, session.userId));
      if (codes.length) filters.push(inArray(serviceRequests.requestCode, codes));
    }
    if (session.role === "admin") {
      if (phone) filters.push(eq(serviceRequests.customerPhone, phone));
      if (codes.length) filters.push(inArray(serviceRequests.requestCode, codes));
    }

    // Operations queues are authenticated. Partner accounts are restricted to their active organization membership.
    if (scope === "operations") {
      if (!["partner","admin"].includes(session.role)) return errorResponse("Operations access denied.", 403);
      if (session.role === "partner") {
        if (!organizationId) return errorResponse("organizationId is required for partner operations.", 422);
        const membership=(await getDb().select().from(organizationMembers).where(and(eq(organizationMembers.organizationId,organizationId),eq(organizationMembers.userId,session.userId),eq(organizationMembers.isActive,true))).limit(1))[0];
        if (!membership) return errorResponse("Partner organization access denied.", 403);
      }
      if (organizationId) filters.push(eq(serviceRequests.assignedOrganizationId, organizationId));
      const allowed: ReadonlySet<string> = new Set(["new","reviewing","assigned","accepted","in_progress","waiting_customer","completed","cancelled","rejected"]);
      if (status && allowed.has(status)) filters.push(eq(serviceRequests.status, status as "new" | "reviewing" | "assigned" | "accepted" | "in_progress" | "waiting_customer" | "completed" | "cancelled" | "rejected"));
    } else if (session.role !== "customer" && session.role !== "admin") {
      return errorResponse("Request access denied.", 403);
    } else if (!filters.length || (session.role === "customer" && !mine && !codes.length)) {
      return json({ ok: true, data: [] });
    }

    const rows = await getDb()
      .select({
        id: serviceRequests.id,
        requestCode: serviceRequests.requestCode,
        status: serviceRequests.status,
        locale: serviceRequests.locale,
        customerName: serviceRequests.customerName,
        customerPhone: serviceRequests.customerPhone,
        title: serviceRequests.title,
        description: serviceRequests.description,
        addressText: serviceRequests.addressText,
        latitude: serviceRequests.latitude,
        longitude: serviceRequests.longitude,
        details: serviceRequests.details,
        createdAt: serviceRequests.createdAt,
        updatedAt: serviceRequests.updatedAt,
        moduleCode: modules.code,
        moduleName: moduleTranslations.name,
        serviceId: services.id,
        serviceCode: services.code,
        serviceName: serviceTranslations.name,
        organizationName: organizations.name,
        organizationCode: organizations.code,
      })
      .from(serviceRequests)
      .innerJoin(modules, eq(serviceRequests.moduleId, modules.id))
      .leftJoin(
        moduleTranslations,
        and(eq(moduleTranslations.moduleId, modules.id), eq(moduleTranslations.locale, locale)),
      )
      .leftJoin(services, eq(serviceRequests.serviceId, services.id))
      .leftJoin(
        serviceTranslations,
        and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, locale)),
      )
      .leftJoin(organizations, eq(serviceRequests.assignedOrganizationId, organizations.id))
      .where(filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters))
      .orderBy(desc(serviceRequests.createdAt))
      .limit(100);

    return json({ ok: true, data: rows });
  } catch (error) {
    console.error(error);
    return errorResponse("Unable to load service requests.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await authenticatedSession(request);
    if (!session) return errorResponse("Authentication is required to create an order.", 401, { code: "AUTH_REQUIRED" });
    if (session.role !== "customer") return errorResponse("A customer session is required to create an order.", 403, { code: "CUSTOMER_SESSION_REQUIRED" });
    if (session.authMethod === "guest") return errorResponse("Verified identity is required to create an order.", 403, { code: "IDENTITY_UPGRADE_REQUIRED" });
    const verifiedUser=(await getDb().select({phone:users.phone}).from(users).where(eq(users.id,session.userId)).limit(1))[0];
    const verifiedPhone=String(verifiedUser?.phone||"").trim();
    if(!verifiedPhone)return errorResponse("Verified phone is required to create an order.",403,{code:"VERIFIED_PHONE_REQUIRED"});
    const body = asObject(await request.json());
    const details = optionalRecord(body, "details") || {};
    const recipientPhone = optionalString(body, "recipientPhone", 30) || (typeof details.recipientPhone === "string" ? details.recipientPhone.slice(0, 30) : undefined);
    if (recipientPhone) details.recipientPhone = recipientPhone;
    const input = {
      moduleCode: requiredString(body, "moduleCode", 50),
      serviceId: optionalString(body, "serviceId", 36),
      customerName: requiredString(body, "customerName", 120),
      customerPhone: verifiedPhone,
      title: requiredString(body, "title", 240),
      description: optionalString(body, "description", 5000),
      locale: optionalString(body, "locale", 10),
      addressText: optionalString(body, "addressText", 1000),
      latitude: typeof body.latitude === "number" && Number.isFinite(body.latitude) ? body.latitude : undefined,
      longitude: typeof body.longitude === "number" && Number.isFinite(body.longitude) ? body.longitude : undefined,
      details,
    };
    const db = getDb();
    const [moduleRow] = await db.select({ id: modules.id }).from(modules).where(eq(modules.code, input.moduleCode)).limit(1);
    if (!moduleRow) return errorResponse("Unknown moduleCode.", 404);

    if (input.serviceId) {
      const [serviceRow] = await db
        .select({
          id: services.id,
          organizationId: services.organizationId,
          organizationName: organizations.name,
        organizationCode: organizations.code,
          organizationStatus: organizations.status,
          serviceMetadata: services.metadata,
        })
        .from(services)
        .leftJoin(organizations, eq(services.organizationId, organizations.id))
        .where(and(eq(services.id, input.serviceId), eq(services.moduleId, moduleRow.id), eq(services.isEnabled, true)))
        .limit(1);
      if (!serviceRow) return errorResponse("Unknown or unavailable serviceId.", 404);
      if (!serviceRow.organizationId || serviceRow.organizationStatus !== "active") {
        return errorResponse("This service is not connected to an active partner.", 409);
      }
      if (input.moduleCode==="food" && (serviceRow.serviceMetadata as Record<string,unknown>|null)?.isAvailable===false) {
        return errorResponse("This food item is currently sold out.",409,{code:"FOOD_ITEM_SOLD_OUT"});
      }
      if (!input.addressText?.trim()) return errorResponse("A delivery or service address is required.", 422);
      let requestDetails=input.details ?? {};
      let couponEvaluation:CouponEvaluation|null=null;
      if (input.moduleCode === "food") {
        const restaurantStatus=await restaurantAvailabilityService.status(serviceRow.organizationId);
        if(!restaurantStatus.open){
          const code=restaurantStatus.code==="platform_paused"?"RESTAURANT_PLATFORM_PAUSED":restaurantStatus.code==="manual_paused"?"RESTAURANT_PAUSED":restaurantStatus.code==="closed_hours"?"RESTAURANT_CLOSED":restaurantStatus.code==="at_capacity"?"RESTAURANT_AT_CAPACITY":"RESTAURANT_UNAVAILABLE";
          return errorResponse("Restaurant is not accepting new orders.",409,{code,restaurantStatus:{code:restaurantStatus.code,capacityRemaining:restaurantStatus.capacityRemaining,businessHoursToday:restaurantStatus.businessHoursToday,pauseReason:restaurantStatus.config.pauseReason}});
        }
        const quantity = Number(input.details?.quantity);
        if (!Number.isFinite(quantity) || quantity < 1) return errorResponse("A valid item quantity is required.", 422);
        if (input.latitude === undefined || input.longitude === undefined) return errorResponse("A delivery location is required.", 422);
        const submittedItems=Array.isArray(input.details?.items)?input.details.items as Array<Record<string,unknown>>:[];
        const pricingInput=submittedItems.length
          ? submittedItems.map(x=>({serviceId:String(x.serviceId||""),quantity:Number(x.quantity||1)}))
          : [{serviceId:serviceRow.id,quantity}];
        let foodPricing;
        try{foodPricing=await foodCommercialService.orderPricing(serviceRow.organizationId,pricingInput)}
        catch(error){
          const code=error instanceof Error?error.message:"FOOD_PRICING_FAILED";
          return errorResponse("Food pricing or availability changed.",409,{code});
        }
        const requestedCouponCode=typeof input.details?.couponCode==="string"?input.details.couponCode.trim():"";
        if(requestedCouponCode){
          if(!session||session.role!=="customer")return errorResponse("Customer session is required to use a coupon.",401,{code:"COUPON_CUSTOMER_REQUIRED"});
          try{couponEvaluation=await restaurantCouponService.evaluate(serviceRow.organizationId,requestedCouponCode,foodPricing.itemSubtotal,session.userId)}
          catch(error){const code=error instanceof Error?error.message:"COUPON_INVALID";return errorResponse("Coupon is invalid.",409,{code})}
          if(!couponEvaluation.valid)return errorResponse("Coupon cannot be applied.",409,{code:couponEvaluation.reason,coupon:couponEvaluation});
        }
        const quote=await deliveryIntelligenceService.quote(serviceRow.id,{latitude:input.latitude,longitude:input.longitude});
        if(!quote.eligible)return errorResponse(quote.reason==="outside_service_zone"?"Delivery address is outside this partner's service zone.":"Partner delivery location is not configured.",422,{delivery:quote});
        const itemSubtotalBeforeCoupon=foodPricing.itemSubtotal;
        const couponDiscount=Number(couponEvaluation?.discountAmount||0);
        const itemSubtotal=Math.max(0,itemSubtotalBeforeCoupon-couponDiscount);
        const grossDeliveryFee=Number(quote.grossFee||0);
        const partnerDeliverySubsidy=Number(quote.subsidy||0);
        const customerDeliveryFee=Number(quote.customerDeliveryFee||0);
        requestDetails={
          ...input.details,
          items:foodPricing.lines.map(line=>{
            const submitted=submittedItems.find(x=>String(x.serviceId||"")===line.serviceId)||{};
            return{...submitted,serviceId:line.serviceId,quantity:line.quantity,baseUnitPrice:line.baseUnitPrice,unitPrice:line.effectiveUnitPrice,baseSubtotal:line.baseSubtotal,discount:line.discount,subtotal:line.finalSubtotal,promotionType:line.promotionType,promotionLabel:line.promotionLabel};
          }),
          itemBaseSubtotal:foodPricing.itemBaseSubtotal,
          itemDiscount:foodPricing.itemDiscount,
          itemSubtotalBeforeCoupon,
          couponCode:couponEvaluation?.code||null,
          couponId:couponEvaluation?.couponId||null,
          couponTitle:couponEvaluation?.title||null,
          couponDiscount,
          itemSubtotal,
          pricingSource:"backend_food_coupon_16.30",
          deliveryDistanceKm:quote.distanceKm,
          deliveryGrossFee:grossDeliveryFee,
          deliveryDistanceFee:Number(quote.distanceFee||0),
          deliveryWeatherSurcharge:Number(quote.weather?.surcharge||0),
          deliveryWeatherLevel:quote.weather?.rainLevel||"none",
          deliverySubsidy:partnerDeliverySubsidy,
          deliveryFee:customerDeliveryFee,
          deliveryCustomerFee:customerDeliveryFee,
          deliverySubsidyActive:quote.subsidyActive,
          deliverySubsidyWindow:quote.subsidyWindow,
          deliveryEtaMinutes:quote.etaMinutes,
          deliveryRouteDurationMinutes:quote.routeDurationMinutes,
          deliveryZoneKm:quote.zoneKm,
          deliveryDistanceProvider:quote.distanceProvider,
          deliveryPricingSource:"backend_policy_16.25.1",
          deliveryFulfillmentMode:"external_manual",
          driverDispatchRequired:false,
          totalAmount:itemSubtotal+grossDeliveryFee-partnerDeliverySubsidy,
        };
      }

      const [created] = await db
        .insert(serviceRequests)
        .values({
          requestCode: makeRequestCode(),
          moduleId: moduleRow.id,
          serviceId: serviceRow.id,
          assignedOrganizationId: serviceRow.organizationId,
          status: "assigned",
          customerId: session?.role === "customer" ? session.userId : undefined,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          title: input.title,
          description: input.description,
          locale: normalizeLocale(input.locale),
          addressText: input.addressText,
          latitude: input.latitude?.toString(),
          longitude: input.longitude?.toString(),
          details: requestDetails,
        })
        .returning();
      if(couponEvaluation?.couponId){
        if(!session||session.role!=="customer"){await db.delete(serviceRequests).where(eq(serviceRequests.id,created.id));return errorResponse("Customer session is required to redeem coupon.",401,{code:"COUPON_CUSTOMER_REQUIRED"})}
        try{
          await restaurantCouponService.redeem({
            organizationId:serviceRow.organizationId,couponId:couponEvaluation.couponId,customerId:session.userId,requestId:created.id,
            itemSubtotalBeforeCoupon:couponEvaluation.itemSubtotalBeforeCoupon,expectedDiscount:couponEvaluation.discountAmount,
          });
        }catch(error){
          await db.delete(serviceRequests).where(eq(serviceRequests.id,created.id));
          const code=error instanceof Error?error.message:"COUPON_REDEMPTION_FAILED";
          return errorResponse("Coupon became unavailable before order confirmation.",409,{code});
        }
      }
      await db.insert(serviceRequestStatusHistory).values({
        requestId: created.id,
        toStatus: "assigned",
        note: `Request routed directly to partner: ${serviceRow.organizationName ?? serviceRow.organizationId}`,
      });
      try { await paymentService.ensureForRequest(created.id, typeof input.details?.paymentMethod === "string" ? input.details.paymentMethod : "cash_on_delivery"); }
      catch (paymentError) { console.error("payment initialization failed", paymentError); }
      return json({
        ok: true,
        data: created,
        routing: {
          mode: "direct_partner",
          organizationId: serviceRow.organizationId,
          organizationName: serviceRow.organizationName,
          organizationCode: serviceRow.organizationCode,
        },
      }, { status: 201 });
    }

    return errorResponse("A serviceId linked to an active partner is required.", 422);
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 422, error.details);
    console.error(error);
    return errorResponse("Unable to create service request.", 500);
  }
}
