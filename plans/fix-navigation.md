# Fix Navigation and Workspace Context (Proposal A)

## Objective

Repair broken team/project navigation by making route context canonical and enforcing strict consistency between:

1. URL context (`teamSlug`, `projectId`, `videoId`)
2. Data context (team/project/video relationships in Convex)
3. Authorization context (membership role checks)

This plan keeps team-scoped URLs and removes ambiguous navigation paths.

## Why this plan

The current breakages come from competing models:

- Sidebar links assume static routes (`/dashboard/projects`, `/dashboard/team`, `/dashboard/settings`)
- Actual app routes are team-scoped (`/dashboard/[teamSlug]/...`)
- Several screens trust IDs only and do not verify URL context consistency
- Team creation computes slug in client, while server can mutate slug for uniqueness

This proposal preserves existing product UX while adding strict invariants.

## Scope

- Frontend routing + link generation + sidebar behavior
- Convex query surface for canonical workspace resolution
- Redirect/canonicalization behavior for invalid mismatched URLs
- Team creation navigation correctness
- Optional cleanup of dead navigation components and duplicated path logic

Out of scope:

- Billing model changes
- Permission role model redesign
- Full route flattening

## Core Design

### Canonical routing model

- Team home: `/dashboard/[teamSlug]`
- Team settings: `/dashboard/[teamSlug]/settings`
- Project: `/dashboard/[teamSlug]/[projectId]`
- Video: `/dashboard/[teamSlug]/[projectId]/[videoId]`

### Invariants

1. Any `projectId` used in a team route must belong to the team identified by `teamSlug`.
2. Any `videoId` must belong to `projectId`, and that project must belong to `teamSlug`.
3. If any invariant fails, redirect to canonical URL (or 404 if inaccessible).
4. All app links are generated through a shared route helper (no literal string paths in UI components).

## Implementation Plan

## Phase 0: Safety rails and inventory

1. Add a route helper module, e.g. `src/lib/routes.ts`, with typed helpers:
   - `dashboardHome()`
   - `teamHome(teamSlug)`
   - `teamSettings(teamSlug)`
   - `project(teamSlug, projectId)`
   - `video(teamSlug, projectId, videoId)`
2. Replace hardcoded path literals in dashboard-related components.
3. Add lightweight runtime assertions in dev where route params are consumed.

## Phase 1: Fix immediate broken navigation

1. Update sidebar links in `src/app/dashboard/layout.tsx`:
   - Keep Home -> `/dashboard`
   - Make Projects/Team/Settings resolve from current team context when present
   - When no current team context, route to `/dashboard` (team picker)
2. Mount `TeamSwitcher` in dashboard shell (if desired compact mode) so team context is user-addressable.
3. Ensure active-state logic uses helper-generated canonical routes.

Acceptance:

- Sidebar buttons never point to non-existent pages.
- Switching teams updates paths consistently.

## Phase 2: Server returns canonical route data

1. Extend `teams.create` return payload:
   - Return `{ teamId, slug }` (or richer object), not only `teamId`.
2. Update create-team UI to navigate with returned slug, not locally derived slug.
3. Introduce a `workspace.resolveContext` query (new module or in `teams/projects` domain):
   - Input: `teamSlug`, optional `projectId`, optional `videoId`
   - Output: canonical `{ team, project?, video?, role, canonicalPath }`
   - Reject/return null when membership fails.

Acceptance:

- Team creation always lands on the actual newly-created team route.
- Context query can fully validate route relationships.

## Phase 3: Page-level canonicalization

1. Team page (`/dashboard/[teamSlug]`):
   - Resolve team via canonical query; if not accessible => team-not-found or redirect to `/dashboard`.
2. Project page:
   - Resolve using `teamSlug + projectId`.
   - If `projectId` exists but belongs to different team, redirect to canonical team/project URL.
3. Video page:
   - Resolve `teamSlug + projectId + videoId` with full chain validation.
   - Redirect to canonical path when mismatched.
4. Use `router.replace` for correction to avoid history pollution.

Acceptance:

- Entering mismatched URLs self-heals to canonical URLs.
- No route shows data from a different team slug context.

## Phase 4: Centralize and simplify navigation generation

1. Replace remaining string-built routes across:
   - dashboard pages
   - team/project cards
   - back links
   - invite post-accept redirects (where applicable)
2. Remove unused/dead route assumptions.
3. Add eslint custom rule or lint check (optional) for raw `/dashboard/` literals outside route helper.

Acceptance:

- Single source of truth for route construction.

## Phase 5: Hardening and tests

### Unit/integration checks

1. Route helper tests (`src/lib/routes.test.ts`) for all path constructors.
2. Convex function tests for `resolveContext` relationships:
   - valid chain
   - invalid team slug
   - project not in team
   - video not in project
   - unauthorized member

### E2E flows

1. Create team -> lands on correct slug.
2. Sidebar buttons on team pages always work.
3. Open project/video deep links directly.
4. Mismatch URL auto-correct behavior.

## Data model impact

No schema migration required for this proposal.

Optional index additions if `resolveContext` needs optimization:

- existing `teams.by_slug` is sufficient for team lookup
- project/video lookups are by `_id` and parent linkage checks

## Risks and mitigations

1. Risk: Redirect loops if canonicalization logic is wrong.
   - Mitigation: compare current path vs computed canonical path before replacing.
2. Risk: Temporary UX flicker during resolve query.
   - Mitigation: show loading shell while context resolves; defer rendering critical actions.
3. Risk: Missing team context in shell-level nav.
   - Mitigation: fallback nav target `/dashboard` when `teamSlug` absent.

## Rollout strategy

1. Ship Phase 1 + Phase 2 together (fixes breakage + slug correctness).
2. Ship Phase 3 behind optional feature flag if needed (`NAV_CANONICALIZE=1`).
3. Complete Phase 4 and Phase 5 in follow-up cleanup PR.

## Success metrics

1. 0 navigation links resolving to missing routes.
2. 0 team creation failures caused by slug mismatch.
3. Support tickets about “wrong team/project opened” trend to zero.
4. Reduced route-construction duplication in codebase.

## Recommended file touch list

- `src/app/dashboard/layout.tsx`
- `src/components/teams/CreateTeamDialog.tsx`
- `src/components/teams/TeamSwitcher.tsx`
- `src/app/dashboard/[teamSlug]/page.tsx`
- `src/app/dashboard/[teamSlug]/[projectId]/page.tsx`
- `src/app/dashboard/[teamSlug]/[projectId]/[videoId]/page.tsx`
- `src/lib/routes.ts` (new)
- `convex/teams.ts`
- `convex/projects.ts` (or new workspace context module)

## Non-goals / alternatives considered

- Flattening routes to active-team session model (rejected for this plan)
- Changing role hierarchy or permission semantics
- Replatforming auth identity model

