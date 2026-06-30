#!/usr/bin/env node
import { main } from '@tenkit/cli';

const exitCode = await main();
process.exitCode = exitCode;
