/// <reference types="node" />

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { type CommandPlan } from '../scripts/tenant-cli-core';
import { runBuildPrepare, runBuildReset } from '../scripts/tenant-cli-runtime';
import { configs } from '../tenant-configs';

async function withTenantProjectIds<T>(callback: () => Promise<T>): Promise<T> {
  const previousFirstProjectId = configs['first-tenant'].extra?.eas?.projectId;
  const previousSecondProjectId = configs['second-tenant'].extra?.eas?.projectId;

  try {
    configs['first-tenant'].extra = {
      ...configs['first-tenant'].extra,
      eas: { projectId: '11111111-1111-1111-1111-111111111111' },
    };
    configs['second-tenant'].extra = {
      ...configs['second-tenant'].extra,
      eas: { projectId: '22222222-2222-2222-2222-222222222222' },
    };

    return await callback();
  } finally {
    configs['first-tenant'].extra = {
      ...configs['first-tenant'].extra,
      eas: { projectId: previousFirstProjectId },
    };
    configs['second-tenant'].extra = {
      ...configs['second-tenant'].extra,
      eas: { projectId: previousSecondProjectId },
    };
  }
}

async function withFirstTenantProjectId<T>(
  projectId: string,
  callback: () => Promise<T>,
): Promise<T> {
  const previousFirstProjectId = configs['first-tenant'].extra?.eas?.projectId;

  try {
    configs['first-tenant'].extra = {
      ...configs['first-tenant'].extra,
      eas: { projectId },
    };

    return await callback();
  } finally {
    configs['first-tenant'].extra = {
      ...configs['first-tenant'].extra,
      eas: { projectId: previousFirstProjectId },
    };
  }
}

function recordCommandAndWritePulledEnv(
  events: string[],
  command: CommandPlan,
  projectRoot: string,
) {
  events.push(`${command.bin} ${command.args.join(' ')} ${command.env?.TENANT_SLUG ?? ''}`.trim());

  if (command.bin === 'eas') {
    writeFileSync(join(projectRoot, '.env.local'), `TENANT_SLUG=${command.env?.TENANT_SLUG}\n`);
  }
}

test('build preparation with missing Tenant EAS Project ID fails before auth or commands', async () => {
  const events: string[] = [];

  await withFirstTenantProjectId('', async () => {
    await assert.rejects(
      () =>
        runBuildPrepare(
          { tenant: 'first-tenant', env: 'development', platform: 'ios' },
          {
            ci: false,
            expoToken: undefined,
            isEasInstalled: () => {
              events.push('checked EAS install');
              return true;
            },
            isEasLoggedIn: () => {
              events.push('checked EAS login');
              return true;
            },
            promptSelect: async () => {
              throw new Error('complete flags should not prompt');
            },
            runCommand: (command) => {
              events.push(command.bin);
            },
            log: (message) => events.push(message),
          },
        ),
      /Tenant "FirstTenant" \(first-tenant\) is missing an EAS Project ID/,
    );
  });

  assert.deepEqual(events, []);
});

test('build preparation with missing global Expo Owner fails before auth or commands', async () => {
  const events: string[] = [];

  await withTenantProjectIds(async () => {
    await assert.rejects(
      () =>
        runBuildPrepare(
          { tenant: 'first-tenant', env: 'development', platform: 'ios' },
          {
            ci: false,
            expoToken: undefined,
            expoOwner: '',
            isEasInstalled: () => {
              events.push('checked EAS install');
              return true;
            },
            isEasLoggedIn: () => {
              events.push('checked EAS login');
              return true;
            },
            promptSelect: async () => {
              throw new Error('complete flags should not prompt');
            },
            runCommand: (command) => {
              events.push(command.bin);
            },
            log: (message) => events.push(message),
          },
        ),
      /Missing Expo Owner/,
    );
  });

  assert.deepEqual(events, []);
});

test('local build preparation logs in before EAS env pull and prebuild', async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), 'tenant-env-success-'));
  const events: string[] = [];

  try {
    await withTenantProjectIds(async () => {
      await runBuildPrepare(
        { tenant: 'first-tenant', env: 'development', platform: 'ios' },
        {
          ci: false,
          expoToken: undefined,
          projectRoot,
          isEasInstalled: () => true,
          isEasLoggedIn: () => false,
          promptSelect: async () => {
            throw new Error('complete flags should not prompt');
          },
          runCommand: (command) => {
            recordCommandAndWritePulledEnv(events, command, projectRoot);
          },
          log: (message) => events.push(message),
        },
      );
    });
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }

  assert.deepEqual(events, [
    'Preparing build',
    'Tenant: FirstTenant (first-tenant)',
    'Environment: development',
    'Platform: ios',
    'Before pulling env vars from EAS you need to log in.',
    'eas login',
    'Running: TENANT_SLUG=first-tenant eas env:pull --environment development --path .env.local --non-interactive',
    'eas env:pull --environment development --path .env.local --non-interactive first-tenant',
    'Running: TENANT_SLUG=first-tenant bun expo prebuild --clean --platform ios',
    'bun expo prebuild --clean --platform ios first-tenant',
  ]);
});

