/**
 * Brand Logo Registry
 * Story 13.2: Map catalogue brand IDs to their SVG logo components.
 *
 * Each brand's SVG in assets/images/brands/ is imported as a React component
 * via react-native-svg-transformer. Use getBrandLogoComponent() for lookup.
 */

import { type FC } from 'react';
import { type SvgProps } from 'react-native-svg';

import AcquaESaponeLogo from '@/assets/images/brands/acqua-e-sapone.svg';
import BennetLogo from '@/assets/images/brands/bennet.svg';
import BlukidsLogo from '@/assets/images/brands/blukids.svg';
import BurgerKingLogo from '@/assets/images/brands/burger-king.svg';
import CalliopeLogo from '@/assets/images/brands/calliope.svg';
import CalzedoniaLogo from '@/assets/images/brands/calzedonia.svg';
import CamaieuLogo from '@/assets/images/brands/camaieu.svg';
import CarrefourLogo from '@/assets/images/brands/carrefour.svg';
import CoinLogo from '@/assets/images/brands/coin.svg';
import ConadLogo from '@/assets/images/brands/conad.svg';
import CoopLogo from '@/assets/images/brands/coop.svg';
import CraiLogo from '@/assets/images/brands/crai.svg';
import DecathlonLogo from '@/assets/images/brands/decathlon.svg';
import DecoLogo from '@/assets/images/brands/deco.svg';
import DemmaLogo from '@/assets/images/brands/demma.svg';
import DesigualLogo from '@/assets/images/brands/desigual.svg';
import DesparLogo from '@/assets/images/brands/despar.svg';
import DouglasLogo from '@/assets/images/brands/douglas.svg';
import EsselungaLogo from '@/assets/images/brands/esselunga.svg';
import EuronicsLogo from '@/assets/images/brands/euronics.svg';
import EurospinLogo from '@/assets/images/brands/eurospin.svg';
import HmLogo from '@/assets/images/brands/hm.svg';
import IdoLogo from '@/assets/images/brands/ido.svg';
import IkeaLogo from '@/assets/images/brands/ikea.svg';
import IlGiganteLogo from '@/assets/images/brands/il-gigante.svg';
import IntimissimiLogo from '@/assets/images/brands/intimissimi.svg';
import JyskLogo from '@/assets/images/brands/jysk.svg';
import LidlLogo from '@/assets/images/brands/lidl.svg';
import LotteriaDegliScontriniLogo from '@/assets/images/brands/lotteria-degli-scontrini.svg';
import MdLogo from '@/assets/images/brands/md.svg';
import MediaworldLogo from '@/assets/images/brands/mediaworld.svg';
import MotiviLogo from '@/assets/images/brands/motivi.svg';
import OldWildWestLogo from '@/assets/images/brands/old-wild-west.svg';
import OltreLogo from '@/assets/images/brands/oltre.svg';
import OriginalMarinesLogo from '@/assets/images/brands/original-marines.svg';
import OvsLogo from '@/assets/images/brands/ovs.svg';
import PamLogo from '@/assets/images/brands/pam.svg';
import PandoraLogo from '@/assets/images/brands/pandora.svg';
import PennyMarketLogo from '@/assets/images/brands/penny-market.svg';
import PiazzaItaliaLogo from '@/assets/images/brands/piazza-italia.svg';
import PittaRossoLogo from '@/assets/images/brands/pitta-rosso.svg';
import PrenatalLogo from '@/assets/images/brands/prenatal.svg';
import RinascenteLogo from '@/assets/images/brands/rinascente.svg';
import SephoraLogo from '@/assets/images/brands/sephora.svg';
import StroiliLogo from '@/assets/images/brands/stroili.svg';
import TigotaLogo from '@/assets/images/brands/tigota.svg';
import TommyHilfigerLogo from '@/assets/images/brands/tommy-hilfiger.svg';
import ToysCenterLogo from '@/assets/images/brands/toys-center.svg';
import UniclubLogo from '@/assets/images/brands/uniclub.svg';
import UnieuroLogo from '@/assets/images/brands/unieuro.svg';
import ZaraLogo from '@/assets/images/brands/zara.svg';

/** Static map from brand logo key → SVG component */
const BRAND_LOGOS: Record<string, FC<SvgProps>> = {
  'acqua-e-sapone': AcquaESaponeLogo,
  bennet: BennetLogo,
  blukids: BlukidsLogo,
  'burger-king': BurgerKingLogo,
  calzedonia: CalzedoniaLogo,
  calliope: CalliopeLogo,
  camaieu: CamaieuLogo,
  carrefour: CarrefourLogo,
  crai: CraiLogo,
  deco: DecoLogo,
  demma: DemmaLogo,
  desigual: DesigualLogo,
  coin: CoinLogo,
  conad: ConadLogo,
  coop: CoopLogo,
  decathlon: DecathlonLogo,
  despar: DesparLogo,
  douglas: DouglasLogo,
  esselunga: EsselungaLogo,
  euronics: EuronicsLogo,
  eurospin: EurospinLogo,
  hm: HmLogo,
  ikea: IkeaLogo,
  ido: IdoLogo,
  'il-gigante': IlGiganteLogo,
  intimissimi: IntimissimiLogo,
  jysk: JyskLogo,
  lidl: LidlLogo,
  'lotteria-degli-scontrini': LotteriaDegliScontriniLogo,
  md: MdLogo,
  mediaworld: MediaworldLogo,
  motivi: MotiviLogo,
  'old-wild-west': OldWildWestLogo,
  oltre: OltreLogo,
  'original-marines': OriginalMarinesLogo,
  ovs: OvsLogo,
  pam: PamLogo,
  pandora: PandoraLogo,
  'penny-market': PennyMarketLogo,
  'piazza-italia': PiazzaItaliaLogo,
  'pitta-rosso': PittaRossoLogo,
  prenatal: PrenatalLogo,
  rinascente: RinascenteLogo,
  sephora: SephoraLogo,
  stroili: StroiliLogo,
  tigota: TigotaLogo,
  'tommy-hilfiger': TommyHilfigerLogo,
  'toys-center': ToysCenterLogo,
  unieuro: UnieuroLogo,
  uniclub: UniclubLogo,
  zara: ZaraLogo
};

/**
 * Get the SVG logo component for a brand by its logo key.
 * Returns undefined if no logo exists for the given key.
 */
export const getBrandLogoComponent = (logoKey: string): FC<SvgProps> | undefined =>
  BRAND_LOGOS[logoKey];
