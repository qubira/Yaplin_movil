const { withAndroidManifest } = require('@expo/config-plugins');

// Fully-qualified name of the service declared in
// expo-android-notification-listener-service's own AndroidManifest.xml.
const LISTENER_SERVICE_NAME = 'expo.modules.androidnotificationlistenerservice.ExpoNotificationListenerService';

// Promotes the notification-listener service to a real foreground service
// (see the patched .kt file — patches/expo-android-notification-listener-service+*.patch)
// so MIUI/OEM battery managers are far less likely to kill it after a few
// idle hours. Android 14+ requires both the permissions and the
// foregroundServiceType + PROPERTY_SPECIAL_USE_FGS_SUBTYPE below.
function withForegroundListener(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest['uses-permission'] = manifest['uses-permission'] ?? [];
    ['android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE'].forEach((name) => {
      const exists = manifest['uses-permission'].some((p) => p.$['android:name'] === name);
      if (!exists) manifest['uses-permission'].push({ $: { 'android:name': name } });
    });

    const application = manifest.application[0];
    application.service = application.service ?? [];
    application.service = application.service.filter((s) => s.$['android:name'] !== LISTENER_SERVICE_NAME);
    application.service.push({
      $: {
        'android:name': LISTENER_SERVICE_NAME,
        'android:foregroundServiceType': 'specialUse',
        // Without this, Android's default behavior kills the whole app
        // process — listener service included — the moment the user swipes
        // YapLin away from Recents, regardless of the foreground promotion
        // above. This is what actually keeps it listening while "closed".
        'android:stopWithTask': 'false',
        'tools:node': 'merge',
      },
      property: [
        {
          $: {
            'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
            'android:value': 'payment-notification-capture',
          },
        },
      ],
    });

    return config;
  });
}

module.exports = withForegroundListener;
