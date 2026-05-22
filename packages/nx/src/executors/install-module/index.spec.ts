import { ExecutorContext } from '@nx/devkit';

import { InstallModuleExecutorSchema } from './schema';
import executor from './';
import { expect, describe, it } from 'vitest';

const options: InstallModuleExecutorSchema = {
  name: '@owdproject/module-pinia-localforage',
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
