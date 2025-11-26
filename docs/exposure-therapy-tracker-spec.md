# Exposure Therapy Rollout Tracker — Technical Specification
Version: 1.0

This document describes the complete feature set required for the **Exposure Therapy Rollout Tracker** app.

The goal of this app is to track:
- All album/EP releases
- All songs and their deadlines
- Song-specific custom tasks
- Global (campaign-wide) tasks
- Required recordings/versions for each release
- Estimated costs across all of the above

This spec is written to be machine-readable and implementation-friendly for GitHub Copilot and GitHub Agents.

---

## 0. High-Level Overview

The app manages several core concepts:

- Songs and their release dates
- Automatically calculated, but user-editable, deadlines per song
- Custom tasks tied to specific songs
- Global (non-song-specific) rollout tasks
- Releases (Album, EP, Deluxe, Remix EP, etc.)
- Required versions/recordings needed for each release
- A combined timeline merging all of the above
- Estimated costs for budgeting

All data should be persisted (at least in browser storage such as localStorage).

---

## 1. Data Entities

The app must support the following entities:

- Song
- SongDeadline
- SongCustomTask
- GlobalTask
- Release
- ReleaseRecordingRequirement

Each entity is specified below.

### 1.1 Song

Represents a single track in the overall project.

Fields:

- `id`: string (unique identifier)
- `title`: string
- `category`: string enum
  - Allowed values: "Album", "Bonus", "Christmas EP", "EP", "Other"
- `releaseDate`: string in `YYYY-MM-DD` format (editable by the user)
- `isSingle`: boolean
- `videoType`: string enum
  - Allowed values: "None", "Lyric", "Enhanced", "Enhanced + Loop", "Full"
- `stemsNeeded`: boolean
- `estimatedCost`: number (optional; overall cost associated with this song)
- `extraVersionsNeeded`: string (free text; e.g. "radio edit, acoustic, live loop" — used as a catch-all reminder field)
- `deadlines`: array of SongDeadline (see below)
- `customTasks`: array of SongCustomTask (see below)

Notes:
- `releaseDate` is central: it drives automatic generation of some SongDeadline values.
- The user must be able to edit `releaseDate` at any time.
- The user must be able to edit all of the above fields from a Song Detail view.

---

### 1.2 SongDeadline

Represents individual deadlines for a given song (mix, master, artwork, upload, video delivery, release).

Fields:

- `id`: string
- `songId`: string (foreign key to Song)
- `type`: string enum
  - Allowed values: "Mix", "Master", "Artwork", "Upload", "VideoDelivery", "Release"
- `date`: string in `YYYY-MM-DD` format
- `status`: string enum
  - Allowed values: "Not Started", "In Progress", "Done", "Delayed"
- `estimatedCost`: number (optional; cost associated with this specific deadline)
- `notes`: string (optional)

Default auto-calculation rules (based on `Song.releaseDate`):

- Mix deadline: `releaseDate` minus 42 days
- Master deadline: `releaseDate` minus 21 days
- Artwork deadline: `releaseDate` minus 28 days (only if `isSingle` is true)
- Upload deadline (DSP upload): `releaseDate` minus 14 days (only if `isSingle` is true)
- Video delivery deadline:
  - If `videoType` is `"Full"`: `releaseDate` minus 30 days
  - If `videoType` is `"Lyric"`, `"Enhanced"`, or `"Enhanced + Loop"`: `releaseDate` minus 14 days
  - If `videoType` is `"None"`: no video delivery deadline
- Release deadline: exactly `releaseDate` (for use in the combined timeline)

Requirements:
- These deadlines should be initialized automatically using the rules above.
- The user must be able to manually edit any deadline’s `date`.
- There should be a way to recalculate deadlines from the release date (e.g. a button) without forcing the user to lose manual overrides unless they explicitly choose to.

---

### 1.3 SongCustomTask

Represents user-defined tasks tied to a specific song, beyond the standard deadlines.

Fields:

