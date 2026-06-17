#!/usr/bin/env bun

import { Command } from 'commander';

import { EAS_CLI_MISSING_MESSAGE } from './tenant-cli-core';
import { runBuildPrepare, runBuildReset } from './tenant-cli-runtime';

export function createProgram() {
  const program = new Command();

  program
    .name('tenant-cli')
    .description('Tenant workflow commands for Tenkit')
    .showHelpAfterError()
    .showSuggestionAfterError();

  program
    .command('build-prepare')
    .description('Prepare native projects for a selected Tenant and Tenant Environment')
    .option('--tenant <tenant-slug>', 'Tenant Slug')
    .option('--env <tenant-environment>', 'Tenant Environment: development, preview, or production')
    .option('--platform <platform>', 'Platform: ios, android, or both')
    .option('--ios', 'Prepare iOS')
    .option('--android', 'Prepare Android')
    .option('--both', 'Prepare both platforms')
    .action(async (options) => {
      await runBuildPrepare(options);
    });

  program
    .command('build-reset')
    .description('Reset native projects to the default Tenant')
    .action(async () => {
      await runBuildReset();
    });

  program
    .command('doctor')
    .description('Show Tenant CLI diagnostic messages')
    .action(() => {
      console.log(EAS_CLI_MISSING_MESSAGE);
    });

  return program;
}

if (import.meta.main) {
  createProgram()
    .parseAsync()
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('User force closed the prompt') || message.includes('Cancelled')) {
        console.error('Cancelled.');
        process.exit(130);
      }

      console.error(message);
      process.exit(1);
    });
}
