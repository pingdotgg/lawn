# Remove Auth-Critical User Table (Use Clerk IDs Directly)

## Objective

Eliminate dependency on a synced Convex `users` table for authentication and authorization.

Move identity authority to Clerk user IDs (`identity.subject`) and make user profile storage optional/cache-only rather than required for app correctness.

## Why this is needed

Current architecture requires a local `users` row before core features work:

- Team ownership and membership reference `v.id("users")`
- `requireUser` depends on finding a local user document via Clerk ID
- `useUserSync` must run in the client to provision identity data

This creates race conditions and hidden coupling between UI mount timing and auth correctness.

## Target end state

1. Team/project/video access checks use Clerk subject (`string`) directly.
2. `useUserSync` is removed from auth-critical path (and likely deleted).
3. `users` table is removed, or retained only as optional denormalized cache not used for auth.
4. All permission gates function correctly without any client-side bootstrap sync step.

## Data Model Changes

## Phase 1 schema expansion (dual-write / backward compatible)

Add Clerk identity fields while keeping existing fields during migration:

### `teams`

- add `ownerClerkId: string` (alongside existing `ownerId`)

### `teamMembers`

- add `userClerkId: string` (alongside existing `userId`)
- add index `by_team_and_clerk` on `[teamId, userClerkId]`
- add index `by_clerk` on `[userClerkId]`

### `teamInvites`

- no identity model change required immediately (email-based)

### Optional temporary table for profile cache

- keep `users` during migration for display metadata
- after migration, replace with `profiles` keyed by `clerkId` if desired

## Phase 2 schema cleanup (final)

When fully migrated and verified:

- remove `teams.ownerId`
- remove `teamMembers.userId`
- drop `users` table if no longer needed

## Backend Function Migration

## Phase 1: Introduce identity-first helpers

Create new helper functions in `convex/auth.ts`:

1. `requireIdentity(ctx)` -> returns Clerk identity (subject, email, etc.)
2. `requireTeamAccessByClerk(ctx, teamId, requiredRole?)`
   - membership lookup via `by_team_and_clerk`
3. Update `requireProjectAccess` / `requireVideoAccess` to use new team access helper.

Keep old helpers temporarily for compatibility, then remove.

## Phase 2: Migrate call sites

Update all functions in:

- `convex/teams.ts`
- `convex/projects.ts`
- `convex/videos.ts`
- `convex/comments.ts`
- `convex/shareLinks.ts` (if user references exist)

Replace reads/writes of internal user IDs with Clerk IDs.

## Phase 3: Invite and membership operations

### Team create

- `teams.create` sets `ownerClerkId = identity.subject`
- inserts membership with `userClerkId = identity.subject`, role `owner`

### Membership checks

- `requireTeamAccess` uses `userClerkId`

### Member listing UI

Since no mandatory `users` table:

- Option A (recommended): store snapshot fields on membership (`displayName`, `avatarUrl`, `email`) at join time and allow updates
- Option B: fetch member profile from Clerk API in action/query (slower + external dependency)

Prefer Option A for fast reactive UI.

## Frontend Migration

1. Remove dependency on `useUserSync` hook.
2. Remove any assumptions that local user exists before queries run.
3. Ensure member list components consume whatever new member display source is chosen (membership snapshot or profile cache).
4. Keep Clerk as canonical current-user source in client for display only.

## Data Migration Strategy

Use additive + backfill + switch + cleanup.

## Step 1: Add new fields/indexes

Deploy schema with new `ownerClerkId`, `userClerkId`, and indexes.

## Step 2: Backfill existing data

Create internal migration function:

1. Iterate teams:
   - read existing `ownerId` -> lookup users table -> set `ownerClerkId`
2. Iterate teamMembers:
   - read `userId` -> lookup users table -> set `userClerkId`
3. Log and report any rows that cannot resolve Clerk IDs.

Run in batches if dataset is large.

## Step 3: Dual-read / dual-write period

1. Auth checks prefer `userClerkId`; fallback to old `userId` path where needed.
2. New writes populate both old and new fields.
3. Monitor missing/mismatch counts.

## Step 4: Cutover

1. Remove fallback reads.
2. Stop writing old fields.
3. Remove `useUserSync` usage and mutation calls.

## Step 5: Cleanup

1. Remove old fields and indexes from schema.
2. Remove `users` table (or convert to non-critical profile cache).
3. Remove dead queries/mutations:
   - `users.syncUser`
   - `users.current/getById/getByEmail` (if unused)

## UI and feature implications

### Team/member display

Without users table joins, choose one:

1. **Membership snapshots (recommended)**
   - add to `teamMembers`: `email`, `name`, `avatarUrl` (optional)
   - populated on create/join/invite acceptance
2. **Profile cache table**
   - table keyed by `clerkId`, not required for auth
3. **Live Clerk lookup**
   - only for admin pages, avoid in hot-path reactive queries

### Invites

No major change; invite flow is already email-based.

## Risks and mitigations

1. Risk: Backfill cannot map some legacy users.
   - Mitigation: produce reconciliation report + admin repair script.
2. Risk: Dual-read complexity introduces temporary logic bugs.
   - Mitigation: short dual period, exhaustive tests, feature flag if needed.
3. Risk: Member list loses profile quality if no replacement chosen.
   - Mitigation: implement membership snapshots before removing users table.

## Testing Plan

## Backend tests

1. `requireTeamAccess` succeeds with Clerk ID membership.
2. Unauthorized Clerk user rejected correctly.
3. Project/video access cascades still enforce team boundaries.
4. Invite acceptance creates correct `userClerkId` membership.

## E2E tests

1. Fresh user can create team immediately (no sync step).
2. Existing user can access prior teams after migration.
3. Invite accept path works with correct account and rejects wrong account.
4. Member management (role update/remove) continues to work.

## Operational checks

1. Migration backfill summary has zero unresolved production users (or explicitly waived).
2. Error rates for auth/access functions do not spike post-cutover.

## Rollout sequence (recommended)

1. PR 1: schema additive fields + indexes + backfill utility
2. PR 2: auth helper dual-read + dual-write
3. PR 3: migrate all call sites and UI reads to Clerk-ID model
4. PR 4: remove `useUserSync` and users mutation usage
5. PR 5: cleanup old fields/table + dead code

## Success criteria

1. No auth/permission path requires local user upsert.
2. Deleting or disabling `users.syncUser` does not break team/project flows.
3. New-user first-load experience has no identity race conditions.
4. Codebase has a single identity authority for access control: Clerk subject.

## File impact map

Likely touched files:

- `convex/schema.ts`
- `convex/auth.ts`
- `convex/teams.ts`
- `convex/projects.ts`
- `convex/videos.ts`
- `convex/comments.ts`
- `convex/users.ts` (deprecate/remove)
- `src/hooks/useUserSync.ts` (remove)
- `src/components/teams/MemberInvite.tsx` (member display source updates)