- `id`: string
- `songId`: string (foreign key to Song)
- `title`: string (e.g. "Record acoustic version", "Live rehearsal", "Write string arrangement")
- `description`: string
- `date`: string in `YYYY-MM-DD` format
- `status`: string enum
  - "Not Started", "In Progress", "Done", "Delayed"
- `estimatedCost`: number
- `notes`: string (optional)

Requirements:
- A song can have zero or many SongCustomTask entries.
- Tasks must be editable (title, description, date, status, cost).
- Tasks must appear in the combined timeline.

---

### 1.4 GlobalTask

Represents tasks in the rollout that are not tied to a specific song (e.g. building website phases, NDA, merch, photoshoots, contest setup, EP upload).

Fields:

- `id`: string
- `taskName`: string
- `category`: string
  - Example values: "Branding", "Web", "Legal", "Visuals", "Marketing", "Events", "Audio", "Video", "Merch", etc.
- `date`: string in `YYYY-MM-DD` format
- `description`: string
- `assignedTo`: string (optional)
- `status`: string enum
  - "Not Started", "In Progress", "Done", "Delayed"
- `estimatedCost`: number
- `notes`: string (optional)

Requirements:
- Global tasks must appear in a dedicated Global Tasks view.
- Global tasks must also appear in the combined timeline.

---

### 1.5 Release

Represents a “package” release such as the main album, a Christmas EP, a Remix EP, or a Deluxe edition.

Fields:

- `id`: string
- `name`: string
  - Examples: "Exposure Therapy (Main Album)", "Emo Christmas EP", "Cycle Remix EP", "Exposure Therapy (Deluxe)"
- `type`: string enum
  - Allowed values: "Album", "EP", "Remix EP", "Deluxe", "Other"
- `releaseDate`: string in `YYYY-MM-DD` format
- `estimatedCost`: number
- `notes`: string
- `requiredRecordings`: array of ReleaseRecordingRequirement

Requirements:
- Each Release must be editable (name, type, date, cost, notes).
- Release dates must appear in the combined timeline.

---

### 1.6 ReleaseRecordingRequirement

Represents a specific version/recording that must be completed for a Release.

Fields:

- `id`: string
- `releaseId`: string (foreign key to Release)
- `songId`: string (foreign key to Song)
- `versionType`: string
  - Examples: "Album", "Radio Edit", "Acoustic", "Extended", "Loop Version", "Remix", "Instrumental", "Clean"
- `status`: string enum
  - "Not Started", "In Progress", "Done", "Delayed"
- `notes`: string

Requirements:
- These entries define what recordings are needed for a given Release.
- Examples:
  - For "Cycle Remix EP": multiple `Cycle` remixes as separate requirements.
  - For "Bouquet Remix EP": extended and collab versions as separate requirements.
  - For "Deluxe": tracks like "L.A. Boys", "Honey God Me You", etc.

---

## 2. Views / Screens

The app should expose at least the following main views:

1. Song List
2. Song Detail
3. Global Tasks
4. Releases List
5. Release Detail
6. Combined Timeline

Additional views or dashboards are allowed, but these are required.

---

### 2.1 Song List View

Purpose:
- Overview of all songs and key metadata.

Features:
- Display a table of all Song entries with columns:
  - Title
  - Category
  - Release Date
  - Single? (Yes/No)
  - Video Type
  - Stems? (Yes/No)
  - Estimated Cost
- Allow clicking on a song to open its Song Detail view.
- Sorting:
  - By title, category, release date.
- Filtering:
  - By category (Album, Bonus, Christmas EP, etc.).
  - By singles only (where `isSingle` is true).

---

### 2.2 Song Detail View

Purpose:
- Edit all aspects of a single Song.
- See all deadlines and custom tasks related to that song.
- View per-song cost overview.

#### 2.2.1 Basic Song Information Section

Editable fields:
- Title
- Category
- Release Date
- Single? (boolean)
- Video Type
- Stems Needed (boolean)
- Estimated Cost (song-level)
- Extra Versions Needed (free text field)

