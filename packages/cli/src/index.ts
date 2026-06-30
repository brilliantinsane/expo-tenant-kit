#!/usr/bin/env node
import { cancel, confirm, intro, isCancel, outro, select, text } from '@clack/prompts';
import { Command } from 'commander';

import {
  CreateFlowCancelledError,
  DEFAULT_PROJECT_NAME,
  DEFAULT_PUBLIC_SETUP_SLUG,
  PROMPT_CANCELLED,
  SETUP_PROMPT_CHOICES,
  derivePackageName,
  findTenkitWorkspaceRoot,
  isDirectCliRun,
  normalizeSetupInput,
  runCreateFlow,
  supportedSetupValues,
  validatePackageName,
  validateProjectName,
  type CreateCommandOptions,
  type CreateFlowEnvironment,
  type PromptAdapter,
  type PublicCliGitMode,
} from './create-flow';

const CLI_VERSION = '0.1.0';

type CliIo = {
  stdout: Pick<NodeJS.WriteStream, 'write' | 'isTTY'>;
  stderr: Pick<NodeJS.WriteStream, 'write'>;
  stdin: Pick<NodeJS.ReadStream, 'isTTY'>;
};

type CommanderOptions = {
  name?: string;
  packageName?: string;
  setup?: string;
  setupType?: string;
  yes?: boolean;
  install?: boolean;
  git?: string | false;
  dryRun?: boolean;
};

function createPromptAdapter(): PromptAdapter {
  return {
    async text(options) {
      const answer = await text({
        ...options,
        validate(value) {
          return options.validate(value);
        },
      });
      return isCancel(answer) ? PROMPT_CANCELLED : String(answer);
    },
    async select(options) {
      const answer = await select({
        ...options,
        options: options.options.map((option) => ({
          value: option.value,
          label: option.label,
        })),
      });

      return isCancel(answer) ? PROMPT_CANCELLED : answer;
    },
    async confirm(options) {
      const answer = await confirm(options);
      return isCancel(answer) ? PROMPT_CANCELLED : answer;
    },
  };
}

function normalizeCommanderOptions(options: CommanderOptions): CreateCommandOptions {
  return {
    name: options.name,
    packageName: options.packageName,
    setup: options.setup,
    setupType: options.setupType,
    yes: options.yes,
    install: options.install,
    git: options.git as PublicCliGitMode | undefined,
    dryRun: options.dryRun,
  };
}

export function createProgram(env: CreateFlowEnvironment): Command {
  const program = new Command();

  program
    .name('tenkit')
    .description('Create a generated Tenkit Expo project.')
    .version(CLI_VERSION)
    .allowExcessArguments(false)
    .option('--name <name>', `project folder name, defaults to ${DEFAULT_PROJECT_NAME} with --yes`)
    .option('--package-name <name>', 'generated package.json name override')
    .option('-s, --setup <setup>', `public Setup slug: ${supportedSetupValues().join(', ')}`)
    .option('--setup-type <setupType>', 'canonical Setup Type ID or public Setup slug')
    .option('--yes', 'skip prompts and accept defaults')
    .option('--no-install', 'skip dependency installation')
    .option('--git <mode>', 'git behavior: init, commit, none')
    .option('--no-git', 'skip git initialization')
    .option('--dry-run', 'validate options and print the create plan without writing files')
    .configureOutput({
      writeOut: (message) => env.output.log(message.trimEnd()),
      writeErr: (message) => env.output.error(message.trimEnd()),
    })
    .exitOverride()
    .showHelpAfterError()
    .action(async (options: CommanderOptions) => {
      if (
        options.git !== undefined &&
        options.git !== false &&
        !['init', 'commit', 'none'].includes(String(options.git))
      ) {
        throw new Error('Git mode must be one of: init, commit, none.');
      }

      intro('Create Tenkit');
      await runCreateFlow(normalizeCommanderOptions(options), env);
      outro('Done');
    });

  return program;
}

export async function main(
  argv: string[] = process.argv.slice(2),
  io: CliIo = process,
): Promise<number> {
  const output = {
    log(message = '') {
      io.stdout.write(`${message}\n`);
    },
    error(message: string) {
      io.stderr.write(`${message}\n`);
    },
  };
  const workspaceRoot = await findTenkitWorkspaceRoot(import.meta.url);
  const env: CreateFlowEnvironment = {
    cwd: process.env.INIT_CWD ?? process.cwd(),
    workspaceRoot,
    isInteractive: io.stdin.isTTY === true && io.stdout.isTTY === true,
    isCi: process.env.CI === 'true',
    output,
    prompts: createPromptAdapter(),
  };
  const program = createProgram(env);

  try {
    await program.parseAsync(argv, { from: 'user' });
    return 0;
  } catch (error) {
    if (error instanceof CreateFlowCancelledError) {
      cancel(error.message);
      return 130;
    }

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'commander.helpDisplayed'
    ) {
      return 0;
    }

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'commander.version'
    ) {
      return 0;
    }

    const message = error instanceof Error ? error.message : String(error);
    output.error(message);
    return 1;
  }
}

if (isDirectCliRun(import.meta.url, process.argv[1])) {
  const exitCode = await main();
  process.exitCode = exitCode;
}

export {
  DEFAULT_PROJECT_NAME,
  DEFAULT_PUBLIC_SETUP_SLUG,
  PROMPT_CANCELLED,
  SETUP_PROMPT_CHOICES,
  derivePackageName,
  normalizeSetupInput,
  runCreateFlow,
  validatePackageName,
  validateProjectName,
};
export type { CreateCommandOptions, CreateFlowEnvironment, PromptAdapter };
