/* global module, require */
/**
 * SVG mock for Jest — react-native-svg-transformer imports .svg as React components.
 * In tests, render as a simple View with the SVG filename as testID.
 */
const React = require('react');
const { View } = require('react-native');

const SvgMock = (props) =>
  React.createElement(View, { ...props, testID: props.testID || 'svg-mock' });

SvgMock.displayName = 'SvgMock';

module.exports = SvgMock;
module.exports.default = SvgMock;