Requirements:
- Changes must be persisted.
- Changing releaseDate must affect auto-calculated deadlines where appropriate.

#### 2.2.2 Automatic Deadlines Section

Shows a list of SongDeadline items for that song.

For each deadline:
- Type (Mix, Master, Artwork, Upload, VideoDelivery, Release)
- Date:
  - Initially auto-calculated using rules in section 1.2
  - Must be editable by the user
- Status: dropdown with values:
  - Not Started, In Progress, Done, Delayed
- Estimated Cost: numeric input
- Notes: optional text

Additional behavior:
- Provide a “Recalculate deadlines from release date” control:
  - Reapply default rules to any deadlines that have not been manually overridden.
  - Implementation detail of how to track overrides is up to the dev, but behavior should be predictable and avoid silently overwriting user changes.

#### 2.2.3 Song Custom Tasks Section

Displays SongCustomTask entries for this song.

For each custom task:
- Title
- Date
- Status
- Estimated Cost
- Description
- Notes

Controls:
- “Add Task” form with:
  - Title
  - Date picker
  - Estimated cost
  - Description
  - Status dropdown (default "Not Started")
- Ability to edit and delete existing custom tasks.

#### 2.2.4 Per-Song Cost Summary

Show a total estimated cost for this song, calculated from:

- Song.estimatedCost
- Sum of SongDeadline.estimatedCost
- Sum of SongCustomTask.estimatedCost

---

### 2.3 Global Tasks View

Purpose:
- Manage high-level non-song-specific tasks.

Features:
- Table of all GlobalTask entries with columns:
  - Date
  - Task Name
  - Category
  - Description
  - Assigned To
  - Estimated Cost
  - Status
- Ability to:
  - Add new global tasks.
  - Edit existing tasks (all fields).
  - Delete tasks if needed.
- Sorting:
  - By date.
- Filtering:
  - By category.
  - By status.
- Search:
  - Free-text search across `taskName` and `description`.

---

### 2.4 Releases List View

Purpose:
- Overview of all Releases.

Features:
- Table of Release entries with columns:
  - Name
  - Type
  - Release Date
  - Estimated Cost
- Clicking a row opens Release Detail view.

---

### 2.5 Release Detail View

Purpose:
- Manage the details and requirements for a specific Release.

#### 2.5.1 Basic Release Information

Editable fields:
- Name
- Type
- Release Date
- Estimated Cost
- Notes

#### 2.5.2 Required Recordings Table

Table of ReleaseRecordingRequirement for this Release:

Columns:
- Song (dropdown of existing Song titles)
- Version Type (text or dropdown of suggested types)
- Status (Not Started / In Progress / Done / Delayed)
- Notes

Features:
- Add new ReleaseRecordingRequirement row.
- Edit existing rows.
- Delete rows if needed.

#### 2.5.3 Release Cost Summary

Show a total estimated cost at the release level, at minimum:

- Release.estimatedCost

Optionally also include the implied cost of linked recordings, if that is added later.

---

### 2.6 Combined Timeline View

Purpose:
- A single chronological view of all deadlines, tasks, and releases.

The combined timeline must include:

- SongDeadlines (mix, master, artwork, upload, video, release)
- SongCustomTasks
- GlobalTasks
- Release release dates

Optionally, ReleaseRecordingRequirements may also appear if dates are added later.

Each row should display at least:

- Date
- Source type:
  - "Song Deadline", "Song Custom", "Global", or "Release"
- Label:
  - For SongDeadline: type (Mix, Master, Artwork, etc.)
  - For SongCustomTask: "Custom task"
  - For GlobalTask: "Task"
  - For Release date: "Release"
- Song / Task / Release name
- Category / Type
  - For songs: Song.category
  - For globals: GlobalTask.category
  - For releases: Release.type
- Status (if applicable)
- Estimated Cost (if present)
- Notes/description (short text or truncated view)

