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
const generatedDir = path.join(repoRoot, 'targets', 'watch', 'Generated');
const generatedFile = path.join(generatedDir, 'Brands.swift');
const cataloguePath = path.join(repoRoot, 'catalogue', 'italy.json');

const runGenerator = (env?: Record<string, string | undefined>) => {
  return execFileSync('xcrun', ['--sdk', 'macosx', 'swift', scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env
    },
    stdio: 'pipe'
  }).toString('utf8');
};

describe('watchOS catalogue generation', () => {
  beforeEach(() => {
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
    fs.mkdirSync(generatedDir, { recursive: true });
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
});
