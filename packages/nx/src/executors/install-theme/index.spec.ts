import { ExecutorContext } from '@nx/devkit';

import { InstallThemeExecutorSchema } from './schema';
import executor from './';
import { expect, describe, it } from 'vitest';

const options: InstallThemeExecutorSchema = {
  name: '@owdproject/theme-gnome',
};
const context: ExecutorContext = {
  root: '',
  cwd: process.cwd(),
  isVerbose: false,
  projectGraph: {
    nodes: {},
    dependencies: {},
  },
  projectsConfigurations: {
    projects: {},
    version: 2,
  },
  nxJsonConfiguration: {},
};

describe('Build Executor', () => {
  it('can run', async () => {
    const output = await executor(options, context);
    expect(output.success).toBe(true);
  });
});
