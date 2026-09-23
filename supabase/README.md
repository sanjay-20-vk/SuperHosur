# SuperHosur Database Foundation

Phase 2B contains the initial multi-city marketplace schema. It intentionally excludes authentication screens, quotes, transactions, messaging, notifications, AI tables, and payment tables.

## Migration order

1. `20260915000100_extensions_and_helpers.sql` enables `pgcrypto` in the `extensions` schema and adds the shared timestamp trigger.
2. `20260915000200_identity_and_taxonomy.sql` creates profiles, cities, categories, and subcategories, and seeds Hosur plus structural category names.
3. `20260915000300_businesses_and_supply.sql` creates businesses, services, products, photos, and videos.
4. `20260915000400_properties.sql` creates properties and property photo metadata.
5. `20260915000500_requirements_and_matching.sql` creates customer requirements and requirement matches.
6. `20260915000600_indexes_rls_and_security.sql` adds indexes, grants, RLS policies, ownership helpers, and protected fields.

## Relationships

- `profiles.id` references `auth.users.id`.
- Businesses and properties reference `cities.id` and `profiles.id` for ownership.
- Business services and products reference their business and taxonomy records.
- Business and property media store Supabase Storage paths, not binary data.
- Requirements reference customers, cities, and optional categories.
- Requirement matches connect requirements to businesses with a unique pair constraint.

## Security model

- Row Level Security is enabled on every Phase 2B table.
- Public users can read only active taxonomy and verified, active business/property information. Media must also be approved.
- Customers can manage their own profile and eligible requirements.
- Vendors can manage only businesses, services, products, media, and properties they own.
- Vendors can read requirements only through authorized requirement matches; there is no broad vendor requirement policy.
- Administrative access is controlled by the database `profiles.role` value through a security-definer helper.
- Normal clients cannot promote a profile to `admin`; role changes are reserved for service-role operations.
- Business/property verification is protected from normal clients.
- Requirement status changes are protected from normal clients except cancellation of open or matching requirements.

## Applying migrations

The Supabase CLI is used through `npx supabase@latest`. The project is initialized locally under `supabase/`, but remote linking and migration application require an authenticated Supabase CLI session.

After authenticating with the official CLI, link the existing project and apply migrations with the project reference from the Supabase dashboard:

```bash
npx supabase@latest link --project-ref <project-ref>
npx supabase@latest db push
```

Do not use `db reset` against the remote project. Do not put a database password, service-role key, or access token in source control. Run `npx supabase@latest db lint --linked` after linking to validate the remote schema.

Generated TypeScript database types should be created only after the migrations have been successfully applied to the target project:

```bash
npx supabase@latest gen types typescript --linked > src/types/database.ts
```
