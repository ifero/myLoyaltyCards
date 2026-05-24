const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const PATCH_FUNCTION = `def apply_mlkit_apple_silicon_simulator_patch!(installer)
  pods_dir = File.expand_path(installer.sandbox.root.to_s)
  patcher = File.expand_path('../scripts/patch_mlkit_arm64_simulator.py', __dir__)

  framework_dirs =
    Dir
    .glob(File.join(pods_dir, '{MLKit*,MLImage*}'))
    .select { |dir| File.directory?(dir) }

  unless framework_dirs.empty?
    Pod::UI.puts ''
    Pod::UI.puts "[ml_kit] Patching #{framework_dirs.size} ML Kit framework(s) for Apple Silicon simulator..."
    unless system('python3', patcher, *framework_dirs)
      Pod::UI.warn('[ml_kit] arm64 simulator patcher failed; simulator builds may still fail.')
    end
  end

  excluded = 'EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64'
  Dir.glob(File.join(pods_dir, 'Target Support Files', '**', '*.xcconfig')).each do |xcconfig|
    text = File.read(xcconfig)
    new_text = text.lines.reject { |line| line.strip == excluded }.join
    File.write(xcconfig, new_text) if text != new_text
  end
end
`;

const FUNCTION_NAME = 'def apply_mlkit_apple_silicon_simulator_patch!(installer)';
const CALL_LINE = '    apply_mlkit_apple_silicon_simulator_patch!(installer)';
const PODFILE_PROPERTIES_ANCHOR =
  "podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}";

const addPatchFunction = (podfileContents) => {
  if (podfileContents.includes(FUNCTION_NAME)) {
    return podfileContents;
  }

  if (!podfileContents.includes(PODFILE_PROPERTIES_ANCHOR)) {
    throw new Error('Unable to find podfile_properties anchor in Podfile.');
  }

  return podfileContents.replace(
    PODFILE_PROPERTIES_ANCHOR,
    `${PODFILE_PROPERTIES_ANCHOR}\n\n${PATCH_FUNCTION}`
  );
};

const addPatchCall = (podfileContents) => {
  if (podfileContents.includes(CALL_LINE)) {
    return podfileContents;
  }

  const postInstallRegex =
    /(post_install do \|installer\|[\s\S]*?react_native_post_install\([\s\S]*?\n\s*\))/m;

  const match = podfileContents.match(postInstallRegex);
  if (!match) {
    throw new Error('Unable to find react_native_post_install call in Podfile post_install block.');
  }

  return podfileContents.replace(postInstallRegex, `${match[1]}\n\n${CALL_LINE}`);
};

const withMlkitAppleSiliconSimulator = (config) =>
  withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        return modConfig;
      }

      const original = fs.readFileSync(podfilePath, 'utf8');
      const patched = addPatchCall(addPatchFunction(original));

      if (patched !== original) {
        fs.writeFileSync(podfilePath, patched);
      }

      return modConfig;
    },
  ]);

module.exports = withMlkitAppleSiliconSimulator;
