# Album Tracker Roadmap Implementation Plan

Order check: current phase ordering already aligns with dependencies (data foundations → core functions → visualization → global systems → polish). Proceed sequentially from Phase 0 through Phase 10.

## Phase 0 — Core Data Infrastructure & System-Wide Cleanup
- [ ] Unify schemas: remove obsolete fields (song category, short-form extra versions, album short form in settings).
- [ ] Add availability windows (exclusive start/end) to songs, versions, videos, and releases.
- [ ] Add multi-release linking for songs and versions; multi-video-type checkboxes.
- [ ] Introduce unified Task object and standardize task schema across songs, versions, videos, releases, global tasks, and events.
- [ ] Add cost layers (estimated/quoted/paid) and custom tasks on any entity.
- [ ] Refactor cost architecture: editable costs only via tasks or misc expenses; compute totals by summing nested tasks with precedence Paid > Quoted > Estimated; enable misc expenses assignable to team members.

## Phase 1 — Songs & Song Versions Overhaul
- [ ] Support songs/versions belonging to multiple releases, singles, their own release dates, exclusive availability, videos, and tasks.
- [ ] Implement core vs non-core task rules: core song tasks apply to all versions unless overridden; auto-generate arrangement/instrumentation/mix/master/release tasks for non-core versions.
- [ ] Enable instrument management on core songs and individual versions.
- [ ] Build "Generate Template Version" tool to copy instruments, metadata, base tasks, video type selections, and cost logic.

## Phase 2 — Video System Overhaul (depends on Phase 1)
- [ ] Auto-create videos from song/video-type checkboxes with generated hire crew/film/edit/release tasks.
- [ ] Allow standalone videos not tied to songs.
- [ ] Allow custom tasks on all videos.

## Phase 3 — Releases Overhaul (depends on Phase 1)
- [ ] Auto-populate required recordings from song/version selections.
- [ ] Auto-generate release tasks: album art, tracklist selection, physical production (if enabled), release task.
- [ ] Fix release recalculation crash.

## Phase 4 — Tasks, Global Tasks & Active Tasks (foundation for timeline/calendar)
- [ ] Add global/misc tasks with team members, costs, and due dates.
- [ ] Create unified task editor component with consistent interactions, fields, and cost behavior.
- [ ] Build active tasks view highlighting in-progress, unpaid, and upcoming-due tasks.
- [ ] Support task archiving and deletion.

## Phase 5 — Calendar & Events (after tasks/events are stable)
- [ ] Overhaul calendar to make tasks, releases, songs, versions, events, and videos clickable.
- [ ] Enhance events: allow custom tasks, disable auto-generated tasks, improve scroll behavior, and fix upper-right navigation controls.

## Phase 6 — Combined Timeline (depends on Phases 4 & 5)
- [ ] Create global unified timeline without song filter showing tasks, events, video tasks, release tasks, and song-version tasks with clickable entries; improve day/week/month views.
- [ ] Plot exclusivity start/end windows on timeline.

## Phase 7 — Photos & Media Enhancements
- [ ] Enable photo enlargement on click and editable title/description.
- [ ] Support download of single photo or all photos.

## Phase 8 — Team Members Enhancements
- [ ] Upgrade team members with musician flag and instrument assignments.
- [ ] Allow musicians to be assigned to songs, versions, videos, and tasks.

## Phase 9 — Advanced Global Systems (depends on stable tasks/releases/timelines)
- [ ] Implement notification system (due dates, release dates, overdue tasks, budget exceeded).
- [ ] Provide reporting/exporting (PDF/CSV/printable) for releases summary, budget summary, task list, song version comparison, album rollout timeline.
- [ ] Add activity log/change history covering tasks, costs, release dates, song versions, team members, release membership changes, and completion/archival/trash actions.
- [ ] Build master dashboard showing releases, songs, versions, video tasks, budget progress, upcoming deadlines, exclusivity windows, notifications.

## Phase 10 — Final UX Polish & Dark Mode Fix
- [ ] Improve dark mode readability and accent color usage.
- [ ] Ensure UI consistency across tasks, songs, timeline, releases, videos, and calendar.
