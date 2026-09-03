import{authenticatedSession}from"@/lib/auth-request";import{failure,success}from"@/lib/core/api-response";import{mobileNavigationContract,type ActiveNavigationRole}from"@/lib/core/mobile-navigation-contract";
export const dynamic="force-dynamic";
export async function GET(r:Request){const s=await authenticatedSession(r);if(!s||!["customer","partner","admin"].includes(s.role))return failure("Authentication required.",401,undefined,"AUTH_REQUIRED");return success(mobileNavigationContract(s.role as ActiveNavigationRole))}
