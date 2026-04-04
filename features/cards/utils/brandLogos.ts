/**
 * Brand Logo Registry
 * Story 13.2: Map catalogue brand IDs to their SVG logo components.
 *
 * Each brand's SVG in assets/images/brands/ is imported as a React component
 * via react-native-svg-transformer. Use getBrandLogoComponent() for lookup.
 */

import { type FC } from 'react';
import { type SvgProps } from 'react-native-svg';

import BennetLogo from '@/assets/images/brands/bennet.svg';
import CarrefourLogo from '@/assets/images/brands/carrefour.svg';
import CoinLogo from '@/assets/images/brands/coin.svg';
import ConadLogo from '@/assets/images/brands/conad.svg';
import CoopLogo from '@/assets/images/brands/coop.svg';
import DecathlonLogo from '@/assets/images/brands/decathlon.svg';
import DesparLogo from '@/assets/images/brands/despar.svg';
import DouglasLogo from '@/assets/images/brands/douglas.svg';
import EsselungaLogo from '@/assets/images/brands/esselunga.svg';
import EurospinLogo from '@/assets/images/brands/eurospin.svg';
import HmLogo from '@/assets/images/brands/hm.svg';
import IkeaLogo from '@/assets/images/brands/ikea.svg';
import LidlLogo from '@/assets/images/brands/lidl.svg';
import MediaworldLogo from '@/assets/images/brands/mediaworld.svg';
import OvsLogo from '@/assets/images/brands/ovs.svg';
import PamLogo from '@/assets/images/brands/pam.svg';
import SephoraLogo from '@/assets/images/brands/sephora.svg';
import TigotaLogo from '@/assets/images/brands/tigota.svg';
import UnieuroLogo from '@/assets/images/brands/unieuro.svg';
import ZaraLogo from '@/assets/images/brands/zara.svg';

/** Static map from brand logo key → SVG component */
const BRAND_LOGOS: Record<string, FC<SvgProps>> = {
  bennet: BennetLogo,
  carrefour: CarrefourLogo,
  coin: CoinLogo,
  conad: ConadLogo,
  coop: CoopLogo,
  decathlon: DecathlonLogo,
  despar: DesparLogo,
  douglas: DouglasLogo,
  esselunga: EsselungaLogo,
  eurospin: EurospinLogo,
  hm: HmLogo,
  ikea: IkeaLogo,
  lidl: LidlLogo,
  mediaworld: MediaworldLogo,
  ovs: OvsLogo,
  pam: PamLogo,
  sephora: SephoraLogo,
  tigota: TigotaLogo,
  unieuro: UnieuroLogo,
  zara: ZaraLogo
};

/**
 * Get the SVG logo component for a brand by its logo key.
 * Returns undefined if no logo exists for the given key.
 */
export const getBrandLogoComponent = (logoKey: string): FC<SvgProps> | undefined =>
  BRAND_LOGOS[logoKey];
