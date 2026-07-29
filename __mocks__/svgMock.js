/* global module, require */
/**
 * SVG mock for Jest — `react-native-svg-transformer` turns `.svg` imports into
 * React components at runtime, so tests must see a component too, not an asset
 * object. That is the whole reason this file exists.
 *
 * Reached via the `\.svg$` entry in `jest.config.js`'s `moduleNameMapper`, which
 * MUST stay ahead of the `^@/` alias entry — Jest applies only the first matching
 * pattern, so putting the alias first silently routed every `@/assets/….svg`
 * import past this mock and into the asset transformer instead. See the comment
 * there, and `test/svg-module-resolution.test.tsx`, which pins it.
 *
 * Renders a plain `View`, forwarding all props (so `width`/`height`/a11y props
 * stay assertable) and defaulting `testID` to `svg-mock` when the caller passes
 * none — pass your own `testID` to target a specific mark.
 */
const React = require('react');
const { View } = require('react-native');

const SvgMock = (props) =>
  React.createElement(View, { ...props, testID: props.testID || 'svg-mock' });

SvgMock.displayName = 'SvgMock';

module.exports = SvgMock;
module.exports.default = SvgMock;