Filtering:
- By source type (Song vs Global vs Release).
- By song (dropdown; show only rows connected to that song).
- By status (e.g. show only Not Started / In Progress).
- By date range (e.g. filter for specific month or range).

Sorting:
- Sorted ascending by date by default.

---

## 3. Behavioral Requirements

### 3.1 Auto-Calculation Logic

When a Song’s `releaseDate` is initially set:
- Generate SongDeadline entries with dates as described in section 1.2.

When user changes `releaseDate`:
- Non-overridden deadlines should recalculate to maintain the defined offsets.
- Deadlines that the user has edited manually should not silently change.
- Recommended approach:
  - Track a flag per deadline indicating whether the user has manually overridden the date.
  - Only recompute dates where override flag is false, or when user explicitly clicks a "recalculate all deadlines from release date" action.

### 3.2 Status Enum Consistency

All entities with status must use the same set:
- "Not Started"
- "In Progress"
- "Done"
- "Delayed"

This includes:
- SongDeadline
- SongCustomTask
- GlobalTask
- ReleaseRecordingRequirement (and any others that may use status).

### 3.3 Persistence

All data must persist between sessions:

- Storage can be:
  - localStorage, or
  - IndexedDB, or
  - a backend API (if available)

For the purposes of this spec, client-side persistence (localStorage/IndexedDB) is acceptable.

Requirements:
- Changes to songs, deadlines, tasks, releases, and requirements should be saved automatically or via an explicit save mechanism.
- Data structure should be versionable and extensible for future backend integration.

### 3.4 Sorting and Filtering

All major data tables (Songs, GlobalTasks, Releases, Timeline) must support:

- Sorting by at least one or more key columns (usually date, name).
- Filtering by category and/or status where applicable.
- Searching by text in names and descriptions (where useful).

---

## 4. Cost Tracking

The app must support basic cost tracking and summaries.

At minimum:

- Each of these entities may have an `estimatedCost`:
  - Song
  - SongDeadline
  - SongCustomTask
  - GlobalTask
  - Release
  - (Optionally) ReleaseRecordingRequirement in the future

The app should be able to compute:

- Per-song total estimated cost
- Per-release total estimated cost
- Global total estimated cost across all entities (even if it is just a simple sum that could be displayed in a separate view or summary bar)

Exact UI placement for total cost summaries can be flexible, but the calculations should be possible based on the data model.

---

## 5. Minimum Required Views (Summary)

The app must have at least these views:

1. **Song List View**
2. **Song Detail View**
3. **Global Tasks View**
4. **Releases List View**
5. **Release Detail View**
6. **Combined Timeline View**

Additional UX improvements (dashboards, weekly views, etc.) are optional and may be added later.

---

## 6. GitHub Agent Implementation Requirements

When using a GitHub Agent or similar automation, it should follow these instructions:

1. Read this specification file (for example: `docs/exposure-therapy-tracker-spec.md`).
2. Compare the specification with the existing application code.
3. Implement any features from this spec that are missing, including:
   - Data model fields
   - Editable fields and forms
   - Auto-calculation logic for deadlines
   - All views / screens described
   - Creation and editing of song-specific custom tasks
   - Creation and editing of global tasks
   - Creation and editing of releases and required recordings
   - Cost tracking fields and basic summaries
   - Combined timeline view
   - Status handling and updates
   - Sorting, filtering, and searching
   - Persistent storage of all data

4. Do not remove or break existing functionality.
5. Maintain backward compatibility with any existing stored data where reasonable.
6. After implementation, generate three lists in a Markdown output (e.g. in a comment or PR description):
   - **List A:** Features from this spec that were already present in the current app.
   - **List B:** Features from this spec that were added or modified during this update.
   - **List C:** Features from this spec that could not be implemented, with reasons (technical limitations, scope issues, or conflicts).

7. Commit code with clear messages referencing relevant sections of this spec where applicable.

---

End of specification.
