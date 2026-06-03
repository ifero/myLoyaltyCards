/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch-widget',
  displayName: 'Loyalty Card',
  bundleIdentifier: '.watch.widget',
  deploymentTarget: '10.0',
  frameworks: ['WidgetKit', 'SwiftUI'],
  entitlements: {
    'com.apple.security.application-groups': ['group.com.iferoporefi.myloyaltycards.watch-complication'],
  },
};
