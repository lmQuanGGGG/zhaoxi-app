import { after } from "next/server";
import { completeExpiredOrders } from "@/lib/order-timers";
import { housingAppointmentReminderService } from "@/lib/services/housing-appointment-reminder-service";
import { travelReminderService } from "@/lib/services/travel-reminder-service";
import { paymentNotificationAutomationService } from "@/lib/services/payment-notification-automation-service";

// Customer, partner and admin apps poll notifications every few seconds. The
// timer and reminder sweeps scan service_requests, so they run after the
// response is sent and at most once per interval per instance; the events they
// create show up on the next poll. Each sweep is idempotent (CAS updates and
// advisory locks), so overlapping instances stay safe.
const SWEEP_INTERVAL_MS = 15_000;

function throttled(task: () => Promise<void>) {
  let lastStartedAt = 0;
  let running: Promise<void> | null = null;
  return async () => {
    if (running || Date.now() - lastStartedAt < SWEEP_INTERVAL_MS) return;
    lastStartedAt = Date.now();
    running = task().finally(() => { running = null; });
    await running;
  };
}

const sweeps: Array<[name: string, run: () => Promise<unknown>]> = [
  ["order timer", () => completeExpiredOrders()],
  ["housing appointment reminder", () => housingAppointmentReminderService.evaluate()],
  ["travel reminder", () => travelReminderService.evaluate()],
  ["payment notification automation", () => paymentNotificationAutomationService.evaluate()],
];

const runNotificationSweeps = throttled(async () => {
  for (const [name, run] of sweeps) {
    await run().catch((error) => console.error(`${name} sweep failed`, error));
  }
});

const runOrderTimerSweep = throttled(() =>
  completeExpiredOrders().catch((error) => console.error("order timer sweep failed", error)));

export function scheduleNotificationSweeps() {
  after(runNotificationSweeps);
}

export function scheduleOrderTimerSweep() {
  after(runOrderTimerSweep);
}
