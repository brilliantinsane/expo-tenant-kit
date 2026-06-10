# Expo Tenant Kit

Domain language for a prototype kit that can produce distinct Expo applications and later support multiple tenants inside a broader business model.

## Language

**Tenant**:
An independently branded application identity. Each Tenant is configured as its own application.
_Avoid_: App Variant

**Tenant ID**:
A required numeric identifier for a Tenant.
_Avoid_: Tenant name, Tenant slug

**Tenant Slug**:
A build-time selector for a Tenant.
_Avoid_: Optional tenant selector

**Business Model**:
A future concept that may group or shape Tenant behaviour, but is intentionally out of scope for the current prototype.
_Avoid_: BM
