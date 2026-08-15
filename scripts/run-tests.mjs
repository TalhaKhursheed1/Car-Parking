import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmpDir = path.join(root, '.tmp', 'tests');
const testsDir = path.join(tmpDir, 'tests');

rmSync(tmpDir, { recursive: true, force: true });

const tscExecutable = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
const tscPath = path.join(root, 'node_modules', '.bin', tscExecutable);

const tscResult = spawnSync(tscPath, ['-p', path.join(root, 'tsconfig.test.json')], {
  stdio: 'inherit',
  env: process.env,
});

if (tscResult.status !== 0) {
  process.exit(tscResult.status ?? 1);
}

const aliasRegister = path.join(root, 'scripts', 'register-test-alias.cjs');

const testResult = spawnSync(process.execPath, ['--require', aliasRegister, '--test', testsDir], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(testResult.status ?? 0);

