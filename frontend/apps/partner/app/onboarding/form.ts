/**
 * Store sign-up form model: fields, per-step validation, and how the extra fields that the
 * onboarding API has no column for (intro, email, licence) travel inside `notes`.
 * Pure functions only, so the wizard UI stays thin and this file is easy to test.
 */

import { ALL_QUESTION_LABELS, SIGNUP_QUESTIONS, STORE_MODULES, answersFromLines, answersToLines, isStoreModule, questionError, type SignupAnswers, type StoreModule } from "../_lib/store-modules";

/** Service modules a store can sign up for (shared with the workspace, see _lib/store-modules). */
export const MODULES = STORE_MODULES;
export type ModuleCode = StoreModule;
export const isModule = isStoreModule;

export const CITIES = ["Đà Nẵng", "Hội An", "Huế", "Quảng Nam"] as const;

export const STEPS = ["store", "service", "location", "contact", "review"] as const;
export type StepKey = (typeof STEPS)[number];

export const LIMITS = { businessName: 180, intro: 300, city: 120, addressText: 500, contactName: 120, email: 120, license: 60, notes: 400 } as const;

export type OnboardingForm = {
  businessName: string;
  intro: string;
  businessType: ModuleCode | "";
  city: string;
  addressText: string;
  latitude: number | null;
  longitude: number | null;
  contactName: string;
  phone: string;
  email: string;
  license: string;
  notes: string;
  /** Answers to the questions of the chosen service (SIGNUP_QUESTIONS), keyed by question. */
  answers: SignupAnswers;
  agree: boolean;
};

export type FieldKey = Exclude<keyof OnboardingForm, "latitude" | "longitude" | "answers">;
/** Service questions report under `q.<key>`. */
export type ErrorKey = FieldKey | `q.${string}`;
export type ErrorCode = "required" | "choose" | "tooShort" | "tooLong" | "phone" | "email" | "agree" | "number";
export type FieldErrors = Partial<Record<ErrorKey, ErrorCode>>;

export type Application = {
  id: string;
  role: string;
  status: string;
  reviewNote?: string | null;
  displayName?: string | null;
  phone?: string | null;
  city?: string | null;
  businessName?: string | null;
  businessType?: string | null;
  addressText?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  notes?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
};
export type PartnerOrganization = { id: string; name: string; code: string; type: string; applicationId?: string | null };

/** Mirrors backend PARTNER_OPEN_APPLICATION_LIMIT: applications waiting for review per account. */
export const OPEN_APPLICATION_LIMIT = 3;
/** Which application the wizard writes: a new store, or an existing application (fix / update). */
export type Target = { kind: "new" } | { kind: "edit"; app: Application };
export const partnerApplications = (status: OnboardingStatus) => status.applications.filter((a) => a.role === "partner");
export const openApplications = (status: OnboardingStatus) => partnerApplications(status).filter((a) => a.status !== "approved");
export type OnboardingStatus = { applications: Application[]; partnerOrganizations: PartnerOrganization[] };

export const emptyForm = (): OnboardingForm => ({
  businessName: "",
  intro: "",
  businessType: "",
  city: CITIES[0],
  addressText: "",
  latitude: null,
  longitude: null,
  contactName: "",
  phone: "",
  email: "",
  license: "",
  notes: "",
  answers: {},
  agree: false,
});

const text = (value: string) => value.trim();

function length(errors: FieldErrors, key: FieldKey, value: string, min: number, max: number, required = true) {
  const v = text(value);
  if (!v) { if (required) errors[key] = "required"; return; }
  if (v.length < min) errors[key] = "tooShort";
  else if (v.length > max) errors[key] = "tooLong";
}

