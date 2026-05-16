#!/usr/bin/env node

import { runCli } from './cli.js'

await runCli('desktop', process.argv.slice(2))
