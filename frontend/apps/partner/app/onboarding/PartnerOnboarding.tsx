"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { readSession, refreshServerSession, updateSession, useZhaoXiSession } from "@zhaoxi/auth";
import { useZhaoXiLocale, type ZhaoXiLocale } from "@zhaoxi/i18n";
import { LocationPicker, type LocationPoint } from "@zhaoxi/onboarding";
import { onboardingCopy } from "./copy";
import {
  CITIES, LIMITS, MODULES, STEPS,
  clearDraft, emptyForm, firstInvalidStep, formFromApplication, hasContent, isModule, loadDraft, saveDraft, submitPayload, validateStep,
  OPEN_APPLICATION_LIMIT, draftSlot, openApplications, partnerApplications,
  type Application, type ErrorCode, type FieldErrors, type FieldKey, type OnboardingForm, type OnboardingStatus, type PartnerOrganization, type Target,
} from "./form";
import { ServiceArt } from "./ServiceArt";
import { SIGNUP_QUESTIONS, storeModuleOf, type SignupQuestion } from "../_lib/store-modules";
import styles from "./onboarding.module.css";

type Load = { state: "loading" } | { state: "error"; auth: boolean } | { state: "ready"; data: OnboardingStatus };
type Copy = (typeof onboardingCopy)[ZhaoXiLocale];

const timeOf = (ms: number, locale: ZhaoXiLocale) => new Date(ms).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
const dateOf = (value: string | null | undefined, locale: ZhaoXiLocale) => {
  const t = value ? Date.parse(value) : NaN;
  return Number.isFinite(t) ? new Date(t).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
};
async function loadStatus(): Promise<Load> {
  try {
    const response = await fetch("/api/platform-onboarding/status", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) return { state: "error", auth: response.status === 401 || response.status === 403 };
    return { state: "ready", data: { applications: payload.data?.applications || [], partnerOrganizations: payload.data?.partnerOrganizations || [] } };
  } catch {
    return { state: "error", auth: false };
  }
}
/** Artwork for a store type, matched the same way as the workspace (free-text types included). */
const artOf = (type: string | null | undefined) => { const module = storeModuleOf(type); return module === "community" ? "people" : module === "emergency" ? "shield" : module && isModule(module) ? module : "store"; };
const serviceLabel = (t: Copy, type: string | null | undefined) => { const module = storeModuleOf(type); return module && isModule(module) ? t.modules[module].label : null; };

/**
 * Store sign-up for ZhaoXi Partner. One account can run several stores, so the page is a hub:
 * the stores it already runs, the applications still in review (pending / needs changes), and a
 * "register a new store" entry that is always there. The five-step wizard either starts a new
 * application or fixes an existing one. Endpoints: /api/platform-onboarding/status|submit.
 */