/** Digits and a leading "+" only. */
export const normalizePhone = (value: string) => value.replace(/[\s.\-()]/g, "");
/** Vietnamese mobile/landline (0xxxxxxxxx, 84xxxxxxxxx) or any international number (+xxxxxxxx). */
export const isValidPhone = (value: string) => /^(0\d{9,10}|84\d{9,10}|\+\d{8,15})$/.test(normalizePhone(value));
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export function validateStep(step: StepKey, form: OnboardingForm): FieldErrors {
  const errors: FieldErrors = {};
  if (step === "store") {
    length(errors, "businessName", form.businessName, 2, LIMITS.businessName);
    length(errors, "intro", form.intro, 0, LIMITS.intro, false);
  }
  if (step === "service") {
    if (!isModule(form.businessType)) errors.businessType = "required";
    else for (const question of SIGNUP_QUESTIONS[form.businessType]) {
      const problem = questionError(question, form.answers[question.key]);
      if (problem) errors[`q.${question.key}`] = problem;
    }
  }
  if (step === "location") {
    length(errors, "city", form.city, 2, LIMITS.city);
    length(errors, "addressText", form.addressText, 5, LIMITS.addressText);
  }
  if (step === "contact") {
    length(errors, "contactName", form.contactName, 2, LIMITS.contactName);
    if (!text(form.phone)) errors.phone = "required";
    else if (!isValidPhone(form.phone)) errors.phone = "phone";
    if (text(form.email) && !isValidEmail(form.email)) errors.email = "email";
    else length(errors, "email", form.email, 0, LIMITS.email, false);
    length(errors, "license", form.license, 0, LIMITS.license, false);
    length(errors, "notes", form.notes, 0, LIMITS.notes, false);
  }
  if (step === "review" && !form.agree) errors.agree = "agree";
  return errors;
}

/** First step (in order) that still has errors, or -1 when the whole form is valid. */
export function firstInvalidStep(form: OnboardingForm): number {
  return STEPS.findIndex((step) => Object.keys(validateStep(step, form)).length > 0);
}

/*
 * The API stores one free-text `notes` column (≤1000 chars). The wizard keeps intro/email/licence
 * as separate fields and writes them as labelled lines, readable as-is in the Admin review list.
 * Labels are Vietnamese because Admin reviews in Vietnamese; they are parsed back when editing.
 */
const NOTE_LABELS = { intro: "Giới thiệu", email: "Email", license: "Giấy phép KD / MST", notes: "Ghi chú" } as const;
type NoteKey = keyof typeof NOTE_LABELS;

export function composeNotes(form: Pick<OnboardingForm, NoteKey | "businessType" | "answers">): string {
  const answers = isModule(form.businessType) ? answersToLines(form.businessType, form.answers) : [];
  const own = (Object.keys(NOTE_LABELS) as NoteKey[])
    .map((key) => [key, text(form[key])] as const)
    .filter(([, value]) => value)
    .map(([key, value]) => `${NOTE_LABELS[key]}: ${value}`);
  // Service answers first: they are what Admin checks before anything else.
  return [...answers, ...own].join("\n").slice(0, 1000);
}

export function parseNotes(notes: string | null | undefined, module?: ModuleCode | ""): Pick<OnboardingForm, NoteKey | "answers"> {
  const out: Pick<OnboardingForm, NoteKey | "answers"> = { intro: "", email: "", license: "", notes: "", answers: {} };
  const raw = (notes || "").trim();
  if (!raw) return out;
  const byLabel = new Map<string, NoteKey>((Object.keys(NOTE_LABELS) as NoteKey[]).map((key) => [NOTE_LABELS[key], key]));
  let current: NoteKey | null = null;
  let matched = false;
  const answerLines = new Map<string, string>();
  for (const line of raw.split(/\r?\n/)) {
    const hit = /^([^:]{2,40}):\s?(.*)$/.exec(line);
    if (hit && ALL_QUESTION_LABELS.has(hit[1].trim())) { answerLines.set(hit[1].trim(), hit[2].trim()); matched = true; current = null; continue; }
    const key = hit ? byLabel.get(hit[1].trim()) : undefined;
    if (key && hit) { current = key; matched = true; out[key] = hit[2]; continue; }
    if (current) out[current] = out[current] ? `${out[current]}\n${line}` : line;
    else out.notes = out.notes ? `${out.notes}\n${line}` : line;
  }
  // Older free-text notes (written before this wizard) stay in "notes" untouched.
  if (!matched) return { intro: "", email: "", license: "", notes: raw.slice(0, LIMITS.notes), answers: {} };
  if (module) out.answers = answersFromLines(module, answerLines);
  return out;
}

