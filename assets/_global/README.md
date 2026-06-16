# Global Assets

Use this folder for assets that are shared by every Tenant built from this codebase.

Global assets belong here when they are part of the shared product experience rather than a Tenant's native app identity. Good examples include:

- fonts used by the shared UI,
- illustrations or images that appear the same in every Tenant,
- shared UI textures, placeholders, empty states, and onboarding art,
- non-branded audio, animation, or document assets,
- design-system assets that app code imports directly.

Tenant-specific native assets do not belong here. Keep those under `assets/<tenant-slug>/` because `app.config.ts` resolves them from the selected Tenant at build time.

Required Tenant asset locations:

```text
assets/<tenant-slug>/icons/icon.png
assets/<tenant-slug>/icons/android-icon-foreground.png
assets/<tenant-slug>/icons/android-icon-background.png
assets/<tenant-slug>/icons/android-icon-monochrome.png
assets/<tenant-slug>/icons/splash-icon.png
assets/<tenant-slug>/app.icon/icon.json
assets/<tenant-slug>/app.icon/Assets/ios-icon-default.png
```

Those paths are validated by `tenant-configs.ts` when the active Tenant is resolved.

If an asset changes by Tenant, put it in that Tenant's folder and reference it through Tenant config or Tenant-aware app code. If an asset is identical for all Tenants, put it here and import it from shared code.

Suggested structure:

```text
assets/_global/
├── fonts/
├── images/
├── illustrations/
└── README.md
```

Keep filenames stable and descriptive. Avoid placing generated native icon or splash outputs in `_global`; those are part of each Tenant's branded native identity.
