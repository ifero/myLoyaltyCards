import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
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

const runGenerator = () => {
  execFileSync('swift', [scriptPath], {
    cwd: repoRoot,
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

    expect(project).toContain('Generate Watch Catalogue');
    expect(project).toContain('Scripts/generate-catalogue.swift');
    expect(project).toContain('Brands.swift in Sources');
    expect(project).toContain('../Generated/Brands.swift');
  });
});
