import React from 'react';
import { Image } from 'react-native';

import { type BrandLogoSource } from '../utils/brandLogos';

interface BrandLogoProps {
  source: BrandLogoSource;
  width: number;
  height: number;
  color?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ source, width, height, color }) => {
  if (typeof source === 'function') {
    const SvgLogo = source;
    return <SvgLogo width={width} height={height} color={color} />;
  }
  return <Image source={source} style={{ width, height }} resizeMode="contain" />;
};
