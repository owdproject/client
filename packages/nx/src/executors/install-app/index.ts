import { execSync } from 'child_process';
import { join } from 'path';
import { InstallAppExecutorSchema } from './schema';

import { addToDesktopConfig } from '../../utils/utilConfig';

export default async function runExecutor(
  options: InstallAppExecutorSchema,
  context: any
) {
  const name: string = options.name;

  console.log(`📦 Installing ${name}...`);

  try {
    // you can change this to "npm install" or "yarn add" if you prefer
    const desktopPath = join(context.root, 'desktop');
    const configPath = join(desktopPath, 'owd.config.ts');

    // run the package manager command to add the package to the desktop workspace
    execSync(`pnpm add ${name}`, {
      stdio: 'inherit',
      cwd: desktopPath,
    });

    console.log(`✅ Package ${name} installed successfully.`);

    // now proceed with updating the owd.config.ts file
    addToDesktopConfig(configPath, 'apps', name);

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to install or update config:', error);
    return { success: false };
  }
}
