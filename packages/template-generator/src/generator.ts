import { readTemplateTree, type TemplateContext } from './template-reader';
import { mergeVirtualFileTrees, type VirtualFileTree } from './virtual-file-tree';

export const SUPPORTED_PUBLIC_SETUP_SLUGS = [
  'white-label',
  'runtime-tenants',
  'generic-standalone',
] as const;

export const SUPPORTED_GENERATED_SETUP_TYPE_IDS = [
  'white-label-apps',
  'single-app-runtime-tenants',
  'generic-with-standalone-app-variants',
] as const;

export const SUPPORTED_GENERATED_SETUP_TYPES = SUPPORTED_GENERATED_SETUP_TYPE_IDS;

export type PublicSetupSlug = (typeof SUPPORTED_PUBLIC_SETUP_SLUGS)[number];
export type GeneratedSetupType = (typeof SUPPORTED_GENERATED_SETUP_TYPE_IDS)[number];
export type GeneratedSetupTypeInput = PublicSetupSlug | GeneratedSetupType;

const PUBLIC_SETUP_SLUG_TO_SETUP_TYPE = {
  'white-label': 'white-label-apps',
  'runtime-tenants': 'single-app-runtime-tenants',
  'generic-standalone': 'generic-with-standalone-app-variants',
} as const satisfies Record<PublicSetupSlug, GeneratedSetupType>;

export type WhiteLabelAppsProjectConfig = {
  setupType: 'white-label' | 'white-label-apps';
  projectName?: string;
  packageName?: string;
};

export type SingleAppRuntimeTenantsProjectConfig = {
  setupType: 'runtime-tenants' | 'single-app-runtime-tenants';
  projectName?: string;
  packageName?: string;
};

export type GenericWithStandaloneAppVariantsProjectConfig = {
  setupType: 'generic-standalone' | 'generic-with-standalone-app-variants';
  projectName?: string;
  packageName?: string;
};

export type GenerateProjectConfig =
  | WhiteLabelAppsProjectConfig
  | SingleAppRuntimeTenantsProjectConfig
  | GenericWithStandaloneAppVariantsProjectConfig;

const DEFAULT_WHITE_LABEL_PROJECT_NAME = 'Tenkit White Label App';
const DEFAULT_WHITE_LABEL_PACKAGE_NAME = 'tenkit-white-label-app';
const DEFAULT_RUNTIME_TENANTS_PROJECT_NAME = 'Tenkit Runtime Tenant App';
const DEFAULT_RUNTIME_TENANTS_PACKAGE_NAME = 'tenkit-runtime-tenants';
const DEFAULT_GENERIC_STANDALONE_PROJECT_NAME = 'Tenkit Generic + Standalone Apps';
const DEFAULT_GENERIC_STANDALONE_PACKAGE_NAME = 'tenkit-generic-standalone';
const WHITE_LABEL_APP_VARIANT_SLUGS = ['first-tenant', 'second-tenant'] as const;
const SINGLE_APP_RUNTIME_TENANTS_APP_VARIANT_SLUGS = ['acme-app'] as const;
const GENERIC_WITH_STANDALONE_APP_VARIANT_SLUGS = ['atlas-network', 'west-studio'] as const;

export function formatSupportedGeneratedSetupTypes(): string {
  return `public Setup slugs: ${SUPPORTED_PUBLIC_SETUP_SLUGS.join(', ')}; canonical Setup Type IDs: ${SUPPORTED_GENERATED_SETUP_TYPE_IDS.join(', ')}`;
}

export function normalizeGeneratedSetupType(setupType: string): GeneratedSetupType {
  if (SUPPORTED_PUBLIC_SETUP_SLUGS.includes(setupType as PublicSetupSlug)) {
    return PUBLIC_SETUP_SLUG_TO_SETUP_TYPE[setupType as PublicSetupSlug];
  }

  if (SUPPORTED_GENERATED_SETUP_TYPE_IDS.includes(setupType as GeneratedSetupType)) {
    return setupType as GeneratedSetupType;
  }

  throw new Error(
    `Unsupported generated Setup Type ${JSON.stringify(setupType)}. Expected ${formatSupportedGeneratedSetupTypes()}.`,
  );
}

