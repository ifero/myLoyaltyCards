import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  brandLogoImagesets,
  parseSwiftStringSet,
  writeUniformPNG
} from './watch-catalogue-helpers';

type Brand = {
  id: string;
};

const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'watch-ios', 'Scripts', 'generate-catalogue.swift');
const cataloguePath = path.join(repoRoot, 'catalogue', 'italy.json');
const assetsDir = path.join(repoRoot, 'targets', 'watch-widget', 'Assets.xcassets');
const brandLogoConsumerPath = path.join(
  repoRoot,
  'targets',
  'watch-widget',
  'BrandLogoCatalog.swift'
);

// Each test generates into a throwaway temp directory via CATALOGUE_OUTPUT_PATH /
// WIDGET_CATALOG_OUTPUT_PATH / WATCH_CATALOG_OUTPUT_PATH / WATCH_RESOLVER_OUTPUT_PATH,
// and mirrors imagesets into a throwaway WATCH_ASSETS_PATH, so the tracked generated
// sources and the tracked targets/watch/Assets.xcassets are never mutated by the suite.
let generatedDir: string;
let generatedFile: string;
let widgetGeneratedFile: string;
let watchGeneratedFile: string;
let watchResolverFile: string;
let watchAssetsDir: string;

const runGenerator = (env?: Record<string, string | undefined>) => {
  return execFileSync('xcrun', ['--sdk', 'macosx', 'swift', scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
      CATALOGUE_OUTPUT_PATH: generatedFile,
      WIDGET_CATALOG_OUTPUT_PATH: widgetGeneratedFile,
      WATCH_CATALOG_OUTPUT_PATH: watchGeneratedFile,
      WATCH_RESOLVER_OUTPUT_PATH: watchResolverFile,
      WATCH_ASSETS_PATH: watchAssetsDir
    },
    stdio: 'pipe'
  }).toString('utf8');
};

/**
 * Runs the generator and returns BOTH streams. `execFileSync` returns stdout only, so
 * `runGenerator` cannot see anything the generator writes to stderr — which is where
 * every warning goes. An assertion about a warning made against `runGenerator`'s
 * return value is vacuously true.
 */
const runGeneratorCapturingBothStreams = (
  env?: Record<string, string | undefined>
): { stdout: string; stderr: string; status: number | null } => {
  const result = spawnSync('xcrun', ['--sdk', 'macosx', 'swift', scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
      CATALOGUE_OUTPUT_PATH: generatedFile,
      WIDGET_CATALOG_OUTPUT_PATH: widgetGeneratedFile,
      WATCH_CATALOG_OUTPUT_PATH: watchGeneratedFile,
      WATCH_RESOLVER_OUTPUT_PATH: watchResolverFile,
      WATCH_ASSETS_PATH: watchAssetsDir
    },
    encoding: 'utf8'
  });
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status };
};

const runGeneratorExpectingFailure = (env?: Record<string, string | undefined>): string => {
  try {
    runGenerator(env);
  } catch (error) {
    const nodeError = error as { status?: number; stderr?: Buffer; message?: string };
    expect(nodeError.status).toBe(1);
    return nodeError.stderr?.toString() || nodeError.message || '';
  }
  throw new Error('Expected the generator to exit non-zero, but it succeeded');
};

// Brand logos whose rendered artwork is near-white, derived by the generator from
// per-logo luminance. Intentionally a superset of the older hand-maintained list:
// it also catches lotteria-degli-scontrini, whose white outline-text logo would
// vanish on the default white chip. Update deliberately when logo art changes.
const EXPECTED_LIGHT_LOGO_IDS = [
  'conad',
  'coop',
  'intimissimi',
  'lotteria-degli-scontrini',
  'stroili',
  'tigota'
].sort();

const brandSlugOf = (imagesetName: string): string =>
  imagesetName.replace(/^BrandLogo-/, '').replace(/\.imageset$/, '');

