/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch',
  name: 'MyLoyaltyCardsWatch',
  bundleIdentifier: '.watch',
  deploymentTarget: '10.0',
  frameworks: ['SwiftUI', 'SwiftData', 'WatchConnectivity', 'WidgetKit'],
  entitlements: {},
};
