import { defineWhiteLabelAppsSetup } from '@/setup-types/white-label-apps';

export const activeSetup = defineWhiteLabelAppsSetup({
  setupType: 'white-label-apps',
  defaultAppVariantId: 1,
  appVariants: [
    {
      appVariantId: 1,
      slug: 'first-tenant',
      name: 'FirstTenant',
      version: '1.0.0',
      scheme: 'firsttenant',
      bundleIdentifier: 'com.brilliantinsane.firsttenant',
      packageName: 'com.brilliantinsane.firsttenant',
      theme: {
        accent: '#208AEF',
      },
      eas: {
        // Fill in downstream private apps after creating or finding the App Variant's EAS Project.
        projectId: '',
      },
    },
    {
      appVariantId: 2,
      slug: 'second-tenant',
      name: 'SecondTenant',
      version: '1.0.0',
      scheme: 'secondtenant',
      bundleIdentifier: 'com.brilliantinsane.secondtenant',
      packageName: 'com.brilliantinsane.secondtenant',
      theme: {
        accent: '#ef8520',
      },
      eas: {
        // Fill in downstream private apps after creating or finding the App Variant's EAS Project.
        projectId: '',
      },
    },
  ],
});
