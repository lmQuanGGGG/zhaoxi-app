/**
 * Customer Audio Notification Engine (Web Audio API)
 * Generates clear, loud, pleasant iOS-style chimes for order stage transitions.
 */

export type OrderStageType =
  | "accepted"    // Quán đã xác nhận đơn
  | "preparing"   // Bếp đang chuẩn bị món
  | "delivering"  // Shipper đã lấy món & đang giao
  | "delivered"   // Đơn hàng đã đến / Giao thành công
  | "general";    // Thông báo chung

export function playCustomerOrderChime(stage: OrderStageType = "general") {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const now = ctx.currentTime;

    // Define sound signature per stage
    let notes: Array<{ freq: number; time: number; dur: number; gain: number }> = [];

    if (stage === "delivered") {
      // Fanfare celebration chime when food arrives!
      // Ting - Ding - Dong - DING! ... Ding - DING!
      notes = [
        { freq: 523.25, time: 0.0, dur: 0.35, gain: 0.9 },   // C5
        { freq: 659.25, time: 0.16, dur: 0.4, gain: 0.95 },  // E5
        { freq: 783.99, time: 0.32, dur: 0.5, gain: 1.0 },   // G5
        { freq: 1046.50, time: 0.50, dur: 0.9, gain: 1.0 },  // C6 (loud ringing high bell)
        // Echo wave
        { freq: 783.99, time: 0.88, dur: 0.45, gain: 0.95 }, // G5
        { freq: 1046.50, time: 1.05, dur: 1.1, gain: 1.0 },  // C6
      ];
    } else if (stage === "delivering") {
      // Energetic delivery transition chime
      // Ting - Ting - Dong!
      notes = [
        { freq: 587.33, time: 0.0, dur: 0.35, gain: 0.85 },  // D5
        { freq: 880.00, time: 0.18, dur: 0.45, gain: 0.95 }, // A5
        { freq: 1174.66, time: 0.38, dur: 0.8, gain: 1.0 },  // D6
      ];
    } else if (stage === "preparing") {
      // Warm & reassuring kitchen cooking chime: Do - Mi - Sol
      notes = [
        { freq: 523.25, time: 0.0, dur: 0.38, gain: 0.85 },  // C5
        { freq: 659.25, time: 0.20, dur: 0.45, gain: 0.95 }, // E5
        { freq: 783.99, time: 0.42, dur: 0.85, gain: 1.0 },  // G5
      ];
    } else if (stage === "accepted") {
      // Crisp, bright partner accepted chime: Ding - DING!
      notes = [
        { freq: 587.33, time: 0.0, dur: 0.35, gain: 0.9 },   // D5
        { freq: 880.00, time: 0.18, dur: 0.75, gain: 1.0 },  // A5
      ];
    } else {
      // General bright two-tone chime
      notes = [
        { freq: 659.25, time: 0.0, dur: 0.35, gain: 0.9 },   // E5
        { freq: 880.00, time: 0.22, dur: 0.7, gain: 1.0 },   // A5
      ];
    }

    for (const n of notes) {
      // Primary sine bell
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, now + n.time);

      gain.gain.setValueAtTime(0.001, now + n.time);
      gain.gain.linearRampToValueAtTime(n.gain, now + n.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.time);
      osc.stop(now + n.time + n.dur + 0.05);

      // Sparkle triangle harmonic
      const oscHarmonic = ctx.createOscillator();
      const gainHarmonic = ctx.createGain();
      oscHarmonic.type = "triangle";
      oscHarmonic.frequency.setValueAtTime(n.freq * 2, now + n.time);
      gainHarmonic.gain.setValueAtTime(0.001, now + n.time);
      gainHarmonic.gain.linearRampToValueAtTime(n.gain * 0.3, now + n.time + 0.015);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur * 0.7);

      oscHarmonic.connect(gainHarmonic);
      gainHarmonic.connect(ctx.destination);

      oscHarmonic.start(now + n.time);
      oscHarmonic.stop(now + n.time + n.dur + 0.05);
    }
  } catch (err) {
    console.warn("Unable to play customer order chime", err);
  }
}

/**
 * Ensures AudioContext can be initialized on mobile/desktop browsers after first user gesture.
 */
export function registerAudioUnlock() {
  if (typeof window === "undefined") return () => {};
  const unlock = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const c = new AudioCtx();
        c.resume().then(() => c.close()).catch(() => {});
      }
    } catch {}
  };
  window.addEventListener("click", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  return () => {
    window.removeEventListener("click", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("keydown", unlock);
  };
}
