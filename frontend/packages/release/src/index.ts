export const ZHAOXI_RELEASE = Object.freeze({
  version: "15.0.0",
  channel: "beta",
  architecture: "foundation-14-locked",
  apps: ["customer","partner","admin","driver"] as const,
});
export type ZhaoXiReleaseChannel = typeof ZHAOXI_RELEASE.channel;
export type ZhaoXiAppName = typeof ZHAOXI_RELEASE.apps[number];
export type HealthState = "healthy" | "degraded" | "unavailable";
export function healthState(ok:boolean, latencyMs=0):HealthState {
  if (!ok) return "unavailable";
  return latencyMs > 3000 ? "degraded" : "healthy";
}
