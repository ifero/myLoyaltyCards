import { type FC } from 'react';
import { type ImageSourcePropType } from 'react-native';
import { type SvgProps } from 'react-native-svg';

import AcquaESaponeLogo from '@/assets/images/brands/acqua-e-sapone.svg';
import BennetLogo from '@/assets/images/brands/bennet.svg';
import BlukidsLogo from '@/assets/images/brands/blukids.png';
import BurgerKingLogo from '@/assets/images/brands/burger-king.svg';
import CalliopeLogo from '@/assets/images/brands/calliope.svg';
import CalzedoniaLogo from '@/assets/images/brands/calzedonia.svg';
import CamaieuLogo from '@/assets/images/brands/camaieu.svg';
import CarrefourLogo from '@/assets/images/brands/carrefour.svg';
import CoinLogo from '@/assets/images/brands/coin.png';
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
import LeroyMerlinLogo from '@/assets/images/brands/leroy-merlin.svg';
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
import SuperConvenienteLogo from '@/assets/images/brands/super-conveniente.svg';
import TigotaLogo from '@/assets/images/brands/tigota.svg';
import TommyHilfigerLogo from '@/assets/images/brands/tommy-hilfiger.svg';
import ToysCenterLogo from '@/assets/images/brands/toys-center.svg';
import UniclubLogo from '@/assets/images/brands/uniclub.png';
import UnieuroLogo from '@/assets/images/brands/unieuro.svg';
import ZaraLogo from '@/assets/images/brands/zara.svg';

/** SVG component or static image source — consumers render via <BrandLogo /> */
export type BrandLogoSource = FC<SvgProps> | ImageSourcePropType;

const BRAND_LOGOS: Record<string, BrandLogoSource> = {
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
  'leroy-merlin': LeroyMerlinLogo,
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
  'super-conveniente': SuperConvenienteLogo,
  tigota: TigotaLogo,
  'tommy-hilfiger': TommyHilfigerLogo,
  'toys-center': ToysCenterLogo,
  uniclub: UniclubLogo,
  unieuro: UnieuroLogo,
  zara: ZaraLogo
};

export const getBrandLogo = (logoKey: string): BrandLogoSource | undefined => BRAND_LOGOS[logoKey];
