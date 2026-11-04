import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickPartnerPushTargets, type PartnerPushDeviceRow } from "@/lib/services/partner-mobile-push-targets";

const at = (minute: number) => new Date(Date.UTC(2026, 10, 4, 8, minute));
const row = (id: string, token: string, deviceId: string | null, minute: number): PartnerPushDeviceRow => ({ id, token, deviceId, updatedAt: at(minute) });

describe("pickPartnerPushTargets", () => {
  it("sends once per token", () => {
    const picked = pickPartnerPushTargets([row("a", "T1", null, 1), row("b", "T1", null, 2), row("c", "T2", null, 3)]);
    assert.deepEqual(picked.map((x) => x.token).sort(), ["T1", "T2"]);
  });

  it("standalone Partner app and ZhaoXi host on one iPhone (same identifierForVendor): the newest registration wins", () => {
    const standalone = row("partner-app", "ExponentPushToken[partner]", "IDFV-1", 5);
    const host = row("host-app", "ExponentPushToken[host]", "IDFV-1", 9);
    assert.deepEqual(pickPartnerPushTargets([standalone, host]).map((x) => x.id), ["host-app"]);
    const reopened = { ...standalone, updatedAt: at(12) };
    assert.deepEqual(pickPartnerPushTargets([reopened, host]).map((x) => x.id), ["partner-app"]);
  });

  it("different devices, missing or generic device ids are never merged", () => {
    const picked = pickPartnerPushTargets([
      row("a", "T1", "IDFV-1", 1),
      row("b", "T2", "IDFV-2", 2),
      row("c", "T3", null, 3),
      row("d", "T4", null, 4),
      row("e", "T5", "partner-ios", 5),
      row("f", "T6", "partner-ios", 6),
      row("g", "T7", "  ", 7),
    ]);
    assert.equal(picked.length, 7);
  });
});
