import { Platform } from 'react-native';

// The native module only exists on Android. Every access below goes through a
// lazy `require()` gated by a Platform check so its top-level native binding
// code never runs (and never throws) on iOS/web.
function getNativeListener() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('expo-android-notification-listener-service').default;
}

export function isNotificationAccessGranted(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return getNativeListener().isNotificationPermissionGranted();
  } catch {
    return false;
  }
}

export function openNotificationAccessSettings(): void {
  if (Platform.OS !== 'android') return;
  try {
    getNativeListener().openNotificationListenerSettings();
  } catch {
    // no-op: nothing sensible to do if the native module isn't available
  }
}
