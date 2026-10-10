const { buildSync } = require('esbuild');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'starline-replacement-tests-'));
const compiledHelper = path.join(tempDir, 'replacementValidation.cjs');

try {
  buildSync({
    entryPoints: [path.join(__dirname, '..', 'utils', 'replacementValidation.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: compiledHelper
  });

  const electronBinary = require('electron');
  const result = spawnSync(electronBinary, ['--test', path.join(__dirname, '..', 'tests', 'replacement-validation.test.cjs')], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      REPLACEMENT_VALIDATION_MODULE: compiledHelper,
      STARLINE_REPLACEMENT_TEST_DB: path.join(tempDir, 'replacement-test.sqlite')
    }
  });

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