describe('watchOS catalogue generation', () => {
  beforeEach(() => {
    generatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watch-generated-'));
    generatedFile = path.join(generatedDir, 'Brands.swift');
    widgetGeneratedFile = path.join(generatedDir, 'BrandLogoCatalog.generated.swift');
    watchGeneratedFile = path.join(generatedDir, 'watch-BrandLogoCatalog.generated.swift');
    watchResolverFile = path.join(generatedDir, 'watch-BrandLogoCatalog.swift');
    // The generator refuses to invent an asset catalogue, so the destination has to
    // exist — the same precondition the real targets/watch/Assets.xcassets satisfies.
    watchAssetsDir = path.join(generatedDir, 'Assets.xcassets');
    fs.mkdirSync(watchAssetsDir);
  });

  afterEach(() => {
    fs.rmSync(generatedDir, { recursive: true, force: true });
  });

  it('generates Brands.swift from catalogue/italy.json', () => {
    runGenerator();

    expect(fs.existsSync(generatedFile)).toBe(true);

    const generated = fs.readFileSync(generatedFile, 'utf8');
    const catalogue = JSON.parse(fs.readFileSync(cataloguePath, 'utf8')) as {
      brands: Brand[];
    };

    for (const brand of catalogue.brands) {
      expect(generated).toContain(`id: "${brand.id}"`);
    }

    // No per-brand asset path is emitted. Nothing consumed it (the watch app draws
    // initials, the widget resolves BrandLogo-<id>.imageset), and it hardcoded a
    // ".svg" suffix that was wrong for the PNG-logo brands. Asserting its absence
    // keeps it from creeping back in with the same broken assumption.
    expect(generated).not.toContain('logoUrl');
  });

  it('skips regeneration when inputs are unchanged', () => {
    runGenerator();
    const firstContents = fs.readFileSync(generatedFile, 'utf8');

    const secondOutput = runGenerator();
    expect(secondOutput).toContain('Inputs unchanged; skipping catalogue generation.');

    const secondContents = fs.readFileSync(generatedFile, 'utf8');
    expect(secondContents).toBe(firstContents);
  });

  it('regenerates when the catalogue input changes', () => {
    runGenerator();
    const beforeContents = fs.readFileSync(generatedFile, 'utf8');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watch-catalogue-'));
    const customCataloguePath = path.join(tempDir, 'catalogue.json');
    const fixture = {
      version: '2026-02-13',
      brands: [
        {
          id: 'brand-special',
          logo: 'demo',
          name: 'Special Brand',
          aliases: ['Special']
        }
      ]
    };

    fs.writeFileSync(customCataloguePath, JSON.stringify(fixture), 'utf8');

    runGenerator({ CATALOGUE_JSON_PATH: customCataloguePath });
    const afterContents = fs.readFileSync(generatedFile, 'utf8');

    expect(afterContents).not.toBe(beforeContents);
    expect(afterContents).toContain('id: "brand-special"');
    expect(afterContents).toContain('name: "Special Brand"');
  });

  it('fails check mode when the committed generated output is stale', () => {
    fs.writeFileSync(generatedFile, '// STALE', 'utf8');

    const errorOutput = runGeneratorExpectingFailure({ CATALOGUE_GENERATOR_CHECK: '1' });

    expect(errorOutput).toContain('Generated catalogue differs from committed Brands.swift');
  });

  it('passes check mode when the generated output is up to date', () => {
    runGenerator();
    const output = runGenerator({ CATALOGUE_GENERATOR_CHECK: '1' });
    expect(output).toContain('Generated catalogue is up to date.');
  });

  // NOTE: The 'configures Xcode build integration' test was removed because the Xcode project
  // is now generated dynamically by `expo prebuild` via @bacons/apple-targets. Build integration
  // is validated by the CI workflow (watchos-tests.yml) which runs `expo prebuild` + `xcodebuild test`.

  it('escapes special characters and generated file type-checks', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watch-catalogue-'));
    const customCataloguePath = path.join(tempDir, 'catalogue.json');

    const fixture = {
      version: '2026-02-13',
      brands: [
        {
          id: 'brand-special',
          logo: 'demo',
          name: 'Line1\nLine2\t"Quoted"\\Backslash',
          aliases: ['A\nB', 'Tab\tAlias', 'Quote " alias', 'Slash \\ alias']
        }
      ]
    };

    fs.writeFileSync(customCataloguePath, JSON.stringify(fixture), 'utf8');

    runGenerator({ CATALOGUE_JSON_PATH: customCataloguePath });

    const generated = fs.readFileSync(generatedFile, 'utf8');
    expect(generated).toContain('name: "Line1\\nLine2\\t\\"Quoted\\"\\\\Backslash"');
    expect(generated).toContain('"A\\nB"');
    expect(generated).toContain('"Tab\\tAlias"');
    expect(generated).toContain('"Quote \\" alias"');
    expect(generated).toContain('"Slash \\\\ alias"');

    execFileSync('xcrun', ['--sdk', 'macosx', 'swiftc', '-typecheck', generatedFile], {
      cwd: repoRoot,
      stdio: 'pipe'
    });
  });

  it('generates the widget BrandLogoCatalog from the bundled imagesets', () => {
    runGenerator();

    expect(fs.existsSync(widgetGeneratedFile)).toBe(true);
    const generated = fs.readFileSync(widgetGeneratedFile, 'utf8');

    // knownBrandIds must equal exactly the BrandLogo-*.imageset folders that ship a PNG —
    // the precise condition for Image("BrandLogo-<slug>") resolving in the widget.
    const expectedKnown = fs
      .readdirSync(assetsDir)
      .filter((name) => /^BrandLogo-.+\.imageset$/.test(name))
      .filter((name) =>
        fs
          .readdirSync(path.join(assetsDir, name))
          .some((file) => file.toLowerCase().endsWith('.png'))
      )
      .map((name) => name.replace(/^BrandLogo-/, '').replace(/\.imageset$/, ''))
      .sort();

    expect(parseSwiftStringSet(generated, 'knownBrandIds')).toEqual(expectedKnown);
  });

  it('classifies near-white brand logos as needing a dark chip', () => {
    runGenerator();
    const generated = fs.readFileSync(widgetGeneratedFile, 'utf8');

    expect(parseSwiftStringSet(generated, 'lightLogoBrandIds')).toEqual(EXPECTED_LIGHT_LOGO_IDS);
  });

  it('generates a widget catalog that type-checks with its consumer', () => {
    runGenerator();

    execFileSync(
      'xcrun',
      ['--sdk', 'macosx', 'swiftc', '-typecheck', widgetGeneratedFile, brandLogoConsumerPath],
      { cwd: repoRoot, stdio: 'pipe' }
    );
  });

  it('fails check mode when the committed widget catalog is stale', () => {
    // Bring both outputs up to date, then corrupt only the widget catalog so the
    // failure is attributable to it (Brands.swift stays current).
    runGenerator();
    fs.writeFileSync(widgetGeneratedFile, '// STALE', 'utf8');

    const errorOutput = runGeneratorExpectingFailure({ CATALOGUE_GENERATOR_CHECK: '1' });

    expect(errorOutput).toContain(
      'Generated widget catalog differs from committed BrandLogoCatalog.generated.swift'
    );
  });

  // The watch app and the widget are separate targets with separate bundles, so
  // Image("BrandLogo-<slug>") only resolves in a target that ships the imageset.
  // Story 16.29 makes the generator mirror the widget's logos and its resolver into
  // the watch app target, which is what lets the card list draw real artwork.
  describe('watch app brand-logo mirror', () => {
    it('mirrors every widget brand-logo imageset into the watch app catalogue', () => {
      runGenerator();

      const expected = brandLogoImagesets(assetsDir);
      expect(expected.length).toBeGreaterThan(0);
      expect(brandLogoImagesets(watchAssetsDir)).toEqual(expected);

      // Byte-identical, not merely present: the shared brand-id sets are only
      // truthful for both targets if the artwork is the same artwork.
      for (const imageset of expected) {
        const source = path.join(assetsDir, imageset);
        const mirrored = path.join(watchAssetsDir, imageset);
        const files = fs.readdirSync(source).sort();
        expect(fs.readdirSync(mirrored).sort()).toEqual(files);
        for (const file of files) {
          expect(fs.readFileSync(path.join(mirrored, file))).toEqual(
            fs.readFileSync(path.join(source, file))
          );
        }
      }
    });

    it('emits the watch app catalog with the same brand-id sets as the widget', () => {
      runGenerator();

      const watchCatalog = fs.readFileSync(watchGeneratedFile, 'utf8');
      const widgetCatalog = fs.readFileSync(widgetGeneratedFile, 'utf8');

      for (const set of ['knownBrandIds', 'lightLogoBrandIds']) {
        expect(parseSwiftStringSet(watchCatalog, set)).toEqual(
          parseSwiftStringSet(widgetCatalog, set)
        );
      }
    });

    it('mirrors the authored BrandLogoCatalog resolver verbatim', () => {
      runGenerator();

      const mirrored = fs.readFileSync(watchResolverFile, 'utf8');
      const authored = fs.readFileSync(brandLogoConsumerPath, 'utf8');

      expect(mirrored).toContain('// DO NOT EDIT — This file is auto-generated.');
      // Verbatim: the logic is authored once. Anything else would be a second copy
      // to maintain, which is the thing the mirror exists to avoid.
      expect(mirrored).toContain(authored);
    });

    it('generates a watch app catalog that type-checks with its mirrored resolver', () => {
      runGenerator();

      execFileSync(
        'xcrun',
        ['--sdk', 'macosx', 'swiftc', '-typecheck', watchGeneratedFile, watchResolverFile],
        { cwd: repoRoot, stdio: 'pipe' }
      );
    });

    it('removes orphaned brand-logo imagesets from the watch app catalogue', () => {
      const orphan = path.join(watchAssetsDir, 'BrandLogo-gone-away.imageset');
      fs.mkdirSync(orphan);
      fs.writeFileSync(path.join(orphan, 'Contents.json'), '{}', 'utf8');

      runGenerator();

      expect(fs.existsSync(orphan)).toBe(false);
    });

    it('leaves the watch app catalogue entries it does not own alone', () => {
      const accentColor = path.join(watchAssetsDir, 'AccentColor.colorset');
      fs.mkdirSync(accentColor);
      fs.writeFileSync(path.join(accentColor, 'Contents.json'), '{"info":{}}', 'utf8');
      const rootContents = path.join(watchAssetsDir, 'Contents.json');
      fs.writeFileSync(rootContents, '{"info":{}}', 'utf8');

      runGenerator();

      expect(fs.existsSync(path.join(accentColor, 'Contents.json'))).toBe(true);
      expect(fs.readFileSync(rootContents, 'utf8')).toBe('{"info":{}}');
    });

    it('re-mirrors a deleted imageset even though the input hash is unchanged', () => {
      runGenerator();
      const [firstImageset] = brandLogoImagesets(watchAssetsDir);
      expect(firstImageset).toBeDefined();
      fs.rmSync(path.join(watchAssetsDir, firstImageset as string), { recursive: true });

      // The stored hash covers inputs only, so a missing output must not be masked
      // by the "inputs unchanged" fast path.
      const output = runGenerator();

      expect(output).not.toContain('Inputs unchanged; skipping catalogue generation.');
      expect(brandLogoImagesets(watchAssetsDir)).toContain(firstImageset);
    });

    it('replaces an imageset whose artwork changed, restoring it byte for byte', () => {
      runGenerator();
      const [imageset] = brandLogoImagesets(watchAssetsDir);
      const mirrored = path.join(watchAssetsDir, imageset as string);
      const [png] = fs.readdirSync(mirrored).filter((file) => file.endsWith('.png'));
      const victim = path.join(mirrored, png as string);
      fs.writeFileSync(victim, 'not the real artwork', 'utf8');

      // Exercises the replace-in-place branch (destination exists but differs),
      // rather than the fresh-copy branch every other mirror test takes.
      const output = runGenerator();

      expect(output).toContain('Mirrored brand-logo imagesets');
      expect(fs.readFileSync(victim)).toEqual(
        fs.readFileSync(path.join(assetsDir, imageset as string, png as string))
      );
      expect(fs.readdirSync(watchAssetsDir).filter((e) => e.startsWith('.'))).toEqual([]);
    });

    it('fails check mode when the watch app imagesets are out of sync', () => {
      runGenerator();
      const [firstImageset] = brandLogoImagesets(watchAssetsDir);
      fs.rmSync(path.join(watchAssetsDir, firstImageset as string), { recursive: true });

      const errorOutput = runGeneratorExpectingFailure({ CATALOGUE_GENERATOR_CHECK: '1' });

      expect(errorOutput).toContain("Watch app brand-logo imagesets differ from the widget's");
      expect(errorOutput).toContain(firstImageset as string);
    });

    it('fails check mode when the mirrored resolver has drifted from the authored copy', () => {
      runGenerator();
      fs.writeFileSync(watchResolverFile, '// STALE', 'utf8');

      const errorOutput = runGeneratorExpectingFailure({ CATALOGUE_GENERATOR_CHECK: '1' });

      expect(errorOutput).toContain(
        'Generated watch app BrandLogoCatalog.swift differs from the authored targets/watch-widget/BrandLogoCatalog.swift'
      );
    });

    it('fails check mode when the committed watch app catalog is stale', () => {
      runGenerator();
      fs.writeFileSync(watchGeneratedFile, '// STALE', 'utf8');

      const errorOutput = runGeneratorExpectingFailure({ CATALOGUE_GENERATOR_CHECK: '1' });

      expect(errorOutput).toContain(
        'Generated watch app catalog differs from committed targets/watch/Generated/BrandLogoCatalog.generated.swift'
      );
    });

    it('reports an unreadable authored resolver alongside other drift, not instead of it', () => {
      runGenerator();
      fs.writeFileSync(generatedFile, '// STALE', 'utf8');

      // Without the authored resolver there is nothing to compare the mirror against,
      // but the other three artifacts are already computed — aborting here would hide
      // the stale Brands.swift until a second run.
      const missingResolver = path.join(generatedDir, 'does-not-exist.swift');
      const errorOutput = runGeneratorExpectingFailure({
        RESOLVER_SOURCE_PATH: missingResolver,
        CATALOGUE_GENERATOR_CHECK: '1'
      });

      expect(errorOutput).toContain('Unable to read the authored BrandLogoCatalog.swift');
      // The path it actually tried, not the default: a message naming a file this run
      // never opened sends the reader to the wrong place.
      expect(errorOutput).toContain(missingResolver);
      expect(errorOutput).toContain('Generated catalogue differs from committed Brands.swift');
    });

    it('reports leftover staging debris without writing, and sweeps it on the next write', () => {
      runGenerator();
      const debris = path.join(watchAssetsDir, '.mirror-staging-BrandLogo-leftover.imageset');
      fs.mkdirSync(debris);

      // --check is a CI gate and must not mutate the tree, so it reports rather than
      // sweeps; the debris has to still be there afterwards.
      const errorOutput = runGeneratorExpectingFailure({ CATALOGUE_GENERATOR_CHECK: '1' });
      expect(errorOutput).toContain('leftover staging from an interrupted mirror run');
      expect(fs.existsSync(debris)).toBe(true);

      const output = runGenerator();
      expect(fs.existsSync(debris)).toBe(false);
      expect(output).toContain('Cleared 1 leftover staging directory.');
      // Debris alone is not a mirror change: claiming "Mirrored … ()" for a run whose
      // copy loop did nothing was the round-8 finding.
      expect(output).toContain('already in sync');
      expect(output).not.toContain('Mirrored brand-logo imagesets');
    });

    it('refuses to invent a watch app asset catalogue', () => {
      fs.rmSync(watchAssetsDir, { recursive: true });

      const errorOutput = runGeneratorExpectingFailure();

      expect(errorOutput).toContain('Unable to locate the watch app asset catalogue');
      expect(errorOutput).toContain(watchAssetsDir);
    });

    it('reports a missing destination catalogue alongside other drift in --check', () => {
      runGenerator();
      fs.writeFileSync(generatedFile, '// STALE', 'utf8');
      fs.rmSync(watchAssetsDir, { recursive: true });

      // Aborting on the destination would hide the stale artifact until a second run —
      // the same collect-all rule the malformed and unreadable cases follow.
      const errorOutput = runGeneratorExpectingFailure({ CATALOGUE_GENERATOR_CHECK: '1' });

      expect(errorOutput).toContain('Generated catalogue differs from committed Brands.swift');
      expect(errorOutput).toContain('Unable to locate the watch app asset catalogue');
    });

    it('still reports a malformed source when the destination catalogue is missing too', () => {
      const fixtureSource = path.join(generatedDir, 'MalformedNoDestination.xcassets');
      fs.mkdirSync(fixtureSource);
      fs.writeFileSync(path.join(fixtureSource, 'BrandLogo-broken.imageset'), 'x', 'utf8');
      fs.rmSync(watchAssetsDir, { recursive: true });

      // Source-side facts do not need a destination, so a missing one must not hide them.
      const errorOutput = runGeneratorExpectingFailure({
        WIDGET_ASSETS_PATH: fixtureSource,
        CATALOGUE_GENERATOR_CHECK: '1'
      });

      expect(errorOutput).toContain('Unable to locate the watch app asset catalogue');
      expect(errorOutput).toContain('BrandLogo-broken.imageset');
      expect(errorOutput).toContain('is not a directory');
    });

    it('reports an unreadable source imageset without deleting its mirrored copy', () => {
      const fixtureSource = path.join(generatedDir, 'UnreadableSource.xcassets');
      fs.mkdirSync(fixtureSource);
      const [good] = brandLogoImagesets(assetsDir);
      const sourceImageset = path.join(fixtureSource, good as string);
      fs.cpSync(path.join(assetsDir, good as string), sourceImageset, { recursive: true });
      runGenerator({ WIDGET_ASSETS_PATH: fixtureSource });

      fs.chmodSync(sourceImageset, 0o000);
      const readable = (() => {
        try {
          fs.readdirSync(sourceImageset);
          return true;
        } catch {
          return false;
        }
      })();

      try {
        if (!readable) {
          const errorOutput = runGeneratorExpectingFailure({
            WIDGET_ASSETS_PATH: fixtureSource,
            CATALOGUE_GENERATOR_CHECK: '1'
          });
          expect(errorOutput).toContain('could not be read, so its mirror cannot be verified');

          // The valid, tracked mirror must survive: an unreadable source is a transient
          // local problem, and treating it as "artwork deleted" would remove real assets.
          runGeneratorExpectingFailure({ WIDGET_ASSETS_PATH: fixtureSource });
          expect(brandLogoImagesets(watchAssetsDir)).toEqual([good]);
        }
      } finally {
        fs.chmodSync(sourceImageset, 0o755);
      }
    });

    it('removes a mirrored copy once its source loses all artwork', () => {
      const fixtureSource = path.join(generatedDir, 'ArtworkRemoved.xcassets');
      fs.mkdirSync(fixtureSource);
      const [good] = brandLogoImagesets(assetsDir);
      const sourceImageset = path.join(fixtureSource, good as string);
      fs.cpSync(path.join(assetsDir, good as string), sourceImageset, { recursive: true });
      runGenerator({ WIDGET_ASSETS_PATH: fixtureSource });
      expect(brandLogoImagesets(watchAssetsDir)).toEqual([good]);

      // Folder kept, artwork withdrawn the way Xcode would leave it — PNGs deleted AND
      // Contents.json emptied. (Deleting only the PNGs leaves Contents.json declaring
      // files that are gone, which the generator refuses as inconsistent instead; that
      // is covered by its own test.) The brand stops being "known", so the mirror must
      // not keep shipping a folder nothing can resolve.
      for (const png of fs.readdirSync(sourceImageset).filter((f) => f.endsWith('.png'))) {
        fs.rmSync(path.join(sourceImageset, png));
      }
      fs.writeFileSync(
        path.join(sourceImageset, 'Contents.json'),
        JSON.stringify({ images: [], info: { version: 1, author: 'xcode' } }),
        'utf8'
      );

      runGenerator({ WIDGET_ASSETS_PATH: fixtureSource });

      expect(brandLogoImagesets(watchAssetsDir)).toEqual([]);
      expect(
        parseSwiftStringSet(fs.readFileSync(watchGeneratedFile, 'utf8'), 'knownBrandIds')
      ).toEqual([]);
    });

    it('ignores a dotfile that ends in .png when classifying and mirroring', () => {
      // AppleDouble sidecars (`._name@3x.png`) appear when PNGs travel via exFAT or
      // some SMB shares. One sorts BEFORE the real file and ends in `.png`, so an
      // unfiltered scan would pick it as the rendition to analyse — and being
      // undecodable, would silently cost a light logo its dark chip. `--check` could
      // never catch that: it would reproduce the same wrong answer from the same source.
      const fixtureSource = path.join(generatedDir, 'AppleDoubleSidecar.xcassets');
      fs.mkdirSync(fixtureSource);
      const lightBrandImageset = 'BrandLogo-conad.imageset';
      fs.cpSync(
        path.join(assetsDir, lightBrandImageset),
        path.join(fixtureSource, lightBrandImageset),
        { recursive: true }
      );
      fs.writeFileSync(
        path.join(fixtureSource, lightBrandImageset, '._brand-logo-conad@3x.png'),
        'not an image',
        'utf8'
      );

      runGenerator({ WIDGET_ASSETS_PATH: fixtureSource });

      const generated = fs.readFileSync(watchGeneratedFile, 'utf8');
      expect(parseSwiftStringSet(generated, 'lightLogoBrandIds')).toEqual(['conad']);
      expect(fs.readdirSync(path.join(watchAssetsDir, lightBrandImageset))).not.toContain(
        '._brand-logo-conad@3x.png'
      );
    });

    it.each([
      ['a missing destination catalogue', 'destination'],
      ['a missing authored resolver', 'resolver']
    ])('tells you not to regenerate when %s blocks writing', (_label, kind) => {
      runGenerator();
      const env: Record<string, string> = { CATALOGUE_GENERATOR_CHECK: '1' };
      if (kind === 'destination') {
        fs.rmSync(watchAssetsDir, { recursive: true });
      } else {
        env.RESOLVER_SOURCE_PATH = path.join(generatedDir, 'no-resolver.swift');
      }

      const errorOutput = runGeneratorExpectingFailure(env);

      // Both states make write mode refuse outright, so "regenerate and commit" would
      // send the reader round a loop that cannot succeed.
      expect(errorOutput).toContain(
        'Fix the problems above first — until then `yarn watch:catalogue:generate` writes nothing.'
      );
      expect(errorOutput).not.toContain(
        'Run `yarn watch:catalogue:generate` and commit the result.'
      );
    });

    it('refuses an imageset whose PNGs disagree with its Contents.json', () => {
      const fixtureSource = path.join(generatedDir, 'StaleRendition.xcassets');
      fs.mkdirSync(fixtureSource);
      const imageset = 'BrandLogo-conad.imageset';
      const target = path.join(fixtureSource, imageset);
      fs.cpSync(path.join(assetsDir, imageset), target, { recursive: true });
      // A leftover from a manual rename: undeclared, and it sorts BEFORE the real @3x
      // ("-" < "@"), so an unguarded rendition pick would analyse the wrong file.
      fs.cpSync(
        path.join(target, 'brand-logo-conad@3x.png'),
        path.join(target, 'brand-logo-conad-old@3x.png')
      );

      const errorOutput = runGeneratorExpectingFailure({ WIDGET_ASSETS_PATH: fixtureSource });

      expect(errorOutput).toContain(imageset);
      expect(errorOutput).toContain('without declaring it in Contents.json');
      expect(errorOutput).toContain('which file is the real artwork is ambiguous');
      expect(errorOutput).toContain('brand-logo-conad-old@3x.png');
      expect(errorOutput).toContain('Nothing was written.');
      expect(fs.existsSync(watchGeneratedFile)).toBe(false);
    });

    it('refuses an imageset whose Contents.json declares a PNG that is gone', () => {
      const fixtureSource = path.join(generatedDir, 'MissingRendition.xcassets');
      fs.mkdirSync(fixtureSource);
      const imageset = 'BrandLogo-conad.imageset';
      const target = path.join(fixtureSource, imageset);
      fs.cpSync(path.join(assetsDir, imageset), target, { recursive: true });
      // The other direction: declared, not shipped. Xcode renders nothing for it.
      fs.rmSync(path.join(target, 'brand-logo-conad@3x.png'));

      const errorOutput = runGeneratorExpectingFailure({ WIDGET_ASSETS_PATH: fixtureSource });

      expect(errorOutput).toContain(imageset);
      // Nothing is ambiguous in this direction — verified with actool: the remaining
      // declared renditions still compile, the missing one simply never ships. Saying
      // "ambiguous" would send the reader hunting for a duplicate that isn't there.
      expect(errorOutput).toContain('but does not ship it');
      expect(errorOutput).toContain('never reaches the build');
      expect(errorOutput).not.toContain('ambiguous');
      expect(fs.existsSync(watchGeneratedFile)).toBe(false);
    });

    it('reports both mismatch directions, plural, on one imageset', () => {
      const fixtureSource = path.join(generatedDir, 'BothDirections.xcassets');
      fs.mkdirSync(fixtureSource);
      const imageset = 'BrandLogo-conad.imageset';
      const target = path.join(fixtureSource, imageset);
      fs.cpSync(path.join(assetsDir, imageset), target, { recursive: true });

      // Two undeclared strays AND two declared-but-absent renditions at once, so the
      // plural wording and the combined-clause join are both exercised.
      fs.cpSync(
        path.join(target, 'brand-logo-conad@1x.png'),
        path.join(target, 'stray-one@1x.png')
      );
      fs.cpSync(
        path.join(target, 'brand-logo-conad@1x.png'),
        path.join(target, 'stray-two@1x.png')
      );
      fs.rmSync(path.join(target, 'brand-logo-conad@2x.png'));
      fs.rmSync(path.join(target, 'brand-logo-conad@3x.png'));

      const errorOutput = runGeneratorExpectingFailure({ WIDGET_ASSETS_PATH: fixtureSource });

      expect(errorOutput).toContain('stray-one@1x.png, stray-two@1x.png');
      expect(errorOutput).toContain('without declaring them in Contents.json');
      expect(errorOutput).toContain('but does not ship them');
      expect(errorOutput).toContain('those renditions silently never reach the build');
      // Both clauses, joined, on one line for one imageset.
      expect(errorOutput).toContain('; and it declares');
      // Same refusal as the single-direction cases — symmetry with its siblings.
      expect(errorOutput).toContain('Nothing was written.');
      expect(fs.existsSync(watchGeneratedFile)).toBe(false);
    });

    it('warns when artwork rasterizes to a uniform rectangle', () => {
      // Structurally perfect, visually empty: `actool` ships it, every drift gate
      // passes, and the row draws a blank disc — strictly worse than the initials it
      // replaces. One such asset (stroili) is already committed, which is why this
      // warns instead of failing; the check exists so the next one is not silent.
      const fixtureSource = path.join(generatedDir, 'BlankArtwork.xcassets');
      const imageset = path.join(fixtureSource, 'BrandLogo-blank-brand.imageset');
      fs.mkdirSync(imageset, { recursive: true });
      writeUniformPNG(path.join(imageset, 'blank@3x.png'));
      fs.writeFileSync(
        path.join(imageset, 'Contents.json'),
        JSON.stringify({
          images: [{ idiom: 'universal', scale: '3x', filename: 'blank@3x.png' }],
          info: { version: 1, author: 'xcode' }
        }),
        'utf8'
      );

      const { stderr, status } = runGeneratorCapturingBothStreams({
        WIDGET_ASSETS_PATH: fixtureSource
      });

      // A warning, not a failure: one such asset (stroili) is already committed.
      expect(status).toBe(0);
      expect(stderr).toContain('BrandLogo-blank-brand.imageset rasterized to a uniform rectangle');
      expect(stderr).toContain('assets/images/brands/blank-brand.svg');
    });

    it('pins the blank-artwork thresholds', () => {
      // The "exactly one warning" test above catches a broken CONDITION (an `&&`→`||`
      // slip flags 14 of the 57 real logos) but not a slipped CONSTANT: loosening
      // either threshold tenfold on its own still produces exactly one warning against
      // today's assets, so the fixture cannot tell the two apart. Pinning the literals
      // is the only cheap way to notice a one-digit typo — same approach the contract
      // suite already takes for the inset formula.
      const source = fs.readFileSync(
        path.join(repoRoot, 'watch-ios', 'Scripts', 'generate-catalogue.swift'),
        'utf8'
      );

      expect(source).toContain('opaqueFraction > 0.999 && luminanceStdDev < 0.01');
    });

    it('does not mistake a solid single-colour wordmark for blank artwork', () => {
      // A monochrome wordmark has zero luminance variance too — over the part of the
      // image it covers, with the rest transparent. Only a FULLY opaque uniform
      // rectangle is blank, and many of the 57 committed logos are solid single-colour.
      //
      // Asserted against stderr, where warnings actually go: the first version of this
      // test checked `runGenerator()`'s return value, which is stdout only, so it could
      // never have failed no matter what the detector did (QA round 2).
      const { stderr } = runGeneratorCapturingBothStreams();

      const blankWarnings = stderr
        .split('\n')
        .filter((line) => line.includes('rasterized to a uniform rectangle'));

      // stroili is the one known-blank asset (recorded follow-up). Every other logo,
      // including the solid single-colour and full-bleed ones, must NOT be flagged.
      expect(blankWarnings).toHaveLength(1);
      expect(blankWarnings[0]).toContain('BrandLogo-stroili.imageset');
    });

    it('refuses an imageset that ships PNGs with no Contents.json', () => {
      // Verified against actool: it warns ("unassigned child") and OMITS the image from
      // Assets.car, so knownBrandIds would claim a brand whose asset is not in the
      // build and the row would draw an empty circle — the one thing AC2 forbids. The
      // add-a-brand checklist talks about dropping PNGs in, so this is a live trap.
      const fixtureSource = path.join(generatedDir, 'NoContentsJson.xcassets');
      const imageset = path.join(fixtureSource, 'BrandLogo-conad.imageset');
      fs.mkdirSync(imageset, { recursive: true });
      fs.cpSync(
        path.join(assetsDir, 'BrandLogo-conad.imageset', 'brand-logo-conad@3x.png'),
        path.join(imageset, 'brand-logo-conad@3x.png')
      );

      const errorOutput = runGeneratorExpectingFailure({ WIDGET_ASSETS_PATH: fixtureSource });

      expect(errorOutput).toContain('has no readable, decodable Contents.json');
      // The consequence must be the accurate one for THIS shape: with a single PNG
      // there is nothing ambiguous, the image simply never reaches Assets.car.
      expect(errorOutput).toContain('actool omits the image from Assets.car');
      expect(errorOutput).not.toContain('which file is the real artwork is ambiguous');
      expect(fs.existsSync(watchGeneratedFile)).toBe(false);
      expect(brandLogoImagesets(watchAssetsDir)).toEqual([]);
    });

    it('picks the @3x rendition regardless of filename casing', () => {
      const fixtureSource = path.join(generatedDir, 'UppercaseScale.xcassets');
      const imageset = path.join(fixtureSource, 'BrandLogo-conad.imageset');
      fs.mkdirSync(imageset, { recursive: true });
      const source = path.join(assetsDir, 'BrandLogo-conad.imageset');
      // Same artwork, uppercase scale markers and extension — plausible from a design
      // tool export. The classification must not depend on casing.
      const renamed = fs
        .readdirSync(source)
        .filter((f) => f.endsWith('.png'))
        .map((f) => ({
          from: f,
          to: f.replace('@1x', '@1X').replace('@2x', '@2X').replace('@3x', '@3X')
        }));
      for (const { from, to } of renamed) {
        fs.cpSync(path.join(source, from), path.join(imageset, to));
      }
      fs.writeFileSync(
        path.join(imageset, 'Contents.json'),
        JSON.stringify({
          images: renamed.map(({ to }) => ({ idiom: 'universal', filename: to })),
          info: { version: 1, author: 'xcode' }
        }),
        'utf8'
      );

      runGenerator({ WIDGET_ASSETS_PATH: fixtureSource });

      // conad is a light logo; if the uppercase @3X were missed the analysis would read
      // a different rendition and could classify it differently.
      expect(
        parseSwiftStringSet(fs.readFileSync(watchGeneratedFile, 'utf8'), 'lightLogoBrandIds')
      ).toEqual(['conad']);
    });

    it('names the widget asset catalogue it could not find', () => {
      const missingWidgetAssets = path.join(generatedDir, 'no-widget-assets.xcassets');

      const errorOutput = runGeneratorExpectingFailure({
        WIDGET_ASSETS_PATH: missingWidgetAssets
      });

      expect(errorOutput).toContain('Unable to locate the widget asset catalogue');
      expect(errorOutput).toContain(missingWidgetAssets);
    });

    it('does not mirror an imageset that ships no artwork', () => {
      const fixtureSource = path.join(generatedDir, 'ScaffoldedBrand.xcassets');
      fs.mkdirSync(fixtureSource);
      const [good] = brandLogoImagesets(assetsDir);
      fs.cpSync(path.join(assetsDir, good as string), path.join(fixtureSource, good as string), {
        recursive: true
      });
      // A brand scaffolded ahead of its artwork: correct folder shape, no PNG.
      const scaffold = path.join(fixtureSource, 'BrandLogo-no-art-yet.imageset');
      fs.mkdirSync(scaffold);
      fs.writeFileSync(path.join(scaffold, 'Contents.json'), '{"images":[]}', 'utf8');

      const output = runGenerator({ WIDGET_ASSETS_PATH: fixtureSource });

      // Not "known" to the generated data, so mirroring it would ship a folder no code
      // can resolve. The two notions must agree.
      expect(brandLogoImagesets(watchAssetsDir)).toEqual([good]);
      expect(
        parseSwiftStringSet(fs.readFileSync(watchGeneratedFile, 'utf8'), 'knownBrandIds')
      ).toEqual([brandSlugOf(good as string)]);
      expect(output).toContain('Mirrored brand-logo imagesets');
    });

    it('never copies dotfiles into the mirror, and they do not churn --check', () => {
      // Finder drops .DS_Store into any directory it displays. Copying it would
      // pollute the tracked mirror, and because its bytes change between sessions
      // it would make the drift gate fail with no source change to explain it.
      //
      // The dotfile is injected into a throwaway COPY of the source catalogue via
      // WIDGET_ASSETS_PATH: seeding the tracked targets/watch-widget/Assets.xcassets
      // would leave real junk behind if this process were killed mid-test.
      const [imageset] = brandLogoImagesets(assetsDir);
      const fixtureSource = path.join(generatedDir, 'FixtureAssets.xcassets');
      fs.mkdirSync(fixtureSource);
      fs.cpSync(
        path.join(assetsDir, imageset as string),
        path.join(fixtureSource, imageset as string),
        { recursive: true }
      );
      fs.writeFileSync(path.join(fixtureSource, imageset as string, '.DS_Store'), 'junk', 'utf8');

      // The destination starts empty, so this run exercises the copy loop itself —
      // not just the planning-side filter.
      const output = runGenerator({ WIDGET_ASSETS_PATH: fixtureSource });
      expect(output).toContain('Mirrored brand-logo imagesets');

      const mirrored = path.join(watchAssetsDir, imageset as string);
      expect(fs.existsSync(path.join(mirrored, '.DS_Store'))).toBe(false);
      expect(fs.readdirSync(mirrored).sort()).toEqual(
        fs.readdirSync(path.join(assetsDir, imageset as string)).sort()
      );
      // No staging debris either.
      expect(fs.readdirSync(watchAssetsDir).filter((e) => e.startsWith('.'))).toEqual([]);

      const checkOutput = runGenerator({
        WIDGET_ASSETS_PATH: fixtureSource,
        CATALOGUE_GENERATOR_CHECK: '1'
      });
      expect(checkOutput).toContain('Generated catalogue is up to date.');
    });

    it('writes no generated source at all when a source imageset is malformed', () => {
      const fixtureSource = path.join(generatedDir, 'MalformedBeforeWrite.xcassets');
      fs.mkdirSync(fixtureSource);
      const [good] = brandLogoImagesets(assetsDir);
      fs.cpSync(path.join(assetsDir, good as string), path.join(fixtureSource, good as string), {
        recursive: true
      });
      fs.writeFileSync(path.join(fixtureSource, 'BrandLogo-broken-a.imageset'), 'x', 'utf8');
      fs.writeFileSync(path.join(fixtureSource, 'BrandLogo-broken-b.imageset'), 'x', 'utf8');

      const errorOutput = runGeneratorExpectingFailure({ WIDGET_ASSETS_PATH: fixtureSource });

      // Write mode must reject before touching any output: a run that reports failure
      // while having already rewritten four generated files invites committing them.
      for (const output of [
        generatedFile,
        widgetGeneratedFile,
        watchGeneratedFile,
        watchResolverFile
      ]) {
        expect(fs.existsSync(output)).toBe(false);
      }
      expect(brandLogoImagesets(watchAssetsDir)).toEqual([]);

      // And it names every offender, so one run is enough to fix them all.
      expect(errorOutput).toContain('BrandLogo-broken-a.imageset');
      expect(errorOutput).toContain('BrandLogo-broken-b.imageset');
      expect(errorOutput).toContain('Nothing was written.');
    });

    it('names a malformed imageset once, not also inside the mirror summary', () => {
      const fixtureSource = path.join(generatedDir, 'MalformedPlusStale.xcassets');
      fs.mkdirSync(fixtureSource);
      const [first, second] = brandLogoImagesets(assetsDir);
      fs.cpSync(path.join(assetsDir, first as string), path.join(fixtureSource, first as string), {
        recursive: true
      });
      runGenerator({ WIDGET_ASSETS_PATH: fixtureSource });

      // One genuinely out-of-date imageset plus one malformed entry.
      fs.cpSync(
        path.join(assetsDir, second as string),
        path.join(fixtureSource, second as string),
        {
          recursive: true
        }
      );
      fs.writeFileSync(path.join(fixtureSource, 'BrandLogo-broken.imageset'), 'x', 'utf8');

      const errorOutput = runGeneratorExpectingFailure({
        WIDGET_ASSETS_PATH: fixtureSource,
        CATALOGUE_GENERATOR_CHECK: '1'
      });

      const mentions = errorOutput.split('BrandLogo-broken.imageset').length - 1;
      expect(mentions).toBe(1);

      // The mirror summary must carry the genuine drift and NOT the malformed entry,
      // which has its own line.
      const summaryLine = errorOutput
        .split('\n')
        .find((line) => line.includes("brand-logo imagesets differ from the widget's"));
      expect(summaryLine).toContain(`1 missing or stale: ${second}`);
      expect(summaryLine).not.toContain('BrandLogo-broken.imageset');
    });

    it('lists every malformed imageset alongside other drift in one --check run', () => {
      const fixtureSource = path.join(generatedDir, 'PartlyMalformed.xcassets');
      fs.mkdirSync(fixtureSource);
      const [good] = brandLogoImagesets(assetsDir);
      fs.cpSync(path.join(assetsDir, good as string), path.join(fixtureSource, good as string), {
        recursive: true
      });
      runGenerator({ WIDGET_ASSETS_PATH: fixtureSource });

      // Two malformed entries plus an unrelated stale artifact. A `throw` for the
      // first malformed one would hide both the second and the stale file.
      fs.writeFileSync(path.join(fixtureSource, 'BrandLogo-broken-a.imageset'), 'x', 'utf8');
      fs.writeFileSync(path.join(fixtureSource, 'BrandLogo-broken-b.imageset'), 'x', 'utf8');
      fs.writeFileSync(generatedFile, '// STALE', 'utf8');

      const errorOutput = runGeneratorExpectingFailure({
        WIDGET_ASSETS_PATH: fixtureSource,
        CATALOGUE_GENERATOR_CHECK: '1'
      });

      expect(errorOutput).toContain('Generated catalogue differs from committed Brands.swift');
      expect(errorOutput).toContain('BrandLogo-broken-a.imageset');
      expect(errorOutput).toContain('BrandLogo-broken-b.imageset');
      // A malformed source makes write mode write nothing, so the trailer must point at
      // the catalogue rather than at a regenerate that cannot succeed.
      expect(errorOutput).toContain(
        'Fix the problems above first — until then `yarn watch:catalogue:generate` writes nothing.'
      );
      expect(errorOutput).not.toContain(
        'Run `yarn watch:catalogue:generate` and commit the result.'
      );
    });

    // A bad merge or a stray `git mv` can leave an imageset as a plain file. Both
    // modes must say so by name, and they take different routes to it: write mode
    // refuses outright (it cannot copy a file as a directory) while `--check`
    // collects it with everything else. `--check` is the only mode CI runs.
    it.each([
      ['write mode', {}],
      ['--check mode', { CATALOGUE_GENERATOR_CHECK: '1' }]
    ])('reports a malformed source imageset by name in %s', (_label, extraEnv) => {
      const fixtureSource = path.join(generatedDir, 'MalformedAssets.xcassets');
      fs.mkdirSync(fixtureSource);
      fs.writeFileSync(path.join(fixtureSource, 'BrandLogo-broken.imageset'), 'not a dir', 'utf8');

      const errorOutput = runGeneratorExpectingFailure({
        WIDGET_ASSETS_PATH: fixtureSource,
        ...extraEnv
      });

      expect(errorOutput).toContain('BrandLogo-broken.imageset');
      expect(errorOutput).toContain('is not a directory');
    });

    it('collects an unreadable artifact alongside other drift instead of throwing', () => {
      runGenerator();
      // Permission-denied is a different problem from stale content, and must not
      // abort the run and discard failures found before it.
      fs.chmodSync(watchGeneratedFile, 0o000);
      const stillReadable = (() => {
        try {
          fs.readFileSync(watchGeneratedFile);
          return true;
        } catch {
          return false;
        }
      })();
      fs.writeFileSync(watchResolverFile, '// STALE', 'utf8');

      try {
        const errorOutput = runGeneratorExpectingFailure({ CATALOGUE_GENERATOR_CHECK: '1' });

        // Root ignores the mode bits, so only assert the read failure where chmod bites.
        if (!stillReadable) {
          // Exact basename: the widget fixture is named `BrandLogoCatalog.generated.swift`,
          // so a bare substring would also match a failure attributed to the wrong artifact.
          expect(errorOutput).toContain(`${path.basename(watchGeneratedFile)} could not be read`);
        }
        expect(errorOutput).toContain(
          'Generated watch app BrandLogoCatalog.swift differs from the authored targets/watch-widget/BrandLogoCatalog.swift'
        );
      } finally {
        fs.chmodSync(watchGeneratedFile, 0o644);
      }
    });

    it('reports every drift in one --check run, not just the first', () => {
      runGenerator();
      fs.writeFileSync(watchGeneratedFile, '// STALE', 'utf8');
      fs.writeFileSync(watchResolverFile, '// STALE', 'utf8');
      const [imageset] = brandLogoImagesets(watchAssetsDir);
      fs.rmSync(path.join(watchAssetsDir, imageset as string), { recursive: true });

      const errorOutput = runGeneratorExpectingFailure({ CATALOGUE_GENERATOR_CHECK: '1' });

      // Exiting on the first mismatch would make a developer re-run --check once per
      // problem to discover the next one.
      expect(errorOutput).toContain(
        'Generated watch app catalog differs from committed targets/watch/Generated/BrandLogoCatalog.generated.swift'
      );
      expect(errorOutput).toContain(
        'Generated watch app BrandLogoCatalog.swift differs from the authored targets/watch-widget/BrandLogoCatalog.swift'
      );
      expect(errorOutput).toContain("Watch app brand-logo imagesets differ from the widget's");
      expect(errorOutput).toContain('Run `yarn watch:catalogue:generate` and commit the result.');
    });
  });

  // A gitignored generated artifact cannot be drift-checked, and these two are
  // compiled into the watch app target, so a fresh clone must carry them. The CI
  // watchOS job also runs Jest BEFORE the generator step, so a suite that reads them
  // only passes because they are committed.
  describe('watch app generated sources are committed', () => {
    it.each([
      'targets/watch/Generated/Brands.swift',
      'targets/watch/Generated/BrandLogoCatalog.generated.swift',
      'targets/watch/Generated/BrandLogoCatalog.swift'
    ])('%s is not gitignored', (tracked) => {
      // git check-ignore exits 1 when the path is NOT ignored, which is what we want.
      expect(() =>
        execFileSync('git', ['check-ignore', '-q', tracked], { cwd: repoRoot, stdio: 'pipe' })
      ).toThrow();
    });

    it('keeps the incremental-skip sidecar out of git', () => {
      // Machine state for the "inputs unchanged" fast path, not an artifact.
      expect(() =>
        execFileSync(
          'git',
          ['check-ignore', '-q', 'targets/watch/Generated/.catalogue-inputs.sha256'],
          {
            cwd: repoRoot,
            stdio: 'pipe'
          }
        )
      ).not.toThrow();
    });
  });
});
