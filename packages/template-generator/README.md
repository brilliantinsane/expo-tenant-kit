# @tenkit/template-generator

Template generation package for Tenkit.

This package owns Template source discovery, Handlebars rendering, VirtualFileTree generation,
writer validation, and generated project persistence.

Tenkit Templates generate Expo and React Native project source for white-label
apps, multi-tenant products, App Variant builds, and Runtime Tenant
experiences.

## Boundary

`@tenkit/template-generator` is a generation package, not the public create
entrypoint. Most users should run:

```bash
pnpm create tenkit@latest
```

The public create entrypoint also works through npm, npx, Bun, and bunx. The
Public CLI passes the selected package manager into generation so generated
README commands and package-manager-specific files match the create flow.
Generated app `package.json` files intentionally do not stamp a `packageManager`
field, matching Expo and create-better-t-stack templates.

The Public CLI delegates to this package to render selected Setup Type Templates
and write generated project files.
