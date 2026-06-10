import { type TenantConfig } from '@/types/common.types';

type RuntimeConfigExtra = {
  [key: string]: unknown;
  tenantId?: unknown;
};

export function resolveRuntimeTenantConfig(
  extra: RuntimeConfigExtra | null | undefined,
): TenantConfig {
  if (typeof extra?.tenantId !== 'number' || !Number.isFinite(extra.tenantId)) {
    throw new Error('Missing numeric Tenant ID in Expo runtime config');
  }

  return {
    tenantId: extra.tenantId,
  };
}
