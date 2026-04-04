/**
 * Type declarations for SVG imports via react-native-svg-transformer.
 * Each .svg file is transformed into a React component.
 */
declare module '*.svg' {
  import { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}
