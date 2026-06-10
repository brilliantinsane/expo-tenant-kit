# Expo Tenant Kit

Prototype kit for producing distinct Expo applications from configured Tenants.

## Setup Instructions

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd expo-tenant-kit
   ```

2. **Install nvm (Node Version Manager) globally on the system**

   - Mac and Linux: `https://github.com/nvm-sh/nvm?tab=readme-ov-file#install--update-script`
   - Mac using Brew: `https://formulae.brew.sh/formula/nvm`
   - Windows: `https://github.com/coreybutler/nvm-windows?tab=readme-ov-file#nvm-for-windows`

3. **Verify nvm is correctly installed**

   ```bash
   nvm -v
   ```

4. **Use the correct Node.js version**

   ```bash
   nvm use
   ```

   If the version from `.nvmrc` is not installed yet, run:

   ```bash
   nvm install
   nvm use
   ```

5. **Install Bun**

   Use Bun for package scripts and dependency management in this repo. Do not use npm for local
   setup, scripts, or dependency changes.

   ```bash
   bun --version
   ```

   If Bun is not installed, follow `https://bun.sh/docs/installation`.

6. **Install dependencies**

   ```bash
   bun install
   ```

7. **Configure environment**

   Create a `.env.local` file from the example file:

   ```bash
   cp .env.example .env.local
   ```

   Set `TENANT_SLUG` to one of the accepted Tenant Slugs, such as `first-tenant` or
   `second-tenant`. If `TENANT_SLUG` is omitted, the first configured Tenant is used.

8. **Configure VS Code**

   If you use VS Code, install the recommended workspace extensions when prompted. This repo
   already includes workspace settings and a Prettier config.

9. **Start the app**

   ```bash
   bun run start
   ```

   The Expo CLI output includes options for opening the app in a development build, Android
   emulator, iOS simulator, web browser, or Expo Go.

10. **Run the default Tenant on iOS**

    ```bash
    bun run ios
    ```

11. **Run the default Tenant on Android**

    ```bash
    bun run android
    ```

## Per Tenant Instructions

1. **Choose a Tenant Slug**

   Accepted Tenant Slugs currently live in `src/types/tenant-config.types.ts`:

   - `first-tenant` - the default Tenant when `TENANT_SLUG` is omitted.
   - `second-tenant` - the second configured Tenant.

   Full Tenant config lives in `tenant-configs.ts`.

2. **Configure the selected Tenant**

   Set the selected Tenant in `.env.local`:

   ```bash
   TENANT_SLUG=second-tenant
   ```

   For a one-off command, pass the Tenant Slug inline:

   ```bash
   TENANT_SLUG=second-tenant bun run ios
   ```

3. **Run the configured Tenant on iOS**

   ```bash
   bun run ios
   ```

4. **Run the configured Tenant on Android**

   ```bash
   bun run android
   ```

5. **Regenerate native projects after native config changes**

   If a Tenant's native identity, package name, scheme, icons, splash assets, or plugin config
   changes, regenerate native projects before running the native app:

   ```bash
   TENANT_SLUG=second-tenant bun expo prebuild --clean
   ```

6. **Add or update a Tenant**

   To add a Tenant, update:

   - `src/types/tenant-config.types.ts` - add the Tenant Slug to `TENANT_SLUGS`.
   - `tenant-configs.ts` - add the Tenant's config entry.
   - `assets/<tenant-slug>/icons/` - add required Android/general icons.
   - `assets/<tenant-slug>/app.icon/` - add required iOS icon asset catalog files.

   Required asset paths are validated when the dynamic Expo config resolves the selected Tenant.

## Checks

```bash
bun test tests/tenant-configs.test.ts tests/tenant-runtime-config.test.ts
bunx tsc --noEmit --pretty false
bun run lint
```

## Expo Docs

This repo targets Expo SDK 56. Read the exact versioned docs before changing Expo code:

https://docs.expo.dev/versions/v56.0.0/
