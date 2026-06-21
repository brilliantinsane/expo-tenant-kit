/// <reference types="node" />

import { type ConfigContext } from 'expo/config';
import assert from 'node:assert/strict';
import test from 'node:test';

import createExpoConfig from '../app.config';
import { resolveRuntimeActiveSetupConfig } from '../src/utils/runtime-active-setup-config';

const configContext: ConfigContext = {
  projectRoot: process.cwd(),
  staticConfigPath: null,
  packageJsonPath: null,
  config: {},
};

function withAppVariantSlug<T>(slug: string | undefined, callback: () => T): T {
  const previousAppVariantSlug = process.env.APP_VARIANT_SLUG;

  try {
    if (slug === undefined) {
      delete process.env.APP_VARIANT_SLUG;
    } else {
      process.env.APP_VARIANT_SLUG = slug;
    }

    return callback();
  } finally {
    if (previousAppVariantSlug === undefined) {
      delete process.env.APP_VARIANT_SLUG;
    } else {
      process.env.APP_VARIANT_SLUG = previousAppVariantSlug;
    }
  }
}

test('dynamic Expo config injects resolved App Variant native identity and Active Setup bootstrap data', () => {
  const config = withAppVariantSlug('second-tenant', () => createExpoConfig(configContext));

  assert.equal(config.owner, 'brilliant-insane');
  assert.deepEqual(config.extra?.activeSetup, {
    setupType: 'white-label-apps',
    appVariant: {
      id: 2,
      slug: 'second-tenant',
    },
    theme: {
      accent: '#ef8520',
    },
  });
  assert.equal(config.ios?.bundleIdentifier, 'com.brilliantinsane.secondtenant');
  assert.equal(config.android?.package, 'com.brilliantinsane.secondtenant');
});

test('runtime Active Setup config exposes the public Active Setup bootstrap data', () => {
  assert.deepEqual(
    resolveRuntimeActiveSetupConfig({
      activeSetup: {
        setupType: 'single-app-runtime-tenants',
        appVariant: {
          id: 1,
          slug: 'acme-app',
        },
        theme: {
          accent: '#2563eb',
        },
        runtimeTenantAccess: {
          selectionMode: 'selectable',
          defaultRuntimeTenantId: 100,
          allowedRuntimeTenantIds: [100, 101, 102],
        },
      },
    }),
    {
      setupType: 'single-app-runtime-tenants',
      appVariant: {
        id: 1,
        slug: 'acme-app',
      },
      theme: {
        accent: '#2563eb',
      },
      runtimeTenantAccess: {
        selectionMode: 'selectable',
        defaultRuntimeTenantId: 100,
        allowedRuntimeTenantIds: [100, 101, 102],
      },
    },
  );
});

test('runtime Active Setup config fails when Expo runtime config has no Active Setup bootstrap data', () => {
  assert.throws(
    () => resolveRuntimeActiveSetupConfig({}),
    /Missing Active Setup bootstrap data in Expo runtime config/,
  );
});
