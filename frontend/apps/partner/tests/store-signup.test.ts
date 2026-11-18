// Store sign-up form model: per-service questions, validation, and the notes round trip Admin reads.
// Run: cd frontend/apps/partner && npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { composeNotes, emptyForm, formFromApplication, submitPayload, validateStep } from "../app/onboarding/form";
import { SIGNUP_QUESTIONS, STORE_MODULES, dominantModule, storeModuleOf } from "../app/_lib/store-modules";

const carRental = {
  ...emptyForm(),
  businessName: "Xe Hỷ",
  businessType: "car-rental" as const,
  intro: "Đưa đón sân bay",
  email: "a@b.vn",
  answers: { vehicleKinds: ["scooter", "car"], fleet: "12", driver: "both" },
};

test("service answers are written first, in Vietnamese, for Admin", () => {
  assert.equal(composeNotes(carRental), "Loại xe: Xe máy, Ô tô 4–7 chỗ\nSố xe đang có: 12\nHình thức thuê: Cả hai\nGiới thiệu: Đưa đón sân bay\nEmail: a@b.vn");
});

test("editing an application reads the answers back", () => {
  const back = formFromApplication({ id: "x", role: "partner", status: "rejected", businessName: "Xe Hỷ", businessType: "car-rental", notes: composeNotes(carRental) });
  assert.deepEqual(back.answers, carRental.answers);
  assert.equal(back.intro, "Đưa đón sân bay");
  assert.equal(back.email, "a@b.vn");
});

test("each service checks its own required questions", () => {
  assert.deepEqual(validateStep("service", { ...carRental, answers: { fleet: "x" } }), { "q.vehicleKinds": "choose", "q.fleet": "number", "q.driver": "choose" });
  assert.deepEqual(validateStep("service", carRental), {});
  for (const service of STORE_MODULES) {
    const required = SIGNUP_QUESTIONS[service].filter((q) => q.required).map((q) => `q.${q.key}`);
    assert.ok(required.length > 0, `${service} asks at least one required question`);
    assert.deepEqual(Object.keys(validateStep("service", { ...emptyForm(), businessType: service })).sort(), required.sort());
  }
});

test("free-text notes from before the wizard stay untouched", () => {
  const legacy = formFromApplication({ id: "y", role: "partner", status: "submitted", businessType: "food", notes: "Quán mở 7h" });
  assert.equal(legacy.notes, "Quán mở 7h");
  assert.deepEqual(legacy.answers, {});
});

test("switching service keeps only the chosen service's answers", () => {
  assert.equal(composeNotes({ ...carRental, businessType: "food" }), "Giới thiệu: Đưa đón sân bay\nEmail: a@b.vn");
  assert.equal(submitPayload(carRental).businessType, "car-rental");
});

test("store types from older data map to a service", () => {
  // Every type found on production stores (2026-11-17), with the module their catalogue uses.
  const production: [string, string][] = [
    ["food", "food"], ["restaurant", "food"], ["car-rental", "car-rental"], ["grocery-store", "market"],
    ["community-hub", "community"], ["translation-interpreting", "translation"], ["real-estate", "housing"],
    ["emergency-assistance", "emergency"], ["payment-assistance", "payment"], ["tour-operator", "travel"],
    ["travel", "travel"], ["visa-service", "visa"], ["life-service", "community"],
  ];
  for (const [type, module] of production) assert.equal(storeModuleOf(type), module, type);
  // Free text in Vietnamese / Chinese, and casing.
  assert.equal(storeModuleOf("Nhà hàng"), "food");
  assert.equal(storeModuleOf("Thuê xe tự lái"), "car-rental");
  assert.equal(storeModuleOf("Dịch thuật"), "translation");
  assert.equal(storeModuleOf("租房"), "housing");
  assert.equal(storeModuleOf("Real Estate"), "housing");
  assert.equal(storeModuleOf("money transfer"), "general");
  // Nothing to go on: the workspace reads the catalogue instead.
  assert.equal(storeModuleOf("Tech"), "general");
  assert.equal(storeModuleOf(undefined), null);
});

test("an unknown store type falls back to the module most of its catalogue uses", () => {
  assert.equal(dominantModule(["food", "food", "market", null]), "food");
  assert.equal(dominantModule(["bogus", undefined]), null);
  assert.equal(dominantModule([]), null);
});
