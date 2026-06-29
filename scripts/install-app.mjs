import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { addToDesktopConfig, resolveDesktopConfigPath } from './utils/utilConfig.mjs';

const name = process.argv[2];
if (!name) {
  console.error('❌ Specificare il nome dell\'app: pnpm install-app <name>');
  process.exit(1);
}

let key = 'apps';
const kindArg = process.argv.find(arg => arg.startsWith('--kind='));
if (kindArg) {
  const kind = kindArg.split('=')[1];
  if (kind === 'module') key = 'modules';
  else if (kind === 'theme') key = 'theme';
} else if (process.argv[3]) {
  const kind = process.argv[3];
  if (kind === 'module' || kind === 'modules') key = 'modules';
  else if (kind === 'theme') key = 'theme';
}

console.log(`📦 Installing ${name} into config key '${key}'...`);
try {
  const rootPath = process.cwd();
  const desktopPath = join(rootPath, 'desktop');
  const configPath = resolveDesktopConfigPath(desktopPath);

  execSync(`pnpm add ${name}`, { stdio: 'inherit', cwd: desktopPath });
  console.log(`✅ Package ${name} installed successfully.`);

  addToDesktopConfig(configPath, key, name);
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to install or update config:', error);
  process.exit(1);
}
