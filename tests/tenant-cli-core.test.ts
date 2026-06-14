/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EAS_CLI_MISSING_MESSAGE,
  planBuildPrepare,
  planBuildReset,
} from '../scripts/tenant-cli-core';
import { configs } from '../tenant-configs';

function withTenantProjectIds<T>(callback: () => T): T {
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

    return callback();
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

function withFirstTenantProjectId<T>(projectId: string, callback: () => T): T {
  const previousFirstProjectId = configs['first-tenant'].extra?.eas?.projectId;

  try {
    configs['first-tenant'].extra = {
      ...configs['first-tenant'].extra,
      eas: { projectId },
    };

    return callback();
  } finally {
    configs['first-tenant'].extra = {
      ...configs['first-tenant'].extra,
      eas: { projectId: previousFirstProjectId },
    };
  }
}

test('build preparation resolves platform shortcuts and explicit platform values', () => {
  const { shortcut, explicit } = withTenantProjectIds(() => {
    return {
      shortcut: planBuildPrepare({
        flags: { tenant: 'first-tenant', env: 'development', ios: true },
        context: { ci: false, expoToken: undefined },
      }),
      explicit: planBuildPrepare({
        flags: { tenant: 'first-tenant', env: 'development', platform: 'ios' },
        context: { ci: false, expoToken: undefined },
      }),
    };
  });

  assert.equal(shortcut.platform, 'ios');
  assert.equal(explicit.platform, 'ios');
});

test('build preparation rejects conflicting platform shortcuts', () => {
  withTenantProjectIds(() => {
    assert.throws(
      () =>
        planBuildPrepare({
          flags: { tenant: 'first-tenant', env: 'development', ios: true, android: true },
          context: { ci: false, expoToken: undefined },
        }),
      /Choose only one platform/,
    );
  });
});

test('build preparation rejects unknown Tenant Slugs', () => {
  assert.throws(
    () =>
      planBuildPrepare({
        flags: { tenant: 'missing-tenant', env: 'development', platform: 'ios' },
        context: { ci: false, expoToken: undefined },
      }),
    /Invalid Tenant Slug "missing-tenant"/,
  );
});

test('build preparation requires the selected Tenant EAS Project ID', () => {
  withFirstTenantProjectId('', () => {
    assert.throws(
      () =>
        planBuildPrepare({
          flags: { tenant: 'first-tenant', env: 'development', platform: 'ios' },
          context: { ci: false, expoToken: undefined },
        }),
      /missing an EAS Project ID/,
    );
  });
});

test('CI build preparation requires Tenant Slug, platform, Tenant Environment, and EXPO_TOKEN', () => {
  assert.throws(
    () => planBuildPrepare({ flags: {}, context: { ci: true, expoToken: undefined } }),
    /CI build preparation requires --tenant, --platform or platform shortcut, --env, and EXPO_TOKEN/,
  );
});

test('local build preparation resolves defaults without CI auth requirements', () => {
  const plan = withTenantProjectIds(() =>
    planBuildPrepare({
      flags: {},
      context: { ci: false, expoToken: undefined },
    }),
  );

  assert.equal(plan.tenant.slug, 'first-tenant');
  assert.equal(plan.environment, 'development');
  assert.equal(plan.platform, 'both');
});

test('build reset resolves default Tenant, development Tenant Environment, and both platforms', () => {
  const plan = withTenantProjectIds(() => planBuildReset());

  assert.equal(plan.tenant.slug, 'first-tenant');
  assert.equal(plan.environment, 'development');
  assert.equal(plan.platform, 'both');
});

test('build reset requires the default Tenant EAS Project ID', () => {
  withFirstTenantProjectId('', () => {
    assert.throws(() => planBuildReset(), /missing an EAS Project ID/);
  });
});

test('build preparation pulls EAS env vars into explicit .env.local path', () => {
  const plan = withTenantProjectIds(() =>
    planBuildPrepare({
      flags: { tenant: 'first-tenant', env: 'preview', platform: 'android' },
      context: { ci: false, expoToken: undefined },
    }),
  );

  assert.deepEqual(plan.commands[0], {
    bin: 'eas',
    args: ['env:pull', '--environment', 'preview', '--path', '.env.local', '--non-interactive'],
    env: { TENANT_SLUG: 'first-tenant' },
  });
});

test('missing EAS CLI message points to official global installation instructions', () => {
  assert.equal(
    EAS_CLI_MISSING_MESSAGE,
    'EAS CLI not found. Install it globally using the official EAS CLI installation instructions.',
  );
});
