import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type Brand = {
  id: string;
  logo: string;
};

const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'targets', 'watch', 'Scripts', 'generate-catalogue.swift');
const generatedDir = path.join(repoRoot, 'targets', 'watch', 'Generated');
const generatedFile = path.join(generatedDir, 'Brands.swift');
const cataloguePath = path.join(repoRoot, 'catalogue', 'italy.json');

const runGenerator = (env?: Record<string, string | undefined>) => {
  execFileSync('swift', [scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env
    },
    stdio: 'pipe'
  });
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
