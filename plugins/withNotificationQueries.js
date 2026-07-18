const { withAndroidManifest } = require('@expo/config-plugins');

// Android 11+ hides other apps' info (icon, label) behind package-visibility
// rules. The notification-listener native module reads the posting app's info
// for every event and throws NameNotFoundException — silently killing that
// callback — unless the queried package is declared here.
const QUERIED_PACKAGES = [
  'com.bcp.innovacxion.yapeapp', // Yape
  'com.bbva.nxt_peru', // Plin / BBVA
  'pe.com.interbank.mobilebanking', // Plin / Interbank
  'pe.com.scotiabank.blpm.android.client', // Plin / Scotiabank
  'pe.izipay.apps.izipay', // Izipay
];

function withNotificationQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.queries = manifest.queries ?? [{}];
    manifest.queries[0].package = QUERIED_PACKAGES.map((name) => ({
      $: { 'android:name': name },
    }));
    return config;
  });
}

module.exports = withNotificationQueries;
