import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');
const complicationPath = path.join(repoRoot, 'targets', 'watch', 'ComplicationProvider.swift');
const watchConfigPath = path.join(repoRoot, 'targets', 'watch', 'expo-target.config.js');
const watchWidgetConfigPath = path.join(
  repoRoot,
  'targets',
  'watch-widget',
  'expo-target.config.js'
);
const watchWidgetSwiftPath = path.join(
  repoRoot,
  'targets',
  'watch-widget',
  'WatchComplicationWidget.swift'
);
const watchWidgetEnLprojPath = path.join(
  repoRoot,
  'targets',
  'watch-widget',
  'en.lproj',
  'Localizable.strings'
);
const watchWidgetItLprojPath = path.join(
  repoRoot,
  'targets',
  'watch-widget',
  'it.lproj',
  'Localizable.strings'
);
const watchInfoPath = path.join(repoRoot, 'targets', 'watch', 'Info.plist');
const watchSessionPath = path.join(repoRoot, 'targets', 'watch', 'WatchSessionManager.swift');
const cardListViewPath = path.join(repoRoot, 'targets', 'watch', 'CardListView.swift');
const watchEnLprojPath = path.join(repoRoot, 'targets', 'watch', 'en.lproj', 'Localizable.strings');
const watchItLprojPath = path.join(repoRoot, 'targets', 'watch', 'it.lproj', 'Localizable.strings');
const watchAppPath = path.join(repoRoot, 'targets', 'watch', 'MyLoyaltyCardsWatchApp.swift');
const contentViewPath = path.join(repoRoot, 'targets', 'watch', 'ContentView.swift');

