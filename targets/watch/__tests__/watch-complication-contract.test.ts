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
