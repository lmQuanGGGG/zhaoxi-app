import * as Haptics from "expo-haptics";

export const haptic = {
  tap: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); },
  select: () => { void Haptics.selectionAsync().catch(() => undefined); },
  success: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined); },
  warn: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined); },
};