export default function PartnerOnboarding() {
  const { locale } = useZhaoXiLocale();
  const t = onboardingCopy[locale];
  const session = useZhaoXiSession();
  const userId = session?.userId;

  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const fetchStatus = useCallback(async () => setLoad(await loadStatus()), []);
  useEffect(() => {
    let active = true;
    void loadStatus().then((next) => { if (active) setLoad(next); });
    return () => { active = false; };
  }, []);

  if (load.state === "loading") return <div className={styles.center}><span className={styles.spinner} aria-hidden="true" /><p>{t.status.loading}</p></div>;
  if (load.state === "error") return <div className={`${styles.card} ${styles.center}`} role="alert"><p>{load.auth ? t.status.authError : t.status.loadError}</p>{!load.auth && <button type="button" className="zx-btn zx-btn--glass" onClick={() => { setLoad({ state: "loading" }); void fetchStatus(); }}>{t.a.retry}</button>}</div>;

  const stores = load.data.partnerOrganizations;
  const open = openApplications(load.data);
  const firstTime = stores.length === 0 && partnerApplications(load.data).length === 0;
  // A first-time visitor lands straight in the form; everyone else picks what to do from the hub.
  const wizardTarget: Target | null = target || (firstTime ? { kind: "new" } : null);
  const canApply = open.length < OPEN_APPLICATION_LIMIT;
  const startNew = () => { setNotice(null); setTarget({ kind: "new" }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const edit = (app: Application) => { setNotice(null); setTarget({ kind: "edit", app }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (wizardTarget) {
    return <div className={styles.flow}>
      {wizardTarget.kind === "edit" && <p className={styles.editing}>{t.hub.editing(wizardTarget.app.businessName || t.review.empty)}</p>}
      <Wizard
        key={`${userId || "me"}:${draftSlot(wizardTarget)}`}
        t={t}
        locale={locale}
        userId={userId}
        target={wizardTarget}
        onCancel={firstTime ? undefined : () => setTarget(null)}
        onSubmitted={async () => { setTarget(null); setNotice({ tone: "ok", text: t.status.submitted }); await fetchStatus(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      />
    </div>;
  }

  return <div className={styles.flow}>
    {notice && <div className={notice.tone === "ok" ? styles.noticeOk : styles.noticeError} role="status">{notice.text}</div>}
    {stores.length > 0 && <StoresCard t={t} stores={stores} />}
    <section className={`${styles.card} ${styles.newStore}`}>
      <div className={styles.newStoreArt}><ServiceArt code="store" size={56} /></div>
      <div className={styles.newStoreCopy}><h2>{t.hub.newTitle}</h2><p>{canApply ? t.hub.newBody : t.hub.limit(OPEN_APPLICATION_LIMIT)}</p></div>
      <button type="button" className="zx-btn zx-btn--primary" onClick={startNew} disabled={!canApply}>＋ {t.hub.newButton}</button>
    </section>
    {open.length > 0 && <h2 className={styles.sectionTitle}>{t.hub.inReview}</h2>}
    {open.map((app) => app.status === "rejected"
      ? <RejectedCard key={app.id} t={t} app={app} locale={locale} onEdit={() => edit(app)} />
      : <PendingCard key={app.id} t={t} app={app} locale={locale} onEdit={() => edit(app)} />)}
  </div>;
}

/* ---------------------------------------------------------------- hub cards */

function Summary({ t, app, locale }: { t: Copy; app: Application; locale: ZhaoXiLocale }) {
  const service = isModule(app.businessType) ? t.modules[app.businessType].label : app.businessType || t.review.empty;
  const rows: [string, ReactNode][] = [
    [t.summary.service, service],
    [t.summary.address, [app.addressText, app.city].filter(Boolean).join(" · ") || t.review.empty],
    [t.summary.contact, [app.displayName, app.phone].filter(Boolean).join(" · ") || t.review.empty],
  ];
  const sentAt = dateOf(app.submittedAt || app.updatedAt, locale);
  if (sentAt) rows.push([t.pending.sentAt, sentAt]);
  return <dl className={styles.summary}>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

function StatusHead({ chip, tone, title, body, art }: { chip: string; tone: "amber" | "red" | "green"; title: string; body: string; art: string }) {
  return <div className={styles.statusHead}>
    <div className={styles.statusArt}><ServiceArt code={art} size={64} /></div>
    <div><span className={`zx-chip zx-chip--${tone}`}>{chip}</span><h2>{title}</h2><p>{body}</p></div>
  </div>;
}

function PendingCard({ t, app, locale, onEdit }: { t: Copy; app: Application; locale: ZhaoXiLocale; onEdit: () => void }) {
  return <section className={styles.card}>
    <StatusHead chip={t.pending.chip} tone="amber" title={app.businessName || t.pending.title} body={t.pending.body} art={artOf(app.businessType)} />
    <ol className={styles.timeline}>
      <li data-state="done"><i>✓</i>{t.pending.sent}</li>
      <li data-state="current"><i />{t.pending.reviewing}</li>
      <li data-state="todo"><i />{t.pending.open}</li>
    </ol>
    <Summary t={t} app={app} locale={locale} />
    <div className={styles.cardActions}><button type="button" className="zx-btn zx-btn--glass" onClick={onEdit}>{t.pending.update}</button></div>
  </section>;
}

function RejectedCard({ t, app, locale, onEdit }: { t: Copy; app: Application; locale: ZhaoXiLocale; onEdit: () => void }) {
  return <section className={styles.card}>
    <StatusHead chip={t.rejected.chip} tone="red" title={app.businessName || t.rejected.title} body={t.rejected.body} art={artOf(app.businessType)} />
    {app.reviewNote && <blockquote className={styles.reviewNote}><b>{t.rejected.note}</b><p>{app.reviewNote}</p></blockquote>}
    <Summary t={t} app={app} locale={locale} />
    <div className={styles.cardActions}><button type="button" className="zx-btn zx-btn--primary" onClick={onEdit}>{t.rejected.fix}</button></div>
  </section>;
}

/** A customer session (e.g. opened from the app) switches to its partner role before entering the workspace. */
async function enterPartnerWorkspace(store: PartnerOrganization) {
  const storeId = store.id;
  if (readSession()?.role !== "partner") {
    const created = await fetch("/api/platform-account/role-switch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetRole: "partner" }) });
    const createdJson = await created.json().catch(() => null);
    const url = String(createdJson?.data?.url || "");
    const code = new URLSearchParams(url.split("#")[1] || "").get("code");
    if (!created.ok || !code) throw new Error(createdJson?.error?.code || "ROLE_SWITCH_FAILED");
    const exchanged = await fetch("/api/platform-account/role-switch/exchange", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, deviceName: navigator.userAgent.slice(0, 180) }) });
    const exchangedJson = await exchanged.json().catch(() => null);
    if (!exchanged.ok || !exchangedJson?.ok) throw new Error(exchangedJson?.error?.code || "ROLE_SWITCH_EXCHANGE_FAILED");
    await refreshServerSession();
  }
  // Same steps as the workspace store switcher, so "Manage" opens this store and not the first one.
  if (readSession()?.organizationId !== storeId) {
    const switched = await fetch("/api/auth/unified/session/organization", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ organizationId: store.id }) }).catch(() => null);
    updateSession({ organizationId: store.id, organizationName: store.name, organizationCode: store.code, organizationType: store.type });
    if (!switched?.ok) console.warn("ZHAOXI_ORGANIZATION_SWITCH_FALLBACK");
  }
  try { window.localStorage.setItem("zhaoxi.partner.organizationId", storeId); } catch { /* storage blocked */ }
  window.location.assign("/catalog");
}

function StoresCard({ t, stores }: { t: Copy; stores: PartnerOrganization[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const embedded = typeof document !== "undefined" && document.documentElement.dataset.zxEmbed === "app";
  const open = (id: string) => { setBusy(id); setFailed(false); enterPartnerWorkspace(stores.find((s) => s.id === id) || stores[0]).catch(() => { setFailed(true); setBusy(null); }); };
  return <section className={styles.card}>
    <StatusHead chip={t.approved.chip} tone="green" title={t.hub.stores(stores.length)} body={t.approved.body} art={artOf(stores[0]?.type)} />
    <ul className={styles.storeList}>{stores.map((store) => <li key={store.id}>
      <span className={styles.storeArt}><ServiceArt code={artOf(store.type)} size={40} /></span>
      <span className={styles.storeName}><b>{store.name}</b><small>{[serviceLabel(t, store.type), store.code].filter(Boolean).join(" · ")}</small></span>
      <button type="button" className="zx-btn zx-btn--dark" disabled={busy !== null} onClick={() => open(store.id)}>{busy === store.id ? t.approved.opening : t.hub.manage}</button>
    </li>)}</ul>
    {embedded && <p className={styles.muted}>{t.approved.inApp}</p>}
    {failed && <p className={styles.errorText} role="alert">{t.approved.openFailed}</p>}
  </section>;
}

/* ---------------------------------------------------------------- wizard */

function Wizard({ t, locale, userId, target, onCancel, onSubmitted }: { t: Copy; locale: ZhaoXiLocale; userId?: string; target: Target; onCancel?: () => void; onSubmitted: () => Promise<void> }) {
  const slot = draftSlot(target);
  const app = target.kind === "edit" ? target.app : null;
  const initial = useMemo(() => {
    const draft = typeof window === "undefined" ? null : loadDraft(userId, slot);
    if (draft) return { form: draft.form, step: draft.step, restoredAt: draft.savedAt };
    const session = typeof window === "undefined" ? null : readSession();
    const base = app ? formFromApplication(app) : { ...emptyForm(), contactName: session?.displayName && session.displayName !== "WeChat user" ? session.displayName : "", phone: session?.phone || "" };
    return { form: base, step: 0, restoredAt: null as number | null };
    // The wizard mounts once per account; later status refreshes must not reset what is being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState<OnboardingForm>(initial.form);
  const [step, setStep] = useState(initial.step);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [savedAt, setSavedAt] = useState<number | null>(initial.restoredAt);
  const [restored, setRestored] = useState(initial.restoredAt !== null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [cityOther, setCityOther] = useState(() => !CITIES.includes(initial.form.city as (typeof CITIES)[number]));
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Only what the visitor typed is worth a draft; prefilled contact details alone are not.
  const dirty = useRef(false);

  const stepKey = STEPS[step];
  const copyStep = t.steps[stepKey];

  // Autosave (debounced) once the visitor has typed something.
  useEffect(() => {
    if (!dirty.current || !hasContent(form)) return;
    const timer = window.setTimeout(() => { const at = saveDraft(userId, slot, form, step); if (at) setSavedAt(at); }, 500);
    return () => window.clearTimeout(timer);
  }, [form, step, userId, slot]);

  // Move focus to the step title so keyboard and screen-reader users land on the new step.
  const goTo = (next: number) => {
    setStep(next);
    setErrors({});
    setSubmitError("");
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const set = <K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) => {
    dirty.current = true;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => { const next = { ...prev }; delete next[key as FieldKey]; return next; });
  };

  // Accepts an updater so quick successive taps on choices build on the latest answer.
  const setAnswer = (key: string, value: string | string[] | ((previous: string | string[] | undefined) => string | string[])) => {
    dirty.current = true;
    setForm((prev) => ({ ...prev, answers: { ...prev.answers, [key]: typeof value === "function" ? value(prev.answers[key]) : value } }));
    setErrors((prev) => { if (!(`q.${key}` in prev)) return prev; const copy = { ...prev }; delete copy[`q.${key}`]; return copy; });
  };

  const next = () => {
    const found = validateStep(stepKey, form);
    if (Object.keys(found).length) {
      setErrors(found);
      const first = Object.keys(found)[0];
      requestAnimationFrame(() => document.getElementById(`zx-onb-${first}`)?.focus());
      return;
    }
    goTo(Math.min(step + 1, STEPS.length - 1));
  };

  const submit = async () => {
    const invalid = firstInvalidStep(form);
    if (invalid !== -1 && invalid !== STEPS.length - 1) { goTo(invalid); setErrors(validateStep(STEPS[invalid], form)); setSubmitError(t.review.checkFirst); return; }
    const reviewErrors = validateStep("review", form);
    if (Object.keys(reviewErrors).length) { setErrors(reviewErrors); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/platform-onboarding/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(submitPayload(form, target)) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error?.message || "");
      clearDraft(userId, slot);
      await onSubmitted();
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setSubmitError(t.apiErrors[code] || (code ? `${t.status.submitFailed} (${code})` : t.status.submitFailed));
      setSubmitting(false);
    }
  };

  const restart = () => {
    clearDraft(userId, slot);
    dirty.current = false;
    setForm(app ? formFromApplication(app) : emptyForm());
    setSavedAt(null);
    setRestored(false);
    setCityOther(false);
    goTo(0);
  };

  const point: LocationPoint | null = form.latitude !== null && form.longitude !== null ? { latitude: form.latitude, longitude: form.longitude } : null;
  const last = step === STEPS.length - 1;

  return <div className={styles.wizard}>
    <aside className={styles.rail} aria-label={t.stepOf(step + 1, STEPS.length)}>
      <ol className={styles.stepper}>
        {STEPS.map((key, index) => {
          const state = index === step ? "current" : index < step ? "done" : "todo";
          return <li key={key} data-state={state}>
            <button type="button" disabled={index > step} onClick={() => goTo(index)} aria-current={state === "current" ? "step" : undefined}>
              <i>{state === "done" ? "✓" : index + 1}</i><span>{t.steps[key].label}</span>
            </button>
          </li>;
        })}
      </ol>
      <div className={styles.progress} aria-hidden="true"><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
    </aside>

    <section className={`${styles.card} ${styles.stepCard}`}>
      {restored && savedAt && <div className={styles.draftBanner}>
        <span>{t.a.draftRestored(timeOf(savedAt, locale))}</span>
        <button type="button" className="zx-btn zx-btn--ghost" onClick={restart}>{t.a.restart}</button>
      </div>}
      <header className={styles.stepHead}>
        <small>{t.stepOf(step + 1, STEPS.length)}</small>
        <h2 ref={headingRef} tabIndex={-1}>{copyStep.title}</h2>
        <p>{copyStep.desc}</p>
      </header>

      {stepKey === "store" && <div className={styles.fields}>
        <Field id="businessName" label={t.f.businessName} hint={t.f.businessNameHint} error={errors.businessName} t={t} count={[form.businessName.length, LIMITS.businessName]}>
          <input id="zx-onb-businessName" value={form.businessName} maxLength={LIMITS.businessName} autoComplete="organization" placeholder={t.f.businessNamePh} onChange={(e) => set("businessName", e.target.value)} aria-invalid={Boolean(errors.businessName)} aria-describedby="zx-onb-businessName-msg" />
        </Field>
        <Field id="intro" label={t.f.intro} optional={t.f.optional} error={errors.intro} t={t} count={[form.intro.length, LIMITS.intro]}>
          <textarea id="zx-onb-intro" rows={4} value={form.intro} maxLength={LIMITS.intro} placeholder={t.f.introPh} onChange={(e) => set("intro", e.target.value)} aria-invalid={Boolean(errors.intro)} aria-describedby="zx-onb-intro-msg" />
        </Field>
      </div>}

      {stepKey === "service" && <fieldset className={styles.modules} aria-describedby="zx-onb-businessType-msg">
        <legend className={styles.srOnly}>{copyStep.title}</legend>
        {MODULES.map((code, index) => <label key={code} className={styles.module} data-selected={form.businessType === code}>
          <input id={index === 0 ? "zx-onb-businessType" : undefined} type="radio" name="businessType" value={code} checked={form.businessType === code} onChange={() => { set("businessType", code); requestAnimationFrame(() => document.getElementById("zx-onb-questions")?.scrollIntoView({ behavior: "smooth", block: "center" })); }} />
          <span className={styles.moduleArt}><ServiceArt code={code} size={52} /></span>
          <b>{t.modules[code].label}</b>
          <small>{t.modules[code].desc}</small>
          <i className={styles.moduleCheck} aria-hidden="true">✓</i>
        </label>)}
        <p id="zx-onb-businessType-msg" className={styles.errorText} role={errors.businessType ? "alert" : undefined}>{errors.businessType ? t.err[errors.businessType] : ""}</p>
      </fieldset>}
      {stepKey === "service" && isModule(form.businessType) && <section className={styles.questions} aria-labelledby="zx-onb-questions">
        <h3 id="zx-onb-questions"><ServiceArt code={form.businessType} size={30} />{t.questionsTitle(t.modules[form.businessType].label)}</h3>
        <div className={`${styles.fields} ${styles.twoCol}`}>
          {SIGNUP_QUESTIONS[form.businessType].map((question) => <QuestionField key={`${form.businessType}-${question.key}`} question={question} locale={locale} t={t} value={form.answers[question.key]} error={errors[`q.${question.key}`]} onChange={(value) => setAnswer(question.key, value)} />)}
        </div>
      </section>}

      {stepKey === "location" && <div className={styles.fields}>
        <Field id="city" label={t.f.city} error={errors.city} t={t}>
          <div className={styles.chips} role="radiogroup" aria-label={t.f.city}>
            {CITIES.map((city, index) => <button key={city} id={index === 0 ? "zx-onb-city" : undefined} type="button" role="radio" aria-checked={!cityOther && form.city === city} data-on={!cityOther && form.city === city} onClick={() => { setCityOther(false); set("city", city); }}>{city}</button>)}
            <button type="button" role="radio" aria-checked={cityOther} data-on={cityOther} onClick={() => { setCityOther(true); set("city", ""); }}>{t.f.cityOther}</button>
          </div>
          {cityOther && <input className={styles.mt8} value={form.city} maxLength={LIMITS.city} placeholder={t.f.cityOtherPh} autoComplete="address-level2" onChange={(e) => set("city", e.target.value)} aria-invalid={Boolean(errors.city)} aria-describedby="zx-onb-city-msg" />}
        </Field>
        <Field id="addressText" label={t.f.address} hint={t.f.addressHint} error={errors.addressText} t={t}>
          <div id="zx-onb-addressText" tabIndex={-1} className={styles.map}>
            <LocationPicker locale={locale} address={form.addressText} point={point} onAddress={(addressText) => set("addressText", addressText.slice(0, LIMITS.addressText))} onPoint={(p) => { dirty.current = true; setForm((prev) => ({ ...prev, latitude: p.latitude, longitude: p.longitude })); }} />
          </div>
        </Field>
        <p className={point ? styles.okText : styles.muted}>{point ? `✓ ${t.f.pointSet}` : t.f.pointMissing}</p>
      </div>}

      {stepKey === "contact" && <div className={`${styles.fields} ${styles.twoCol}`}>
        <Field id="contactName" label={t.f.contactName} error={errors.contactName} t={t}>
          <input id="zx-onb-contactName" value={form.contactName} maxLength={LIMITS.contactName} autoComplete="name" placeholder={t.f.contactNamePh} onChange={(e) => set("contactName", e.target.value)} aria-invalid={Boolean(errors.contactName)} aria-describedby="zx-onb-contactName-msg" />
        </Field>
        <Field id="phone" label={t.f.phone} hint={t.f.phoneHint} error={errors.phone} t={t}>
          <input id="zx-onb-phone" type="tel" inputMode="tel" value={form.phone} maxLength={24} autoComplete="tel" placeholder={t.f.phonePh} onChange={(e) => set("phone", e.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby="zx-onb-phone-msg" />
        </Field>
        <Field id="email" label={t.f.email} optional={t.f.optional} error={errors.email} t={t}>
          <input id="zx-onb-email" type="email" inputMode="email" value={form.email} maxLength={LIMITS.email} autoComplete="email" placeholder={t.f.emailPh} onChange={(e) => set("email", e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby="zx-onb-email-msg" />
        </Field>
        <Field id="license" label={t.f.license} optional={t.f.optional} hint={t.f.licenseHint} error={errors.license} t={t}>
          <input id="zx-onb-license" value={form.license} maxLength={LIMITS.license} placeholder={t.f.licensePh} onChange={(e) => set("license", e.target.value)} aria-invalid={Boolean(errors.license)} aria-describedby="zx-onb-license-msg" />
        </Field>
        <Field id="notes" label={t.f.notes} optional={t.f.optional} error={errors.notes} t={t} wide count={[form.notes.length, LIMITS.notes]}>
          <textarea id="zx-onb-notes" rows={3} value={form.notes} maxLength={LIMITS.notes} placeholder={t.f.notesPh} onChange={(e) => set("notes", e.target.value)} aria-invalid={Boolean(errors.notes)} aria-describedby="zx-onb-notes-msg" />
        </Field>
      </div>}

      {stepKey === "review" && <div className={styles.review}>
        <ReviewBlock title={t.steps.store.title} onEdit={() => goTo(0)} t={t} rows={[[t.f.businessName, form.businessName], [t.f.intro, form.intro]]} />
        <ReviewBlock title={t.steps.service.title} onEdit={() => goTo(1)} t={t} art={form.businessType || undefined} rows={[[t.summary.service, isModule(form.businessType) ? `${t.modules[form.businessType].label} · ${t.modules[form.businessType].desc}` : ""], ...(isModule(form.businessType) ? SIGNUP_QUESTIONS[form.businessType].map((question): [string, string] => [question.label[locale], answerText(question, form.answers[question.key], locale)]) : [])]} />
        <ReviewBlock title={t.steps.location.title} onEdit={() => goTo(2)} t={t} rows={[[t.f.city, form.city], [t.f.address, form.addressText], ["", point ? `✓ ${t.f.pointSet}` : t.f.pointMissing]]} />
        <ReviewBlock title={t.steps.contact.title} onEdit={() => goTo(3)} t={t} rows={[[t.f.contactName, form.contactName], [t.f.phone, form.phone], [t.f.email, form.email], [t.f.license, form.license], [t.f.notes, form.notes]]} />
        <label className={styles.agree} data-error={Boolean(errors.agree)}>
          <input id="zx-onb-agree" type="checkbox" checked={form.agree} onChange={(e) => set("agree", e.target.checked)} aria-describedby="zx-onb-agree-msg" />
          <span>{t.review.agree} <a href="/privacy" target="_blank" rel="noreferrer">{t.review.privacy}</a>.</span>
        </label>
        <p id="zx-onb-agree-msg" className={styles.errorText} role={errors.agree ? "alert" : undefined}>{errors.agree ? t.err.agree : ""}</p>
      </div>}

      {submitError && <p className={styles.noticeError} role="alert">{submitError}</p>}

      <footer className={styles.actions}>
        <span className={styles.saved} aria-live="polite">{savedAt ? t.a.draftSaved(timeOf(savedAt, locale)) : ""}</span>
        <div className={styles.actionButtons}>
          {step > 0
            ? <button type="button" className="zx-btn zx-btn--glass" onClick={() => goTo(step - 1)} disabled={submitting}>{t.a.back}</button>
            : onCancel ? <button type="button" className="zx-btn zx-btn--glass" onClick={onCancel}>{t.a.back}</button> : null}
          {last
            ? <button type="button" className="zx-btn zx-btn--primary" onClick={() => void submit()} disabled={submitting}>{submitting ? t.a.submitting : t.a.submit}</button>
            : <button type="button" className="zx-btn zx-btn--primary" onClick={next}>{t.a.next}</button>}
        </div>
      </footer>
    </section>
  </div>;
}

function Field({ id, label, hint, optional, error, t, count, wide, children }: { id: FieldKey; label: string; hint?: string; optional?: string; error?: FieldErrors[FieldKey]; t: Copy; count?: [number, number]; wide?: boolean; children: ReactNode }) {
  return <div className={`${styles.field} ${wide ? styles.wide : ""}`} data-error={Boolean(error)}>
    <label htmlFor={`zx-onb-${id}`}>{label}{optional && <em> · {optional}</em>}</label>
    {children}
    <div className={styles.fieldFoot}>
      <span id={`zx-onb-${id}-msg`} className={error ? styles.errorText : styles.hint} role={error ? "alert" : undefined}>{error ? t.err[error] : hint || ""}</span>
      {count && <span className={styles.count}>{count[0]}/{count[1]}</span>}
    </div>
  </div>;
}

function ReviewBlock({ title, rows, onEdit, t, art }: { title: string; rows: [string, string][]; onEdit: () => void; t: Copy; art?: string }) {
  return <section className={styles.reviewBlock}>
    <header><h3>{title}</h3><button type="button" className="zx-btn zx-btn--ghost" onClick={onEdit}>{t.a.edit}</button></header>
    <div className={styles.reviewBody}>
      {art && <ServiceArt code={art} size={44} />}
      <dl>{rows.map(([k, v], index) => <div key={`${k}-${index}`}>{k && <dt>{k}</dt>}<dd>{v.trim() || t.review.empty}</dd></div>)}</dl>
    </div>
  </section>;
}

/** Shown text of an answer: option labels for choices, the raw value otherwise. */
function answerText(question: SignupQuestion, answer: string | string[] | undefined, locale: ZhaoXiLocale) {
  const values = Array.isArray(answer) ? answer : [String(answer ?? "").trim()].filter(Boolean);
  return values.map((value) => question.options?.find((option) => option.value === value)?.label[locale] || value).join(", ");
}

/** One service question: free text, number, single choice or several choices (pill buttons). */
type Answer = string | string[];
function QuestionField({ question, locale, t, value, error, onChange }: { question: SignupQuestion; locale: ZhaoXiLocale; t: Copy; value: Answer | undefined; error?: ErrorCode; onChange: (value: Answer | ((previous: Answer | undefined) => Answer)) => void }) {
  const id = `zx-onb-q.${question.key}`;
  const label = <>{question.label[locale]}{!question.required && <em> · {t.f.optional}</em>}</>;
  const foot = <div className={styles.fieldFoot}><span id={`${id}-msg`} className={error ? styles.errorText : styles.hint} role={error ? "alert" : undefined}>{error ? t.err[error] : question.kind === "multi" ? t.multiHint : ""}</span></div>;
  if (question.options) {
    const selected = Array.isArray(value) ? value : value ? [value] : [];
    const toggle = (option: string) => {
      if (question.kind === "multi") onChange((previous) => { const current = Array.isArray(previous) ? previous : []; return current.includes(option) ? current.filter((v) => v !== option) : [...current, option]; });
      else onChange(option);
    };
    return <div className={`${styles.field} ${styles.wide}`} data-error={Boolean(error)} role="group" aria-labelledby={`${id}-label`} aria-describedby={`${id}-msg`}>
      <span id={`${id}-label`} className={styles.fieldLabel}>{label}</span>
      <div className={styles.chips}>
        {question.options.map((option, index) => <button key={option.value} id={index === 0 ? id : undefined} type="button" role={question.kind === "multi" ? "checkbox" : "radio"} aria-checked={selected.includes(option.value)} data-on={selected.includes(option.value)} onClick={() => toggle(option.value)}>{question.kind === "multi" && selected.includes(option.value) ? "✓ " : ""}{option.label[locale]}</button>)}
      </div>
      {foot}
    </div>;
  }
  return <div className={styles.field} data-error={Boolean(error)}>
    <label htmlFor={id}>{label}</label>
    <input id={id} value={typeof value === "string" ? value : ""} inputMode={question.kind === "number" ? "numeric" : undefined} maxLength={question.max} placeholder={question.placeholder?.[locale]} onChange={(e) => onChange(question.kind === "number" ? e.target.value.replace(/\D/g, "") : e.target.value)} aria-invalid={Boolean(error)} aria-describedby={`${id}-msg`} />
    {foot}
  </div>;
}
