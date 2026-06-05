import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type Brand = {
  id: string;
  logo: string;
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
// WIDGET_CATALOG_OUTPUT_PATH so the tracked generated sources (Brands.swift and
// BrandLogoCatalog.generated.swift) are never mutated by the suite.
let generatedDir: string;
let generatedFile: string;
let widgetGeneratedFile: string;

const runGenerator = (env?: Record<string, string | undefined>) => {
  return execFileSync('xcrun', ['--sdk', 'macosx', 'swift', scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
      CATALOGUE_OUTPUT_PATH: generatedFile,
      WIDGET_CATALOG_OUTPUT_PATH: widgetGeneratedFile
    },
    stdio: 'pipe'
  }).toString('utf8');
};

// Extracts the sorted brand-id slugs from a `static let <name>: Set<String> = [ … ]`
// literal in the generated widget catalog.
const parseSwiftStringSet = (source: string, name: string): string[] => {
  const match = source.match(new RegExp(`static let ${name}: Set<String> = \\[([\\s\\S]*?)\\]`));
  const body = match?.[1];
  if (body === undefined) {
    throw new Error(`Could not find "${name}" set in generated widget catalog`);
  }
  return [...body.matchAll(/"([^"]+)"/g)]
    .map((entry) => entry[1])
    .filter((value): value is string => value !== undefined)
    .sort();
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

describe('watchOS catalogue generation', () => {
  beforeEach(() => {
    generatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watch-generated-'));
    generatedFile = path.join(generatedDir, 'Brands.swift');
    widgetGeneratedFile = path.join(generatedDir, 'BrandLogoCatalog.generated.swift');
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
      expect(generated).toContain(`logoUrl: "assets/images/brands/${brand.logo}.svg"`);
    }
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
    expect(afterContents).toContain('logoUrl: "assets/images/brands/demo.svg"');
  });

  it('fails check mode when the committed generated output is stale', () => {
    fs.writeFileSync(generatedFile, '// STALE', 'utf8');

    let thrown: Error | null = null;
    try {
      runGenerator({ CATALOGUE_GENERATOR_CHECK: '1' });
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown).not.toBeNull();
    expect(thrown).toHaveProperty('status', 1);
    const nodeError = thrown as { stderr?: Buffer; message?: string };
    const errorOutput = nodeError.stderr?.toString() || nodeError.message || '';
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

    let thrown: Error | null = null;
    try {
      runGenerator({ CATALOGUE_GENERATOR_CHECK: '1' });
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown).not.toBeNull();
    expect(thrown).toHaveProperty('status', 1);
    const nodeError = thrown as { stderr?: Buffer; message?: string };
    const errorOutput = nodeError.stderr?.toString() || nodeError.message || '';
    expect(errorOutput).toContain(
      'Generated widget catalog differs from committed BrandLogoCatalog.generated.swift'
    );
  });
});