const toNumber = (value: unknown) => { const n = Number(value); return value !== null && value !== undefined && value !== "" && Number.isFinite(n) ? n : null; };

/** Pre-fills the wizard from an application already sent (to fix a rejected one or update a pending one). */
export function formFromApplication(app: Application): OnboardingForm {
  return {
    ...emptyForm(),
    businessName: app.businessName || "",
    businessType: isModule(app.businessType) ? app.businessType : "",
    city: app.city || CITIES[0],
    addressText: app.addressText || "",
    latitude: toNumber(app.latitude),
    longitude: toNumber(app.longitude),
    contactName: app.displayName || "",
    phone: app.phone || "",
    ...parseNotes(app.notes, isModule(app.businessType) ? app.businessType : ""),
  };
}

/**
 * Request body for POST /api/platform-onboarding/submit. `applicationId` edits that application,
 * `newApplication` starts another store; older backends ignore both and keep their single application.
 */
export function submitPayload(form: OnboardingForm, target: Target = { kind: "new" }) {
  return {
    role: "partner" as const,
    ...(target.kind === "edit" ? { applicationId: target.app.id } : { newApplication: true }),
    displayName: text(form.contactName),
    phone: normalizePhone(form.phone),
    city: text(form.city),
    businessName: text(form.businessName),
    businessType: form.businessType,
    addressText: text(form.addressText),
    latitude: form.latitude ?? undefined,
    longitude: form.longitude ?? undefined,
    notes: composeNotes(form),
  };
}

/* ---------- draft (per account, this browser only) ---------- */
export type Draft = { form: OnboardingForm; step: number; savedAt: number };
/** One draft per account and target: the new-store form and each application being fixed are kept apart. */
export const draftSlot = (target: Target) => (target.kind === "edit" ? target.app.id : "new");
const draftKey = (userId?: string, slot = "new") => `zx-partner-onboarding-draft:v2:${userId || "me"}:${slot}`;

export function loadDraft(userId?: string, slot?: string): Draft | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(draftKey(userId, slot)) || "null") as Draft | null;
    if (!value || typeof value !== "object" || !value.form) return null;
    // Drafts older than 30 days are dropped rather than resurfacing stale details.
    if (Date.now() - Number(value.savedAt || 0) > 30 * 24 * 3600 * 1000) { clearDraft(userId, slot); return null; }
    const form = { ...emptyForm(), ...value.form, answers: { ...(value.form.answers || {}) }, agree: false };
    if (!isModule(form.businessType)) form.businessType = "";
    return { form, step: Math.min(Math.max(0, Number(value.step) || 0), STEPS.length - 1), savedAt: Number(value.savedAt) };
  } catch {
    return null;
  }
}

export function saveDraft(userId: string | undefined, slot: string, form: OnboardingForm, step: number): number | null {
  try {
    const savedAt = Date.now();
    window.localStorage.setItem(draftKey(userId, slot), JSON.stringify({ form: { ...form, agree: false }, step, savedAt } satisfies Draft));
    return savedAt;
  } catch {
    return null;
  }
}

export function clearDraft(userId?: string, slot?: string) {
  try { window.localStorage.removeItem(draftKey(userId, slot)); } catch { /* storage blocked */ }
}

/** True when the visitor typed something worth keeping. */
export const hasContent = (form: OnboardingForm) => Boolean(text(form.businessName) || form.businessType || text(form.addressText) || text(form.contactName) || text(form.phone) || text(form.intro) || text(form.notes));