function normalizeName(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function normalizePackageName(value: string | undefined, fallback: string): string {
  const packageName = normalizeName(value, fallback);

  if (!/^[a-z0-9._-]+$/.test(packageName)) {
    throw new Error(
      `Invalid generated app package name ${JSON.stringify(packageName)}. Use a lowercase package name that can also be used as the Expo Slug.`,
    );
  }

  return packageName;
}

function normalizeTemplateContext({
  projectName: rawProjectName,
  packageName: rawPackageName,
  defaultProjectName,
  defaultPackageName,
}: {
  projectName?: string;
  packageName?: string;
  defaultProjectName: string;
  defaultPackageName: string;
}): TemplateContext {
  const projectName = normalizeName(rawProjectName, defaultProjectName);

  return {
    projectName,
    projectNameStringLiteral: JSON.stringify(projectName),
    packageName: normalizePackageName(rawPackageName, defaultPackageName),
  };
}

function readProjectTemplateTree({
  templatePath,
  context,
  appVariantSlugs,
}: {
  templatePath: string;
  context: TemplateContext;
  appVariantSlugs: readonly string[];
}): VirtualFileTree {
  const sharedTree = readTemplateTree('shared', context);
  const templateTree = readTemplateTree(templatePath, context);
  const assetTree = readTemplateTree('assets', context);
  const appVariantAssets = appVariantSlugs.flatMap((slug) =>
    assetTree.map((file) => ({
      path: `assets/${slug}/${file.path}`,
      contents: file.contents,
    })),
  );

  return mergeVirtualFileTrees(sharedTree, templateTree, appVariantAssets);
}

export function generateWhiteLabelAppsProject(
  config: WhiteLabelAppsProjectConfig = { setupType: 'white-label-apps' },
): VirtualFileTree {
  if (normalizeGeneratedSetupType(config.setupType) !== 'white-label-apps') {
    throw new Error('The Template generator currently supports only White Label Apps output.');
  }

  const context = normalizeTemplateContext({
    projectName: config.projectName,
    packageName: config.packageName,
    defaultProjectName: DEFAULT_WHITE_LABEL_PROJECT_NAME,
    defaultPackageName: DEFAULT_WHITE_LABEL_PACKAGE_NAME,
  });

  return readProjectTemplateTree({
    templatePath: 'white-label',
    context,
    appVariantSlugs: WHITE_LABEL_APP_VARIANT_SLUGS,
  });
}

export function generateSingleAppRuntimeTenantsProject(
  config: SingleAppRuntimeTenantsProjectConfig = { setupType: 'single-app-runtime-tenants' },
): VirtualFileTree {
  if (normalizeGeneratedSetupType(config.setupType) !== 'single-app-runtime-tenants') {
    throw new Error('The Template generator expected Single App Runtime Tenants output.');
  }

  const context = normalizeTemplateContext({
    projectName: config.projectName,
    packageName: config.packageName,
    defaultProjectName: DEFAULT_RUNTIME_TENANTS_PROJECT_NAME,
    defaultPackageName: DEFAULT_RUNTIME_TENANTS_PACKAGE_NAME,
  });

  return readProjectTemplateTree({
    templatePath: 'runtime-tenants',
    context,
    appVariantSlugs: SINGLE_APP_RUNTIME_TENANTS_APP_VARIANT_SLUGS,
  });
}

export function generateGenericWithStandaloneAppVariantsProject(
  config: GenericWithStandaloneAppVariantsProjectConfig = {
    setupType: 'generic-with-standalone-app-variants',
  },
): VirtualFileTree {
  if (normalizeGeneratedSetupType(config.setupType) !== 'generic-with-standalone-app-variants') {
    throw new Error('The Template generator expected Generic With Standalone App Variants output.');
  }

  const context = normalizeTemplateContext({
    projectName: config.projectName,
    packageName: config.packageName,
    defaultProjectName: DEFAULT_GENERIC_STANDALONE_PROJECT_NAME,
    defaultPackageName: DEFAULT_GENERIC_STANDALONE_PACKAGE_NAME,
  });

  return readProjectTemplateTree({
    templatePath: 'generic-standalone',
    context,
    appVariantSlugs: GENERIC_WITH_STANDALONE_APP_VARIANT_SLUGS,
  });
}

export function generateProject(config: GenerateProjectConfig): VirtualFileTree {
  const setupType = normalizeGeneratedSetupType(config.setupType);
  const baseConfig = {
    projectName: config.projectName,
    packageName: config.packageName,
  };

  if (setupType === 'white-label-apps') {
    return generateWhiteLabelAppsProject({
      ...baseConfig,
      setupType,
    });
  }

  if (setupType === 'single-app-runtime-tenants') {
    return generateSingleAppRuntimeTenantsProject({
      ...baseConfig,
      setupType,
    });
  }

  if (setupType === 'generic-with-standalone-app-variants') {
    return generateGenericWithStandaloneAppVariantsProject({
      ...baseConfig,
      setupType,
    });
  }

  throw new Error(
    `Unsupported generated Setup Type ${JSON.stringify((config as { setupType?: unknown }).setupType)}. Expected ${formatSupportedGeneratedSetupTypes()}.`,
  );
}
