# Album Tracker – Follow-up TODOs

This list captures the remaining work from the specification that is not yet implemented or needs validation after the last iteration. Use it to plan subsequent development passes.

## Song + Release System
- [x] Enforce a core release association for every song and propagate release dates across attached versions, with overrides for earlier dates.
- [x] Support multiple versions per song and allow attaching each version to one or more releases (single, EP, album) with per-release dates.
- [x] Add a "Create Template Version" action that clones the core version (instruments, metadata) into a new version as a starting point.
- [x] Ensure instruments can be assigned at both the core song level and individual version level.

## Exclusivity Options
- [x] Extend exclusivity fields to cover releases and individual song versions, including platform/website/radio/timed exclusive variants.

## Team Members
- [x] Create Individual and Company team member records and allow linking individuals to companies.
- [x] Add contact fields (name, phone, email, role, notes) and support musician assignments to songs/versions with instrument lists.
- [x] Support assigning team members to tasks with costs, preventing assigned subtotals from exceeding each task’s total cost.

## Financial System
- [x] Track estimated, quoted, and paid costs with precedence rules (Paid > Quoted > Estimated) across tasks and dashboard rollups.
- [x] Build a financial dashboard that shows total paid, estimated remaining, and total estimated with Stage filtering.

## Tasks, Stages, and Checklists
- [x] Allow user-defined stages (e.g., Pre-Production, Production, Post, Release) and stage assignment per task.
- [x] Implement checklist states: complete, paid, complete-but-unpaid, paid-but-incomplete, archived.
- [x] Auto-generate default tasks for each release (artwork, metadata, distribution prep).

## Calendar
- [x] Verify the Previous Month button styling matches the Next Month button and adjust if needed.
- [x] Display release dates, task due dates, and standalone events; support creating standalone calendar events.

## Videos
- [x] Provide a dedicated Videos page per song/version with sub-tasks (scripting, shooting, editing) and required video type checkboxes (lyric, enhanced lyric, music, visualizer, custom).

## UI Updates
- [x] Review and further increase accent color usage where applicable without harming readability.

## Miscellaneous
- [x] Enable the artist (user) to assign themselves to any task, song, version, or role.
- [x] Mark releases that include physical copies and surface that status in release views.
