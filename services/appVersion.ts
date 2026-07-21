import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

export interface AppVersionInfo {
  version: string;
  channel: string;
  runtimeVersion: string;
  updateLabel: string;
}

export function getAppVersionInfo(): AppVersionInfo {
  return {
    version: Constants.expoConfig?.version ?? '—',
    channel: Updates.channel ?? 'dev',
    runtimeVersion: Updates.runtimeVersion ?? '—',
    updateLabel: Updates.isEmbeddedLaunch
      ? 'build nativo'
      : Updates.updateId
        ? `update ${Updates.updateId.slice(0, 8)}`
        : '—',
  };
}