describe('watch complication contract', () => {
  it('keeps watch app URL scheme registration and disables legacy ClockKit registration', () => {
    const infoPlist = fs.readFileSync(watchInfoPath, 'utf8');

    expect(infoPlist).toContain('<key>CFBundleURLTypes</key>');
    expect(infoPlist).toContain('<string>myloyaltycards</string>');
    expect(infoPlist).not.toContain('<key>CLKComplicationPrincipalClass</key>');
    expect(infoPlist).not.toContain('<key>CLKComplicationSupportedFamilies</key>');
  });

  it('uses WidgetKit timeline reload and removes deprecated ClockKit provider usage', () => {
    const source = fs.readFileSync(complicationPath, 'utf8');

    expect(source).toContain('import WidgetKit');
    expect(source).not.toContain('import ClockKit');
    expect(source).toContain('enum ComplicationReloader');
    expect(source).toContain('static let widgetKind = "MyLoyaltyCardsWatchComplication"');
    expect(source).toContain('WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)');
    expect(source).not.toContain('CLKComplicationServer.sharedInstance()');
    expect(source).not.toContain('CLKComplicationDataSource');
  });

  it('keeps shared complication state keys and persistence helpers for widget data', () => {
    const source = fs.readFileSync(complicationPath, 'utf8');

    expect(source).toContain('enum ComplicationSharedState');
    expect(source).toContain('static let topCardNameKey');
    expect(source).toContain('static let hasCardsKey');
    expect(source).toContain('static let cardsKey');
    expect(source).toContain('static func persistTopCardName');
    expect(source).toContain('static func persistCards');
  });

  it('reloads active complications after sync and migration updates', () => {
    const source = fs.readFileSync(complicationPath, 'utf8');
    const session = fs.readFileSync(watchSessionPath, 'utf8');
    const cardList = fs.readFileSync(cardListViewPath, 'utf8');

    expect(source).toContain('enum ComplicationReloader');
    expect(source).toContain('WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)');
    expect(session).toContain('ComplicationReloader.reloadAllActiveComplications()');
    expect(cardList).toContain('ComplicationReloader.reloadAllActiveComplications()');
    expect(source).toContain('enum ComplicationSharedState');
    expect(source).toContain('persistTopCardName');
    expect(session).toContain('ComplicationSharedState.persistTopCardName(topCardName)');
    expect(cardList).toContain('ComplicationSharedState.persistTopCardName(topCardName)');
  });

  it('treats empty phone snapshots as valid so stale cards are removed', () => {
    const session = fs.readFileSync(watchSessionPath, 'utf8');

    expect(session).toContain('if array.isEmpty {');
    expect(session).toContain('return []');
  });

  it('keeps complication tap launch flow anchored to card list root', () => {
    const watchApp = fs.readFileSync(watchAppPath, 'utf8');
    const contentView = fs.readFileSync(contentViewPath, 'utf8');

    expect(watchApp).toContain('WindowGroup {');
    expect(watchApp).toContain('ContentView()');
    expect(contentView).toContain('CardListView()');
  });

  it('keeps watch target config aligned with WidgetKit usage', () => {
    const config = fs.readFileSync(watchConfigPath, 'utf8');

    expect(config).toContain("type: 'watch'");
    expect(config).not.toContain("'ClockKit'");
    expect(config).toContain("'WidgetKit'");
    expect(config).toContain('com.apple.security.application-groups');
    expect(config).toContain('group.com.iferoporefi.myloyaltycards.watch-complication');
  });

  it('declares a dedicated watch-widget extension for watch face visibility', () => {
    const config = fs.readFileSync(watchWidgetConfigPath, 'utf8');
    const source = fs.readFileSync(watchWidgetSwiftPath, 'utf8');

    expect(config).toContain("type: 'watch-widget'");
    expect(config).toContain('group.com.iferoporefi.myloyaltycards.watch-complication');
    expect(source).toContain('@main');
    expect(source).toContain('WidgetBundle');
    expect(source).toContain('.supportedFamilies([');
    expect(source).toContain('.accessoryCircular');
    expect(source).toContain('.accessoryRectangular');
    expect(source).toContain('.accessoryInline');
  });

  it('routes selected-card complication taps to the exact deep-linked card', () => {
    const source = fs.readFileSync(watchWidgetSwiftPath, 'utf8');
    const cardList = fs.readFileSync(cardListViewPath, 'utf8');

    expect(source).toContain('components.scheme = "myloyaltycards"');
    expect(source).toContain('components.host = "watch-card"');
    expect(source).toContain('URLQueryItem(name: "id", value: selectedCardId)');
    expect(source).toContain('.widgetURL(entry.deepLinkURL)');

    expect(cardList).toContain('url.scheme?.lowercased() == scheme');
    expect(cardList).toContain('url.host?.lowercased() == cardHost');
    expect(cardList).toContain(
      'components.queryItems?.first(where: { $0.name == cardIdQueryItem })?.value'
    );
    expect(cardList).toContain('.onOpenURL { url in');
    expect(cardList).toContain('openCardRouteIfAvailable(cardId)');
    expect(cardList).toContain('navigationPath = [WatchCardRoute(cardId: cardId)]');
  });

  it('localizes watch-widget selected-card fallback text in English and Italian', () => {
    const source = fs.readFileSync(watchWidgetSwiftPath, 'utf8');
    const en = fs.readFileSync(watchWidgetEnLprojPath, 'utf8');
    const it = fs.readFileSync(watchWidgetItLprojPath, 'utf8');

    const keyedStrings = [
      'watch.widget.complication.entry.choose_card.title',
      'watch.widget.complication.entry.choose_card.subtitle',
      'watch.widget.complication.entry.unavailable.title',
      'watch.widget.complication.entry.unavailable.subtitle',
      'watch.widget.complication.entry.sync.subtitle',
      'watch.widget.complication.entry.selected.subtitle',
      'watch.widget.complication.inline.open'
    ];

    for (const key of keyedStrings) {
      expect(source).toContain(`WatchWidgetL10n.string("${key}")`);
      expect(en).toContain(`"${key}" =`);
      expect(it).toContain(`"${key}" =`);
    }

    expect(source).toContain('@Parameter(title: "Action", default: .openApp)');
    expect(source).toContain('var mode: WatchComplicationMode');
    expect(source).toContain('func results() async throws -> [WatchCardChoiceEntity]');
    expect(source).toContain(
      'func recommendations() -> [AppIntentRecommendation<WatchComplicationConfigurationIntent>]'
    );
    expect(source).toContain('[]');

    expect(source).toContain(
      'WatchWidgetL10n.format("watch.widget.complication.inline.card_format", entry.title)'
    );
    expect(en).toContain('"watch.widget.complication.inline.card_format" =');
    expect(it).toContain('"watch.widget.complication.inline.card_format" =');
  });

  it('localizes watch app deep-link unavailable text in English and Italian', () => {
    const cardList = fs.readFileSync(cardListViewPath, 'utf8');
    const en = fs.readFileSync(watchEnLprojPath, 'utf8');
    const it = fs.readFileSync(watchItLprojPath, 'utf8');

    expect(cardList).toContain('WatchL10n.string("watch.cards.unavailable")');
    expect(en).toContain('"watch.cards.unavailable" = "Card unavailable";');
    expect(it).toContain('"watch.cards.unavailable" = "Carta non disponibile";');
  });
});

