import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { select } from '@inquirer/prompts';

import {
  EAS_CLI_MISSING_MESSAGE,
  TENANT_ENVIRONMENTS,
  type BuildPrepareFlags,
  type CommandPlan,
  planBuildPrepare,
  planBuildReset,
} from './tenant-cli-core';
import { EXPO_OWNER } from '../project-config';
import { configs } from '../tenant-configs';
import { TENANT_SLUGS, type TenantSlug } from '../src/types/tenant-config.types';

export type RuntimeDeps = {
  ci: boolean;
  expoToken?: string;
  expoOwner?: string;
  projectRoot?: string;
  isEasInstalled: () => boolean;
  isEasLoggedIn: () => boolean;
  promptSelect: (input: PromptSelectInput) => Promise<string>;
  runCommand: (command: CommandPlan) => void;
  log: (message: string) => void;
};

type PromptSelectInput = {
  message: string;
  choices: { name: string; value: string }[];
  defaultValue?: string;
};

export function createRuntimeDeps(): RuntimeDeps {
  return {
    ci: process.env.CI === 'true',
    expoToken: process.env.EXPO_TOKEN,
    projectRoot: process.cwd(),
    isEasInstalled: () => spawnSync('eas', ['--version'], { stdio: 'ignore' }).status === 0,
    isEasLoggedIn: () => spawnSync('eas', ['whoami'], { stdio: 'ignore' }).status === 0,
    promptSelect: ({ message, choices, defaultValue }) =>
      select({ message, choices, default: defaultValue, pageSize: 20 }),
    runCommand: runCommandPlan,
    log: console.log,
  };
}

export function formatCommand(command: CommandPlan): string {
  const env = command.env?.TENANT_SLUG ? `TENANT_SLUG=${command.env.TENANT_SLUG} ` : '';

  return `${env}${command.bin} ${command.args.join(' ')}`;
}

export function runCommandPlan(command: CommandPlan) {
  const result = spawnSync(command.bin, command.args, {
    stdio: 'inherit',
    env: { ...process.env, ...command.env },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command.bin} ${command.args.join(' ')}`);
  }
}

function assertEasAvailable(deps: RuntimeDeps) {
  if (!deps.isEasInstalled()) {
    throw new Error(EAS_CLI_MISSING_MESSAGE);
  }
}

function ensureEasAuth(deps: RuntimeDeps) {
  assertEasAvailable(deps);

  if (deps.ci) {
    if (!deps.expoToken) {
      throw new Error('CI EAS commands require EXPO_TOKEN.');
    }

    return;
  }

  if (!deps.isEasLoggedIn()) {
    deps.log('Before pulling env vars from EAS you need to log in.');
    deps.runCommand({ bin: 'eas', args: ['login'] });
  }
}

function isEasEnvPullCommand(command: CommandPlan) {
  return command.bin === 'eas' && command.args[0] === 'env:pull';
}

function parseEnvFileValue(contents: string, key: string): string | undefined {
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const normalized = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;
    const separatorIndex = normalized.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const name = normalized.slice(0, separatorIndex).trim();

    if (name !== key) {
      continue;
    }

    const value = normalized.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    return value;
  }

  return undefined;
}

function validatePulledEnvLocal(deps: RuntimeDeps, tenantSlug: TenantSlug) {
  const envPath = join(deps.projectRoot ?? process.cwd(), '.env.local');

  if (!existsSync(envPath)) {
    throw new Error(
      '.env.local was not created after eas env:pull. This is an EAS CLI workflow error because Build Preparation passes --path .env.local explicitly.',
    );
  }

  const tenantSlugValue = parseEnvFileValue(readFileSync(envPath, 'utf8'), 'TENANT_SLUG');

  if (!tenantSlugValue) {
    throw new Error(
      `.env.local is missing TENANT_SLUG. Add TENANT_SLUG=${tenantSlug} to this Tenant's EAS environment variables before running Build Preparation.`,
    );
  }

  if (tenantSlugValue !== tenantSlug) {
    throw new Error(
      `.env.local TENANT_SLUG "${tenantSlugValue}" does not match selected Tenant "${tenantSlug}". Fix this Tenant's EAS environment variables before running Build Preparation.`,
    );
  }
}

function hasPlatformSelection(flags: BuildPrepareFlags) {
  return Boolean(flags.platform || flags.ios || flags.android || flags.both);
}

async function promptForBuildPrepareFlags(flags: BuildPrepareFlags, deps: RuntimeDeps) {
  if (deps.ci) {
    return flags;
  }

  const tenant =
    flags.tenant ??
    (await deps.promptSelect({
      message: 'Select a Tenant:',
      choices: TENANT_SLUGS.map((slug) => ({
        name: `${configs[slug].name} (${slug})`,
        value: slug,
      })),
      defaultValue: TENANT_SLUGS[0],
    }));

  const platform = hasPlatformSelection(flags)
    ? flags.platform
    : await deps.promptSelect({
        message: 'Select a platform:',
        choices: [
          { name: 'both', value: 'both' },
          { name: 'ios', value: 'ios' },
          { name: 'android', value: 'android' },
        ],
        defaultValue: 'both',
      });

  const environment =
    flags.env ??
    (await deps.promptSelect({
      message: 'Select a Tenant Environment:',
      choices: TENANT_ENVIRONMENTS.map((environment) => ({
        name: environment,
        value: environment,
      })),
      defaultValue: 'development',
    }));

  return {
    ...flags,
    tenant,
    env: environment,
    platform,
  };
}

export async function runBuildPrepare(flags: BuildPrepareFlags, deps = createRuntimeDeps()) {
  const resolvedFlags = await promptForBuildPrepareFlags(flags, deps);
  const plan = planBuildPrepare({
    flags: resolvedFlags,
    context: { ci: deps.ci, expoToken: deps.expoToken, expoOwner: deps.expoOwner ?? EXPO_OWNER },
  });

  deps.log('Preparing build');
  deps.log(`Tenant: ${plan.tenant.name} (${plan.tenant.slug})`);
  deps.log(`Environment: ${plan.environment}`);
  deps.log(`Platform: ${plan.platform}`);

  ensureEasAuth(deps);

  for (const command of plan.commands) {
    deps.log(`Running: ${formatCommand(command)}`);
    deps.runCommand(command);

    if (isEasEnvPullCommand(command)) {
      validatePulledEnvLocal(deps, plan.tenant.slug);
    }
  }
}

export async function runBuildReset(deps = createRuntimeDeps()) {
  const plan = planBuildReset();

  deps.log('Resetting build');
  deps.log(`Tenant: ${plan.tenant.name} (${plan.tenant.slug})`);
  deps.log(`Environment: ${plan.environment}`);
  deps.log(`Platform: ${plan.platform}`);

  ensureEasAuth(deps);

  for (const command of plan.commands) {
    deps.log(`Running: ${formatCommand(command)}`);
    deps.runCommand(command);

    if (isEasEnvPullCommand(command)) {
      validatePulledEnvLocal(deps, plan.tenant.slug);
    }
  }
}
