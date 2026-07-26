import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';

// Xiaomi/MIUI's own battery+process manager sits above stock Android and can
// still kill the notification-listener process even with a foreground
// service + stopWithTask="false" in place. There's no public API to disable
// that manager from code — the user has to grant these two exemptions
// manually, once. All this module does is jump straight to the right screen
// instead of leaving the user to hunt for it across MIUI's settings.

function packageName(): string {
  return Constants.expoConfig?.android?.package ?? 'com.anonymous.yaplin';
}

export function isXiaomiDevice(): boolean {
  return Platform.OS === 'android' && (Device.manufacturer ?? '').toLowerCase() === 'xiaomi';
}

// Standard Android dialog ("Permitir" / "No permitir") to exempt the app
// from Doze-mode/App-Standby battery throttling. Works on any manufacturer,
// not just Xiaomi — this is the one part of the fix that's a real public API.
export async function requestIgnoreBatteryOptimizations(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      { data: `package:${packageName()}` }
    );
    return true;
  } catch (e) {
    if (__DEV__) console.log('[YapLin] REQUEST_IGNORE_BATTERY_OPTIMIZATIONS failed', String(e));
    return false;
  }
}

// MIUI-specific "Autostart" screen (Seguridad > Permisos > Inicio automático).
// Undocumented but stable across MIUI versions — many apps rely on this same
// explicit component. No public API to read or set its state, only to open it;
// the user has to flip the switch themselves.
export async function openXiaomiAutostartSettings(): Promise<boolean> {
  if (!isXiaomiDevice()) return false;
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
      packageName: 'com.miui.securitycenter',
      className: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
    });
    return true;
  } catch (e) {
    if (__DEV__) console.log('[YapLin] MIUI autostart intent failed', String(e));
    return false;
  }
}
