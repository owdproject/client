#!/usr/bin/env node

import { runCli } from './cli.js'

await runCli('owd', process.argv.slice(2), { deprecated: true })
