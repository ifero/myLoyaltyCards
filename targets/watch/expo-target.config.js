/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch',
  displayName: 'MyLoyaltyCards',
  bundleIdentifier: '.watch',
  deploymentTarget: '10.0',
  icon: './AppIcon.png',
  frameworks: ['SwiftUI', 'SwiftData', 'WatchConnectivity', 'WidgetKit'],
  entitlements: {},
};
