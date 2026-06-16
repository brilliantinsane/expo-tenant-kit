/// <reference types="node" />

import { type ConfigContext } from 'expo/config';
import assert from 'node:assert/strict';
import test from 'node:test';

import createExpoConfig from '../app.config';
import { resolveRuntimeTenantConfig } from '../src/utils/runtime-tenant-config';

const configContext: ConfigContext = {
  projectRoot: process.cwd(),
  staticConfigPath: null,
  packageJsonPath: null,
  config: {},
};

function withTenantSlug<T>(tenantSlug: string | undefined, callback: () => T): T {
  const previousTenantSlug = process.env.TENANT_SLUG;

  try {
    if (tenantSlug === undefined) {
      delete process.env.TENANT_SLUG;
    } else {
      process.env.TENANT_SLUG = tenantSlug;
    }

    return callback();
  } finally {
    if (previousTenantSlug === undefined) {
      delete process.env.TENANT_SLUG;
    } else {
      process.env.TENANT_SLUG = previousTenantSlug;
    }
  }
}

test('dynamic Expo config injects the resolved Tenant ID and native identity', () => {
  const config = withTenantSlug('second-tenant', () => createExpoConfig(configContext));

  assert.equal(config.owner, 'brilliant-insane');
  assert.equal(config.extra?.tenantId, 2);
  assert.equal(config.extra?.slug, 'second-tenant');
  assert.equal(config.extra?.theme?.accent, '#ef8520');
  assert.equal(config.ios?.bundleIdentifier, 'com.brilliantinsane.secondtenant');
  assert.equal(config.android?.package, 'com.brilliantinsane.secondtenant');
});

test('runtime Tenant config exposes only the Tenant ID from Expo runtime config', () => {
  process.env.EXPO_PUBLIC_TENANT_ID = '999';

  try {
    assert.deepEqual(
      resolveRuntimeTenantConfig({
        tenantId: 2,
        slug: 'second-tenant',
        theme: { accent: '#ef8520' },
      }),
      { tenantId: 2 },
    );
  } finally {
    delete process.env.EXPO_PUBLIC_TENANT_ID;
  }
});

test('runtime Tenant config fails when Expo runtime config has no numeric Tenant ID', () => {
  assert.throws(
    () => resolveRuntimeTenantConfig({}),
    /Missing numeric Tenant ID in Expo runtime config/,
  );
});
