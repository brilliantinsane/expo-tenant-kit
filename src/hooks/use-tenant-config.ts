import Constants from 'expo-constants';

import { TenantConfig } from '@/types/common.types';
import { resolveRuntimeTenantConfig } from '@/utils/runtime-tenant-config';

export const useTenantConfig = (): TenantConfig => {
  // Keep the hook shaped around a resolved config object so future runtime Tenant fields
  // can be added without moving validation back into the hook.
  const tenantConfig = resolveRuntimeTenantConfig(Constants.expoConfig?.extra);

  return tenantConfig;
};
