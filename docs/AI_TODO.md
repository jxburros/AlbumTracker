# Album Tracker Roadmap Implementation Plan

Order check: current phase ordering already aligns with dependencies (data foundations → core functions → visualization → global systems → polish). Proceed sequentially from Phase 0 through Phase 10.

## Phase 0 — Core Data Infrastructure & System-Wide Cleanup ✓ COMPLETE
- [x] Unify schemas: remove obsolete fields (song category, short-form extra versions, album short form in settings).
- [x] Add availability windows (exclusive start/end) to songs, versions, videos, and releases.
- [x] Add multi-release linking for songs and versions; multi-video-type checkboxes.
- [x] Introduce unified Task object and standardize task schema across songs, versions, videos, releases, global tasks, and events.
- [x] Add cost layers (estimated/quoted/paid) and custom tasks on any entity.
- [x] Refactor cost architecture: editable costs only via tasks or misc expenses; compute totals by summing nested tasks with precedence Paid > Quoted > Estimated; enable misc expenses assignable to team members.

## Phase 1 — Songs & Song Versions Overhaul ✓ COMPLETE
- [x] Support songs/versions belonging to multiple releases, singles, their own release dates, exclusive availability, videos, and tasks.
- [x] Implement core vs non-core task rules: core song tasks apply to all versions unless overridden; auto-generate arrangement/instrumentation/mix/master/release tasks for non-core versions.
- [x] Enable instrument management on core songs and individual versions.
- [x] Build "Generate Template Version" tool to copy instruments, metadata, base tasks, video type selections, and cost logic.

## Phase 2 — Video System Overhaul (depends on Phase 1) ✓ COMPLETE
- [x] Auto-create videos from song/video-type checkboxes with generated hire crew/film/edit/release tasks.
- [x] Allow standalone videos not tied to songs.
- [x] Allow custom tasks on all videos.

## Phase 3 — Releases Overhaul (depends on Phase 1) ✓ COMPLETE
- [x] Auto-populate required recordings from song/version selections.
- [x] Auto-generate release tasks: album art, tracklist selection, physical production (if enabled), release task.
- [x] Fix release recalculation crash.

## Phase 4 — Tasks, Global Tasks & Active Tasks (foundation for timeline/calendar) ✓ COMPLETE
- [x] Add global/misc tasks with team members, costs, and due dates.
- [x] Create unified task editor component with consistent interactions, fields, and cost behavior.
- [x] Enable team member assignment on all tasks (songs, versions, videos, releases, global tasks, events).
- [x] Unify version tasks and song tasks display: show in the same location with clear notation of which version each task belongs to (core version tasks and song tasks are interchangeable).
- [x] Remove "inherits from core" checkbox from task interface (functionality appears to be obsolete).
- [x] Remove video type field from Songs page basic information section.
- [x] Improve method for adding releases to versions and add ability to decouple/unlink releases from versions.
- [x] Build active tasks view highlighting in-progress, unpaid, and upcoming-due tasks.
- [x] Support task archiving and deletion.

## Phase 5 — Calendar & Events (after tasks/events are stable) ✓ COMPLETE
- [x] Overhaul calendar to make tasks, releases, songs, versions, events, and videos clickable.
- [x] Enhance events: allow custom tasks, disable auto-generated tasks, improve scroll behavior, and fix upper-right navigation controls.

## Phase 6 — Combined Timeline (depends on Phases 4 & 5) ✓ COMPLETE
- [x] Create global unified timeline without song filter showing tasks, events, video tasks, release tasks, and song-version tasks with clickable entries; improve day/week/month views.
- [x] Plot exclusivity start/end windows on timeline.

## Phase 7 — Photos & Media Enhancements ✓ COMPLETE
- [x] Enable photo enlargement on click and editable title/description.
- [x] Support download of single photo or all photos.

## Phase 8 — Team Members Enhancements ✓ COMPLETE
- [x] Upgrade team members with musician flag and instrument assignments.
- [x] Allow musicians to be assigned to songs and versions.
- [x] Allow musicians to be assigned to videos and tasks.

## Phase 9 — Advanced Global Systems (depends on stable tasks/releases/timelines) ✓ PARTIALLY COMPLETE
- [x] Implement notification system (due dates, release dates, overdue tasks, budget exceeded).
- [x] Build Financials View with filter panel (Stage/Era/Release/Song/Version/Item Type) and cost mode selection (paid/quoted/estimated/effective).
- [x] Build Progress View with filters (Era/Stage/Tag/Item Type/Release/Song) and progress tracking.
- [ ] Provide reporting/exporting (PDF/CSV/printable) for releases summary, budget summary, task list, song version comparison, album rollout timeline.
- [ ] Add activity log/change history covering tasks, costs, release dates, song versions, team members, release membership changes, and completion/archival/trash actions.
- [x] Build master dashboard showing releases, songs, versions, video tasks, budget progress, upcoming deadlines, exclusivity windows, notifications.

## Phase 10 — Final UX Polish & Dark Mode Fix ✓ MOSTLY COMPLETE
- [x] Improve dark mode readability and accent color usage.
- [ ] Ensure UI consistency across tasks, songs, timeline, releases, videos, and calendar.

---

## Section 3 — Item More/Edit Info Pages ✓ PARTIALLY COMPLETE
Per `music-tracker-implementation-plan.md` Section 3:
- [x] Display Information module (read-only linked data) for SongDetailView
- [x] Task sorting and filtering controls in SongDetailView
- [x] Clickable column headers for sorting
- [ ] Display Information module for ReleaseDetailView
- [ ] Display Information module for VideoDetailView
- [ ] Task sorting/filtering for ReleaseDetailView

---

## Remaining Items

See `docs/REMAINING_TODO.md` for a tiered TODO list of remaining implementation items sorted by complexity.