test('build preparation fails before prebuild when EAS env pull does not create .env.local', async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), 'tenant-env-missing-'));
  const events: string[] = [];

  try {
    await withTenantProjectIds(async () => {
      await assert.rejects(
        () =>
          runBuildPrepare(
            { tenant: 'first-tenant', env: 'development', platform: 'ios' },
            {
              ci: false,
              expoToken: undefined,
              projectRoot,
              isEasInstalled: () => true,
              isEasLoggedIn: () => true,
              promptSelect: async () => {
                throw new Error('complete flags should not prompt');
              },
              runCommand: (command) => {
                events.push(command.bin);
              },
              log: (message) => events.push(message),
            },
          ),
        /\.env\.local was not created after eas env:pull/,
      );
    });

    assert.deepEqual(events, [
      'Preparing build',
      'Tenant: FirstTenant (first-tenant)',
      'Environment: development',
      'Platform: ios',
      'Running: TENANT_SLUG=first-tenant eas env:pull --environment development --path .env.local --non-interactive',
      'eas',
    ]);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('build preparation fails before prebuild when pulled .env.local omits TENANT_SLUG', async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), 'tenant-env-missing-key-'));
  const events: string[] = [];

  try {
    await withTenantProjectIds(async () => {
      await assert.rejects(
        () =>
          runBuildPrepare(
            { tenant: 'first-tenant', env: 'development', platform: 'ios' },
            {
              ci: false,
              expoToken: undefined,
              projectRoot,
              isEasInstalled: () => true,
              isEasLoggedIn: () => true,
              promptSelect: async () => {
                throw new Error('complete flags should not prompt');
              },
              runCommand: (command) => {
                events.push(command.bin);

                if (command.bin === 'eas') {
                  writeFileSync(
                    join(projectRoot, '.env.local'),
                    'EXPO_PUBLIC_API_URL=https://example.com\n',
                  );
                }
              },
              log: (message) => events.push(message),
            },
          ),
        /\.env\.local is missing TENANT_SLUG/,
      );
    });

    assert.equal(events.includes('bun'), false);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('build preparation fails before prebuild when pulled TENANT_SLUG does not match selected Tenant', async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), 'tenant-env-mismatch-'));
  const events: string[] = [];

  try {
    await withTenantProjectIds(async () => {
      await assert.rejects(
        () =>
          runBuildPrepare(
            { tenant: 'first-tenant', env: 'development', platform: 'ios' },
            {
              ci: false,
              expoToken: undefined,
              projectRoot,
              isEasInstalled: () => true,
              isEasLoggedIn: () => true,
              promptSelect: async () => {
                throw new Error('complete flags should not prompt');
              },
              runCommand: (command) => {
                events.push(command.bin);

                if (command.bin === 'eas') {
                  writeFileSync(join(projectRoot, '.env.local'), 'TENANT_SLUG=second-tenant\n');
                }
              },
              log: (message) => events.push(message),
            },
          ),
        /\.env\.local TENANT_SLUG "second-tenant" does not match selected Tenant "first-tenant"/,
      );
    });

    assert.equal(events.includes('bun'), false);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('build reset prepares default Tenant development environment for both platforms without prompts', async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), 'tenant-env-reset-'));
  const events: string[] = [];

  try {
    await withTenantProjectIds(async () => {
      await runBuildReset({
        ci: false,
        expoToken: undefined,
        projectRoot,
        isEasInstalled: () => true,
        isEasLoggedIn: () => true,
        promptSelect: async () => {
          throw new Error('reset should not prompt');
        },
        runCommand: (command) => {
          recordCommandAndWritePulledEnv(events, command, projectRoot);
        },
        log: (message) => events.push(message),
      });
    });
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }

  assert.deepEqual(events, [
    'Resetting build',
    'Tenant: FirstTenant (first-tenant)',
    'Environment: development',
    'Platform: both',
    'Running: TENANT_SLUG=first-tenant eas env:pull --environment development --path .env.local --non-interactive',
    'eas env:pull --environment development --path .env.local --non-interactive first-tenant',
    'Running: TENANT_SLUG=first-tenant bun expo prebuild --clean',
    'bun expo prebuild --clean first-tenant',
  ]);
});

test('local build preparation prompts for missing Tenant, platform, and Tenant Environment', async () => {
  const projectRoot = mkdtempSync(join(tmpdir(), 'tenant-env-prompt-'));
  const prompts: string[] = [];
  const events: string[] = [];

  try {
    await withTenantProjectIds(async () => {
      await runBuildPrepare(
        {},
        {
          ci: false,
          expoToken: undefined,
          projectRoot,
          isEasInstalled: () => true,
          isEasLoggedIn: () => true,
          promptSelect: async ({ message }) => {
            prompts.push(message);

            if (message === 'Select a Tenant:') {
              return 'second-tenant';
            }

            if (message === 'Select a platform:') {
              return 'android';
            }

            return 'preview';
          },
          runCommand: (command) => {
            recordCommandAndWritePulledEnv(events, command, projectRoot);
          },
          log: (message) => events.push(message),
        },
      );
    });
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }

  assert.deepEqual(prompts, [
    'Select a Tenant:',
    'Select a platform:',
    'Select a Tenant Environment:',
  ]);
  assert.deepEqual(events.slice(0, 4), [
    'Preparing build',
    'Tenant: SecondTenant (second-tenant)',
    'Environment: preview',
    'Platform: android',
  ]);
  assert.equal(events.at(-1), 'bun expo prebuild --clean --platform android second-tenant');
});
