import * as Notifications from 'expo-notifications';

const REMINDER_ID = 'yaplin-session-reminder';
const TWENTY_FOUR_HOURS_SECONDS = 24 * 60 * 60;

/**
 * Android (especially MIUI) can kill the background notification listener
 * after enough time, with no way to guarantee otherwise short of rewriting
 * the native service. As a safety net, schedule a reminder ~24h from now —
 * every fresh app open resets the clock — so the user knows to reopen
 * YapLin instead of silently missing payments.
 */
export async function scheduleSessionExpiryReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: 'Vuelve a abrir YapLin',
      body: 'Ya pasaron 24 horas — Android pudo haber pausado la captura de pagos en segundo plano. Abre la app para reactivarla.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: TWENTY_FOUR_HOURS_SECONDS,
      repeats: false,
    },
  });
}