describe('watch complication brand color + open-app icon', () => {
  const widgetSwift = fs.readFileSync(watchWidgetSwiftPath, 'utf8');
  const provider = fs.readFileSync(complicationPath, 'utf8');
  const widgetDir = path.join(repoRoot, 'targets', 'watch-widget');
  const palettePath = path.join(widgetDir, 'WidgetCardPalette.swift');
  const assetsDir = path.join(widgetDir, 'Assets.xcassets');

  it('plumbs per-card colorHex from the provider snapshot into the widget entry', () => {
    // Provider persists the color in the shared App Group snapshot.
    expect(provider).toContain('let colorHex: String?');
    expect(provider).toContain(
      'ComplicationCardSnapshot(id: $0.id, name: $0.name, brandId: $0.brandId, colorHex: $0.colorHex)'
    );
    // Widget decodes it and carries it onto the timeline entry.
    expect(widgetSwift).toContain('let colorHex: String?');
    expect(widgetSwift).toContain('colorHex: selectedCard.colorHex');
  });

  it('renders the selected card brand on its own relative background color', () => {
    expect(fs.existsSync(palettePath)).toBe(true);
    const palette = fs.readFileSync(palettePath, 'utf8');
    expect(palette).toContain('enum WidgetCardPalette');
    // Resolves every palette key the phone sends, plus raw hex.
    for (const key of ['blue', 'red', 'green', 'orange', 'grey']) {
      expect(palette).toContain(`"${key}"`);
    }
    // Palette hexes must equal the app's canonical CARD_COLORS so the
    // complication background is the same color shown inside the app.
    for (const hex of ['#1A73E8', '#E2231A', '#16A34A', '#F59E0B', '#64748B']) {
      expect(palette).toContain(hex);
    }
    // The widget paints the card color as the container background and keeps
    // the brand logo legible on a chip.
    expect(widgetSwift).toContain('WidgetCardPalette.color(for: entry.colorHex)');
    expect(widgetSwift).toContain('.containerBackground(for: .widget)');
    expect(widgetSwift).toContain('BrandLogoCatalog.assetName(for: entry.brandId)');
  });

  it('gives near-white brand logos a dark chip so they stay visible', () => {
    const catalog = fs.readFileSync(path.join(widgetDir, 'BrandLogoCatalog.swift'), 'utf8');
    expect(catalog).toContain('static func prefersDarkBacking(for brandId: String?) -> Bool');
    // Logos whose artwork is near-white would disappear on the default white chip.
    for (const lightBrand of ['coop', 'intimissimi', 'stroili', 'conad', 'tigota']) {
      expect(catalog).toContain(`"${lightBrand}"`);
    }
    expect(widgetSwift).toContain('BrandLogoCatalog.prefersDarkBacking(for: entry.brandId)');
  });

  it('shows the open-app glyph from a real, non-placeholder asset', () => {
    expect(widgetSwift).toContain('Image("OpenAppIcon")');
    // The empty, name-colliding AppIcon imageset must not be referenced.
    expect(widgetSwift).not.toContain('Image("AppIcon")');
    const openAppDir = path.join(assetsDir, 'OpenAppIcon.imageset');
    expect(fs.existsSync(path.join(openAppDir, 'Contents.json'))).toBe(true);
    expect(fs.existsSync(path.join(assetsDir, 'AppIcon.imageset'))).toBe(false);
    // Guard against regressing to the flat-color placeholder (<1 KB). A real
    // rendered icon is several KB.
    const at3x = fs.statSync(path.join(openAppDir, 'open-app-icon@3x.png')).size;
    expect(at3x).toBeGreaterThan(3000);
  });

  it('keeps the widget asset catalog well-formed (valid colorset Contents.json)', () => {
    for (const set of ['$widgetBackground.colorset', 'AccentColor.colorset']) {
      const contents = path.join(assetsDir, set, 'Contents.json');
      expect(fs.existsSync(contents)).toBe(true);
      expect(() => JSON.parse(fs.readFileSync(contents, 'utf8'))).not.toThrow();
    }
  });
});
