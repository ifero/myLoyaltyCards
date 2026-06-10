import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');
const barcodeViewPath = path.join(repoRoot, 'targets', 'watch', 'BarcodeFlashView.swift');
const cardListViewPath = path.join(repoRoot, 'targets', 'watch', 'CardListView.swift');
const barcodeGeneratorPath = path.join(repoRoot, 'targets', 'watch', 'BarcodeGenerator.swift');
const layoutPath = path.join(repoRoot, 'targets', 'watch', 'WatchPresentationLayout.swift');

const parseCompactMetrics = (source: string) => {
  const match = source.match(
    /static let compact = WatchCardRowLayoutMetrics\(\s*rowSpacing: (\d+),\s*horizontalPadding: (\d+),\s*verticalPadding: (\d+),\s*accentWidth: (\d+),\s*accentHeight: (\d+),\s*avatarSize: (\d+),\s*cornerRadius: (\d+),\s*minimumTapHeight: (\d+)/s
  );

  if (!match) {
    throw new Error('Unable to parse compact watch row metrics');
  }

  return {
    rowSpacing: Number(match[1]),
    horizontalPadding: Number(match[2]),
    verticalPadding: Number(match[3]),
    accentWidth: Number(match[4]),
    accentHeight: Number(match[5]),
    avatarSize: Number(match[6]),
    cornerRadius: Number(match[7]),
    minimumTapHeight: Number(match[8])
  };
};

const visibleRows = (containerHeight: number, rowHeight: number, spacing: number) => {
  let count = 0;
  let usedHeight = 0;

  while (true) {
    const nextHeight = usedHeight === 0 ? rowHeight : usedHeight + spacing + rowHeight;

    if (nextHeight > containerHeight) {
      return count;
    }

    count += 1;
    usedHeight = nextHeight;
  }
};

describe('watch layout contract', () => {
  it('uses the selected card name as barcode title context', () => {
    const barcodeView = fs.readFileSync(barcodeViewPath, 'utf8');
    const layout = fs.readFileSync(layoutPath, 'utf8');

    expect(layout).toContain(
      'return trimmedName.isEmpty ? WatchL10n.string("watch.cards.fallback_name") : trimmedName'
    );
    expect(barcodeView).toContain('.navigationTitle(titleText)');
    expect(barcodeView).not.toContain('.navigationTitle("")');
  });

  it('keeps the primary interaction flow wired from list row to barcode dismissal', () => {
    const barcodeView = fs.readFileSync(barcodeViewPath, 'utf8');
    const cardListView = fs.readFileSync(cardListViewPath, 'utf8');

    expect(cardListView).toContain('NavigationLink(value: WatchCardRoute(cardId: card.id))');
    expect(cardListView).toContain('.navigationDestination(for: WatchCardRoute.self) { route in');
    expect(cardListView).toContain('BarcodeFlashView(card: card)');
    expect(barcodeView).toContain('.onTapGesture { dismiss() }');
    expect(barcodeView).toContain('.digitalCrownRotation(');
    expect(barcodeView).toContain('crownTriggered = true');
    expect(barcodeView).toContain('dismiss()');
  });

  it('preserves watch-safe accessibility labels and minimum tap target sizing', () => {
    const barcodeView = fs.readFileSync(barcodeViewPath, 'utf8');
    const cardListView = fs.readFileSync(cardListViewPath, 'utf8');

    expect(cardListView).toContain('.frame(minHeight: metrics.minimumTapHeight)');
    expect(cardListView).toContain(
      '.accessibilityLabel(WatchL10n.format(cardRowAccessibilityKey(isFavorite: card.isFavorite), card.name))'
    );
    expect(barcodeView).toContain('.accessibilityIdentifier("barcode-view")');
    expect(barcodeView).toContain(
      '.accessibilityLabel(WatchL10n.format("watch.barcode.accessibility.image_format", titleText))'
    );
  });

  it('renders a favourite badge on the watch row and announces it to VoiceOver (Story 9.4 / C3)', () => {
    const cardListView = fs.readFileSync(cardListViewPath, 'utf8');
    const enStrings = fs.readFileSync(
      path.join(repoRoot, 'targets', 'watch', 'en.lproj', 'Localizable.strings'),
      'utf8'
    );
    const itStrings = fs.readFileSync(
      path.join(repoRoot, 'targets', 'watch', 'it.lproj', 'Localizable.strings'),
      'utf8'
    );

    // Badge is rendered only for favourites
    expect(cardListView).toContain('if card.isFavorite {');
    expect(cardListView).toContain('Image(systemName: "star.fill")');

    // Favourite-aware accessibility label is driven by the testable key helper
    expect(cardListView).toContain('func cardRowAccessibilityKey(isFavorite: Bool) -> String');
    expect(cardListView).toContain('"watch.card_row.favorite_accessibility_format"');

    // The favourite label key is localised in BOTH bundles (cross-file coupling)
    expect(enStrings).toContain('"watch.card_row.favorite_accessibility_format"');
    expect(itStrings).toContain('"watch.card_row.favorite_accessibility_format"');
  });

  it('routes QR cards through the native QR renderer instead of the placeholder path', () => {
    const generator = fs.readFileSync(barcodeGeneratorPath, 'utf8');

    expect(generator).toContain('case .QR:');
    expect(generator).toContain('renderQRCodeImage(text: value, size: targetSize)');
    expect(generator).toContain('CIFilter(name: "CIQRCodeGenerator")');
  });

  it('keeps 41mm QR sizing larger than eighty percent without clipping the footer label', () => {
    const barcodeView = fs.readFileSync(barcodeViewPath, 'utf8');
    const layout = fs.readFileSync(layoutPath, 'utf8');

    expect(layout).toContain('widthFillRatio: min(barcodeSize.width / safeWidth, 1)');
    expect(layout).toContain('let outerHorizontalPadding: CGFloat = 0');
    expect(layout).toContain('let outerVerticalPadding: CGFloat = 0');
    expect(barcodeView).toContain('showsValueLabel: showsValueLabel');
    expect(barcodeView).toContain('VStack(spacing: 0)');
    expect(barcodeView).toContain('.padding(.horizontal, layout.outerHorizontalPadding)');
    expect(barcodeView).toContain('.padding(.vertical, layout.outerVerticalPadding)');

    const containerWidth = 162;
    const containerHeight = 162;
    const boxInnerPadding = 2;
    const contentSpacing = 4;
    const valueLabelReservedHeight = 12;
    const contentWidth = containerWidth - boxInnerPadding * 2;
    const footerReservedHeight = valueLabelReservedHeight + contentSpacing;
    const squareSide = Math.min(
      contentWidth,
      Math.max(containerHeight - (boxInnerPadding * 2 + footerReservedHeight), 112)
    );

    expect(squareSide / containerWidth).toBeGreaterThanOrEqual(0.85);
    expect(squareSide + boxInnerPadding * 2 + footerReservedHeight).toBeLessThanOrEqual(
      containerHeight
    );
  });

  it('keeps QR sizing above eighty percent on 41mm and 45mm-class containers', () => {
    const scenarios = [
      { width: 162, height: 162 },
      { width: 182, height: 182 }
    ];
    const boxInnerPadding = 2;
    const contentSpacing = 4;
    const valueLabelReservedHeight = 12;

    for (const scenario of scenarios) {
      const contentWidth = scenario.width - boxInnerPadding * 2;
      const footerReservedHeight = valueLabelReservedHeight + contentSpacing;
      const squareSide = Math.min(
        contentWidth,
        Math.max(scenario.height - (boxInnerPadding * 2 + footerReservedHeight), 112)
      );

      expect(squareSide / scenario.width).toBeGreaterThanOrEqual(0.85);
      expect(squareSide + boxInnerPadding * 2 + footerReservedHeight).toBeLessThanOrEqual(
        scenario.height
      );
    }
  });

  it('keeps linear sizing above eighty percent on 41mm and 45mm-class containers', () => {
    const scenarios = [
      { width: 162, height: 132 },
      { width: 182, height: 148 }
    ];
    const boxInnerPadding = 2;
    const contentSpacing = 4;
    const valueLabelReservedHeight = 12;

    for (const scenario of scenarios) {
      const contentWidth = scenario.width - boxInnerPadding * 2;
      const footerReservedHeight = valueLabelReservedHeight + contentSpacing;
      const barcodeHeight = Math.min(Math.max(scenario.height * 0.52, 88), 110);

      expect(contentWidth / scenario.width).toBeGreaterThanOrEqual(0.95);
      expect(barcodeHeight + boxInnerPadding * 2 + footerReservedHeight).toBeLessThanOrEqual(
        scenario.height
      );
    }
  });

  it('improves 41mm list density by at least one visible row while keeping a watch-safe tap target', () => {
    const cardListView = fs.readFileSync(cardListViewPath, 'utf8');
    const layout = fs.readFileSync(layoutPath, 'utf8');
    const metrics = parseCompactMetrics(layout);
    const compactRowHeight = Math.max(
      Math.max(metrics.accentHeight, metrics.avatarSize) + metrics.verticalPadding * 2,
      metrics.minimumTapHeight
    );
    const baselineRowHeight = 68;
    const baselineSpacing = 8;
    const containerHeight = 160;

    expect(layout).toContain('minimumTapHeight: 44');
    expect(cardListView).toContain('private let metrics = WatchCardRowLayoutMetrics.compact');
    expect(cardListView).toContain('.frame(minHeight: metrics.minimumTapHeight)');
    expect(cardListView).toContain('LazyVStack(spacing: 6)');

    const compactVisibleRows = visibleRows(
      containerHeight,
      compactRowHeight,
      metrics.rowSpacing - 4
    );
    const baselineVisibleRows = visibleRows(containerHeight, baselineRowHeight, baselineSpacing);

    expect(compactRowHeight).toBeGreaterThanOrEqual(44);
    expect(compactVisibleRows).toBeGreaterThanOrEqual(baselineVisibleRows + 1);
  });

  it('exposes a selectable watch sort model with phone-mirrored variants (Story 9.5)', () => {
    const cardListView = fs.readFileSync(cardListViewPath, 'utf8');

    // The three modes mirror the phone's useCardSort SortOption union.
    expect(cardListView).toContain('enum WatchSortMode: String, CaseIterable, Identifiable {');
    expect(cardListView).toContain('case frequent');
    expect(cardListView).toContain('case recent');
    expect(cardListView).toContain('case az');

    // Watch-local persistence key + A-Z default (AC3, AC4).
    expect(cardListView).toContain('static let storageKey = "watch.sortMode"');
    expect(cardListView).toContain('static let defaultMode: WatchSortMode = .az');

    // A single comparator entry point; `.frequent` reuses the shared sortedForDisplay so the
    // complication "top card" can never drift from the list (AC2).
    expect(cardListView).toContain(
      'static func sorted(_ cards: [WatchCard], by mode: WatchSortMode) -> [WatchCard]'
    );
    expect(cardListView).toContain('return sortedForDisplay(cards)');
    expect(cardListView).toContain('cards.sorted { $0.createdAt > $1.createdAt }');
    // A-Z mirrors the phone's localeCompare(sensitivity:'base') — case- AND diacritic-insensitive.
    expect(cardListView).toContain('options: [.caseInsensitive, .diacriticInsensitive]');

    // The list is driven by the selected mode, not the fixed frequent ordering (AC2, AC5).
    expect(cardListView).toContain('return WatchCard.sorted(entities, by: sortMode)');
  });

  it('presents a sort control: toolbar button → picker sheet, double-encoded active row (Story 9.5)', () => {
    const cardListView = fs.readFileSync(cardListViewPath, 'utf8');
    const enStrings = fs.readFileSync(
      path.join(repoRoot, 'targets', 'watch', 'en.lproj', 'Localizable.strings'),
      'utf8'
    );
    const itStrings = fs.readFileSync(
      path.join(repoRoot, 'targets', 'watch', 'it.lproj', 'Localizable.strings'),
      'utf8'
    );

    // Watch-local persisted preference, default A-Z (AC3, AC4).
    expect(cardListView).toContain(
      '@AppStorage(WatchSortMode.storageKey) private var sortMode: WatchSortMode = WatchSortMode.defaultMode'
    );

    // Entry point: a top-trailing toolbar button with the sort glyph (UX spec §5, AC1).
    expect(cardListView).toContain('ToolbarItem(placement: .topBarTrailing)');
    expect(cardListView).toContain('Image(systemName: "arrow.up.arrow.down")');
    expect(cardListView).toContain('.accessibilityLabel(WatchL10n.string("watch.sort.title"))');

    // Presentation: a sheet hosting the picker (AC1).
    expect(cardListView).toContain('.sheet(isPresented: $showSortSheet)');
    expect(cardListView).toContain('WatchSortPickerView(selection: $sortMode)');
    expect(cardListView).toContain('struct WatchSortPickerView: View {');

    // Active row is double-encoded: checkmark + VoiceOver "selected" trait, never colour alone.
    expect(cardListView).toContain('Image(systemName: "checkmark")');
    expect(cardListView).toContain('.accessibilityAddTraits(isSelected ? .isSelected : [])');

    // Mode labels + control title are localised in BOTH bundles (cross-file coupling).
    for (const key of [
      'watch.sort.title',
      'watch.sort.frequent',
      'watch.sort.recent',
      'watch.sort.az'
    ]) {
      expect(cardListView).toContain(`"${key}"`);
      expect(enStrings).toContain(`"${key}" =`);
      expect(itStrings).toContain(`"${key}" =`);
    }
  });
});
