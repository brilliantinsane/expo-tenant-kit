import { configs } from '../tenant-configs';
import { EXPO_OWNER } from '../project-config';
import { TENANT_SLUGS, type TenantConfig, type TenantSlug } from '../src/types/tenant-config.types';

export const EAS_CLI_MISSING_MESSAGE =
  'EAS CLI not found. Install it globally using the official EAS CLI installation instructions.';

export const TENANT_ENVIRONMENTS = ['development', 'preview', 'production'] as const;

export type TenantEnvironment = (typeof TENANT_ENVIRONMENTS)[number];
export type BuildPlatform = 'ios' | 'android' | 'both';

export type CommandPlan = {
  bin: string;
  args: string[];
  env?: Record<string, string>;
};

export type BuildPrepareFlags = {
  tenant?: string;
  env?: string;
  platform?: string;
  ios?: boolean;
  android?: boolean;
  both?: boolean;
};

export type BuildContext = {
  ci: boolean;
  expoToken?: string;
  expoOwner?: string;
};

export type BuildPreparePlan = {
  tenant: TenantConfig;
  environment: TenantEnvironment;
  platform: BuildPlatform;
  commands: CommandPlan[];
};

const defaultTenantSlug = TENANT_SLUGS[0];
const DEFAULT_ENVIRONMENT: TenantEnvironment = 'development';

function fail(message: string): never {
  throw new Error(message);
}

function resolveTenant(tenantSlug: string = defaultTenantSlug): TenantConfig {
  if (!TENANT_SLUGS.includes(tenantSlug as TenantSlug)) {
    fail(
      `Invalid Tenant Slug ${JSON.stringify(tenantSlug)}. Expected one of: ${TENANT_SLUGS.join(', ')}`,
    );
  }

  return configs[tenantSlug as TenantSlug];
}

function resolveTenantEnvironment(value: string = DEFAULT_ENVIRONMENT): TenantEnvironment {
  if (!TENANT_ENVIRONMENTS.includes(value as TenantEnvironment)) {
    fail(
      `Invalid Tenant Environment ${JSON.stringify(value)}. Expected one of: ${TENANT_ENVIRONMENTS.join(', ')}`,
    );
  }

  return value as TenantEnvironment;
}

function getTenantEasProjectId(tenant: TenantConfig): string {
  const projectId = tenant.extra?.eas?.projectId;

  return typeof projectId === 'string' ? projectId.trim() : '';
}

function assertTenantHasEasProjectId(tenant: TenantConfig) {
  if (getTenantEasProjectId(tenant)) {
    return;
  }

  fail(
    `Tenant "${tenant.name}" (${tenant.slug}) is missing an EAS Project ID. ` +
      `Create or find this Tenant's EAS Project in your Expo account, copy the EAS Project ID, ` +
      `and paste it into tenant-configs.ts for this Tenant. ` +
      `Optional helper: TENANT_SLUG=${tenant.slug} eas init can create or discover the ID; ` +
      `if it prints the projectId and then fails because this app uses dynamic config, copy the printed ID.`,
  );
}

function assertExpoOwnerConfigured(expoOwner: string = EXPO_OWNER) {
  if (expoOwner.trim()) {
    return;
  }

  fail(
    'Missing Expo Owner. Set the global Expo Owner in project-config.ts to your Expo account or organization before Build Preparation.',
  );
}

function selectedPlatformFlags(flags: {
  platform?: string;
  ios?: boolean;
  android?: boolean;
  both?: boolean;
}): string[] {
  return [
    flags.platform ? `--platform ${flags.platform}` : undefined,
    flags.ios ? '--ios' : undefined,
    flags.android ? '--android' : undefined,
    flags.both ? '--both' : undefined,
  ].filter((flag): flag is string => Boolean(flag));
}

function resolveBuildPlatform(flags: BuildPrepareFlags): BuildPlatform {
  const selected = selectedPlatformFlags(flags);

  if (selected.length > 1) {
    fail('Choose only one platform option.');
  }

  const platform =
    flags.platform ??
    (flags.ios ? 'ios' : flags.android ? 'android' : flags.both ? 'both' : 'both');

  if (platform !== 'ios' && platform !== 'android' && platform !== 'both') {
    fail('Invalid platform. Expected one of: ios, android, both');
  }

  return platform;
}

function createEasEnvPullCommand(
  environment: TenantEnvironment,
  tenantSlug: TenantSlug,
): CommandPlan {
  return {
    bin: 'eas',
    args: ['env:pull', '--environment', environment, '--path', '.env.local', '--non-interactive'],
    env: { TENANT_SLUG: tenantSlug },
  };
}

function createPrebuildCommand(platform: BuildPlatform, tenantSlug: TenantSlug): CommandPlan {
  const args = ['expo', 'prebuild', '--clean'];

  if (platform !== 'both') {
    args.push('--platform', platform);
  }

  return {
    bin: 'bun',
    args,
    env: { TENANT_SLUG: tenantSlug },
  };
}

export function planBuildPrepare({
  flags,
  context,
}: {
  flags: BuildPrepareFlags;
  context: BuildContext;
}): BuildPreparePlan {
  if (
    context.ci &&
    (!flags.tenant || !flags.env || selectedPlatformFlags(flags).length === 0 || !context.expoToken)
  ) {
    fail(
      'CI build preparation requires --tenant, --platform or platform shortcut, --env, and EXPO_TOKEN.',
    );
  }

  const tenant = resolveTenant(flags.tenant);
  assertTenantHasEasProjectId(tenant);
  assertExpoOwnerConfigured(context.expoOwner);

  const environment = resolveTenantEnvironment(flags.env);
  const platform = resolveBuildPlatform(flags);

  return {
    tenant,
    environment,
    platform,
    commands: [
      createEasEnvPullCommand(environment, tenant.slug),
      createPrebuildCommand(platform, tenant.slug),
    ],
  };
}

export function planBuildReset(): BuildPreparePlan {
  return planBuildPrepare({
    flags: { tenant: defaultTenantSlug, env: DEFAULT_ENVIRONMENT, platform: 'both' },
    context: { ci: false, expoToken: undefined },
  });
}
