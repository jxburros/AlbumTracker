# Collaboration, Notifications, Documents, Onboarding, and Conflict Handling — Phased TODOs

## Phase 1 — Foundation & Hosting Options
- Add a "Hosting & Sync" settings section offering Local Only, Firebase (user-supplied project), and Custom REST API URL options; persist preference.
- Introduce a sync adapter interface with Firebase and generic REST implementations; keep local storage as the base layer.
- Validate auth/session flows for third-party backends (token storage, expiration handling) while maintaining offline-first behavior.

## Phase 2 — Shared Projects & Roles
- Extend project model to include members, invites, and roles (owner/manager/contributor/viewer) with per-action permission checks.
- Build invite flow (email or link tokens) and acceptance handling; add a project-level activity log with recent changes.
- Add UI for member management and activity viewing; gate project mutations by role both locally and through sync adapters.

## Phase 3 — Notifications & Morning Rundown
- Create a Notifications settings tab with toggles for push/email/daily digest time selection and per-trigger preferences.
- Register a service worker for web push; store subscription tokens with the user profile and sync to the chosen backend.
- Implement notification generation rules: due-soon/overdue tasks, budget overruns, assignments, and a morning rundown summarizing today + next 48 hours.
- Add a Notifications side panel/history view with dismiss controls and fallback local toasts when backend delivery is unavailable.

## Phase 4 — Documents Page
- Add a Documents route/tab alongside existing views with list or grid display and optional folder/tag organization.
- Enforce allowed MIME types on upload; store document metadata (name, type, size, url, canPreview) and enable downloads.
- Provide in-app previews only for already supported file types; for others, offer download-only actions.
- Wire document sync through the same adapter system with offline queueing and conflict-safe metadata updates.

## Phase 5 — In-App Onboarding & Help
- Persist an onboarding state flag; add a first-run tooltip/stepper tour across key views (Plan, Active, Calendar, Settings, Documents).
- Create rich empty states with example content for Tasks, Calendar, Photos, Team, Expenses, and Documents.
- Add a Help sidebar linking to quick tips and Firebase/self-host setup guidance.

## Phase 6 — Offline Conflict Handling
- Track `updatedAt` and `lastWriter` (or version vectors) on tasks, expenses, photos, documents, and team entries.
- Detect divergent versions during sync; queue conflicts with context on both local and remote changes.
- Provide a Conflicts modal with side-by-side resolution options (keep mine/theirs/merge for text, duplicate for binaries) and apply choices back through the store.
- Log conflict events to the activity feed for auditability and follow-up.

## Phase 7 — QA & Rollout
- Add targeted tests for sync adapters, permission enforcement, notification generation, document upload/preview rules, onboarding flows, and conflict resolution paths.
- Document configuration steps for self-hosted backends, notification setup, and service worker registration.
- Perform staged releases: ship Foundation → Collaboration → Notifications → Documents → Onboarding → Conflicts, validating telemetry and error logs at each step.
