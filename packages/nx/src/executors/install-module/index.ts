import { execSync } from 'child_process';
import { join } from 'path';
import { InstallModuleExecutorSchema } from './schema';
import { addToDesktopConfig, resolveDesktopConfigPath } from '../../utils/utilConfig';

export default async function runExecutor(
  options: InstallModuleExecutorSchema,
  context: any
) {
  const name: string = options.name;

  console.log(`📦 Installing ${name}...`);

  try {
    // you can change this to "npm install" or "yarn add" if you prefer
    const desktopPath = join(context.root, 'desktop');
    const configPath = resolveDesktopConfigPath(desktopPath);

    // run the package manager command to add the package to the desktop workspace
    execSync(`pnpm add ${name}`, {
      stdio: 'inherit',
      cwd: desktopPath,
    });

    console.log(`✅ Package ${name} installed successfully.`);

    // now proceed with updating desktop.config.ts
    addToDesktopConfig(configPath, 'modules', name);

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to install or update config:', error);
    return { success: false };
  }
}
