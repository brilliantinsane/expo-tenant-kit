import 'tsx/cjs';

import { ConfigContext, ExpoConfig } from 'expo/config';
import { EXPO_OWNER } from './project-config';
import { resolveTenantConfig } from './tenant-configs';

const COLORS = {
  light: '#F2F2F2',
  dark: '#0D0D0D',
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const { tenantId, name, slug, version, scheme, bundleIdentifier, packageName, theme, extra } =
    resolveTenantConfig({ tenantSlug: process.env.TENANT_SLUG });

  const assetPath = `./assets/${slug}`;
  const icons = `${assetPath}/icons`;
  const iosIcon = `${assetPath}/app.icon`;

  return {
    ...config,
    name,
    slug,
    owner: EXPO_OWNER,
    version,
    scheme,
    icon: `${icons}/icon.png`,
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier,
      icon: iosIcon,
    },
    android: {
      softwareKeyboardLayoutMode: 'pan',
      package: packageName,
      adaptiveIcon: {
        backgroundColor: COLORS.light,
        foregroundImage: `${icons}/android-icon-foreground.png`,
        backgroundImage: `${icons}/android-icon-background.png`,
        monochromeImage: `${icons}/android-icon-monochrome.png`,
      },
      predictiveBackGestureEnabled: false,
    },
    extra: {
      ...extra,
      tenantId,
      slug,
      theme,
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: COLORS.light,
          image: `${icons}/splash-icon.png`,
          dark: {
            backgroundColor: COLORS.dark,
          },
        },
      ],
    ],
  };
};
