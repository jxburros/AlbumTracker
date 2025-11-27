# Album Tracker – Follow-up TODOs

This list captures the remaining work from the specification that is not yet implemented or needs validation after the last iteration. Use it to plan subsequent development passes.

## Song + Release System
- [ ] Enforce a core release association for every song and propagate release dates across attached versions, with overrides for earlier dates.
- [ ] Support multiple versions per song and allow attaching each version to one or more releases (single, EP, album) with per-release dates.
- [ ] Add a "Create Template Version" action that clones the core version (instruments, metadata) into a new version as a starting point.
- [ ] Ensure instruments can be assigned at both the core song level and individual version level.

## Exclusivity Options
- [ ] Extend exclusivity fields to cover releases and individual song versions, including platform/website/radio/timed exclusive variants.

## Team Members
- [ ] Create Individual and Company team member records and allow linking individuals to companies.
- [ ] Add contact fields (name, phone, email, role, notes) and support musician assignments to songs/versions with instrument lists.
- [ ] Support assigning team members to tasks with costs, preventing assigned subtotals from exceeding each task’s total cost.

## Financial System
- [ ] Track estimated, quoted, and paid costs with precedence rules (Paid > Quoted > Estimated) across tasks and dashboard rollups.
- [ ] Build a financial dashboard that shows total paid, estimated remaining, and total estimated with Stage filtering.

## Tasks, Stages, and Checklists
- [ ] Allow user-defined stages (e.g., Pre-Production, Production, Post, Release) and stage assignment per task.
- [ ] Implement checklist states: complete, paid, complete-but-unpaid, paid-but-incomplete, archived.
- [ ] Auto-generate default tasks for each release (artwork, metadata, distribution prep).

## Calendar
- [ ] Verify the Previous Month button styling matches the Next Month button and adjust if needed.
- [ ] Display release dates, task due dates, and standalone events; support creating standalone calendar events.

## Videos
- [ ] Provide a dedicated Videos page per song/version with sub-tasks (scripting, shooting, editing) and required video type checkboxes (lyric, enhanced lyric, music, visualizer, custom).

## UI Updates
- [ ] Review and further increase accent color usage where applicable without harming readability.

## Miscellaneous
- [ ] Enable the artist (user) to assign themselves to any task, song, version, or role.
- [ ] Mark releases that include physical copies and surface that status in release views.
