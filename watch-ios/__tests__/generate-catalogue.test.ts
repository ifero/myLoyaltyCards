import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type Brand = {
  id: string;
  logo: string;
};

const repoRoot = path.resolve(__dirname, '../..');
const scriptPath = path.join(repoRoot, 'watch-ios', 'Scripts', 'generate-catalogue.swift');
const generatedDir = path.join(repoRoot, 'watch-ios', 'Generated');
const generatedFile = path.join(generatedDir, 'Brands.swift');
const cataloguePath = path.join(repoRoot, 'catalogue', 'italy.json');
const pbxprojPath = path.join(
  repoRoot,
  'watch-ios',
  'MyLoyaltyCardsWatch.xcodeproj',
  'project.pbxproj'
);

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

  it('configures Xcode build integration for generated file', () => {
    const project = fs.readFileSync(pbxprojPath, 'utf8');
    const targetBlockMatch = project.match(
      /\/\* MyLoyaltyCardsWatch \*\/ = \{[\s\S]*?buildPhases = \(([\s\S]*?)\);/m
    );

    expect(targetBlockMatch).not.toBeNull();

    const buildPhases = targetBlockMatch?.[1] ?? '';
    const generateIndex = buildPhases.indexOf('Generate Watch Catalogue');
    const sourcesIndex = buildPhases.indexOf('Sources');

    expect(project).toContain('Generate Watch Catalogue');
    expect(project).toContain('Scripts/generate-catalogue.swift');
    expect(project).toContain('Brands.swift in Sources');
    expect(project).toContain('../Generated/Brands.swift');
    expect(project).toContain('"$(SRCROOT)/../catalogue/italy.json"');
    expect(project).toContain('"$(SRCROOT)/Generated/Brands.swift"');
    expect(project).toContain('/usr/bin/xcrun --sdk macosx swift');
    expect(generateIndex).toBeGreaterThanOrEqual(0);
    expect(sourcesIndex).toBeGreaterThanOrEqual(0);
    expect(generateIndex).toBeLessThan(sourcesIndex);
  });

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
    expect(generated).toContain('"Quote \\\" alias"');
    expect(generated).toContain('"Slash \\\\ alias"');

    execFileSync('xcrun', ['--sdk', 'macosx', 'swiftc', '-typecheck', generatedFile], {
      cwd: repoRoot,
      stdio: 'pipe'
    });
  });
});
