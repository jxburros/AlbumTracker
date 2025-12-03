# Project Direction Document
(Formerly "Album Tracker")

A central guiding description of the app's purpose, scope, and current functionality.

---

## 1. Purpose

This app is a project management tool specifically for musicians.
Its role is to provide a centralized place to track:

- Tasks
- Dates
- Budgets
- Songs and versions
- Releases (albums, singles, EPs)
- Videos (song-attached and standalone)
- Collaborators and team members
- Business-related details

The intention is to minimize administrative overhead so artists can focus more on creative work.

---

## 2. Core Concept

The app functions as a combination of:

- Calendar
- Task manager
- Reminder system
- Release planner
- Information repository
- Lightweight CRM for collaborators
- Budget tracker
- Video production tracker
- Photo gallery

It organizes music-related work by connecting:

**Songs → Versions → Releases/Videos → Tasks → Calendar/Timeline**

Everything ties back to the creative and release pipeline.

---

## 3. Major Components

### 3.1. Songs

Songs are a central object. They contain:

- Song information
- A list of versions (core + alternates)
- Linked releases (can belong to multiple releases)
- Video requirements (multiple video types selectable)
- Optional exclusivity period (with start and end dates)
- Three-tier cost tracking (estimated/quoted/paid)
- Instrument tracking
- Musician assignments (team members with instruments)
- Auto-generated tasks based on release dates
- Custom user-created tasks
- Notes

**Auto-generated tasks** for core songs include:
- Recording
- Mixing
- Mastering
- Release preparation

### 3.2. Song Versions

Versions are connected to songs and may include:

- Version name and details
- Release dates (can differ from core song)
- Multi-release linking (can belong to multiple releases)
- Exclusive availability windows
- Their own instrument configuration
- Their own musician assignments
- Video type selections (lyric, enhanced lyric, music video, visualizer, custom)
- Their own tasks (arrangement, instrumentation, mix, master, release)
- Three-tier cost tracking
- Custom tasks
- Notes

**Template Version Generation:** Users can generate new versions that copy instruments, metadata, base tasks, video types, and cost structure from existing versions.

### 3.3. Videos

Videos can be:

- **Song-attached:** Connected to a specific song version
- **Standalone:** Independent video projects

Videos support:

- Multiple video type selections per video:
  - Lyric video
  - Enhanced lyric video
  - Music video
  - Visualizer
  - Custom types
- Exclusive availability windows (start and end dates)
- Three-tier cost tracking (estimated/quoted/paid)
- Auto-generated tasks based on video type:
  - Hire crew
  - Shoot/film
  - Edit
  - Delivery/release
- Custom user-created tasks
- Notes

### 3.4. Releases

Releases represent:

- Singles
- EPs
- Albums
- Remix EPs
- Deluxe editions
- Any defined release group

A song or version may appear on:

- One release
- Multiple releases
- No release (yet)

Releases include:

- Release date (auto-calculated from earliest attached content if not manually set)
- Attached songs, versions, and videos
- Required recordings list
- Physical copies flag
- Exclusive availability windows
- Three-tier cost tracking
- Auto-generated tasks:
  - Album art creation
  - Tracklist selection/approval
  - Reveal/announcement
  - Pre-order setup
  - Metadata submission
  - Release day tasks
  - Physical production (if physical copies enabled)
- Custom user-created tasks
- Notes

Releases help trigger task generation and timeline planning.

### 3.5. Tasks

Tasks can be:

- **Auto-generated** from songs, versions, videos, or releases
- **User-created** custom tasks
- **Global tasks** not tied to specific content
- **Event-type tasks** for calendar events

Tasks have:

- Title and description
- Due date
- Category/type
- Status tracking (Not Started, In Progress, Done, Delayed)
- Three-tier cost tracking (estimated/quoted/paid)
- Team member assignments with cost allocation
- Notes
- Parent associations (song, version, video, release, or global)
- Override capability (auto-generated tasks can be manually edited)
- Archive flag

**Task Recalculation:** When release dates or other key dates change, auto-generated tasks are recalculated automatically unless manually overridden.

Tasks appear across multiple views:
- Song/Version/Video/Release detail pages
- Global Tasks view
- Active Tasks view
- Calendar view
- Timeline view
- Task Dashboard

### 3.6. Calendar and Timeline Views

The system provides multiple visualization options:

**Calendar View:**
- Month/year calendar display
- Clickable entries for:
  - Tasks
  - Events
  - Releases
  - Songs
  - Videos
- Color-coded legend for different item types
- Detail modal for quick viewing and editing
- "Today" navigation button

**Combined Timeline View:**
- Unified Gantt-style timeline showing all:
  - Tasks (all types)
  - Events
  - Releases
  - Videos
  - Songs
- Filtering by:
  - Source type (songs, releases, videos, global, events)
  - Specific song
  - Status
  - Date range
- Exclusivity windows plotted visually
- Clickable entries for quick access

**Task Dashboard:**
- Statistics overview:
  - Total tasks
  - In-progress tasks
  - Due soon tasks
  - Overdue tasks
- Category grouping
- Cost tracking (total, paid, remaining)
- Quick task creation

These views help musicians plan releases and stay on track.

### 3.7. Budget Tracking

The app uses a **three-tier cost system** across all entities:

1. **Estimated cost** - Initial budget projection
2. **Quoted cost** - Actual quotes received
3. **Paid cost** - Money actually spent

**Cost Precedence:** Paid > Quoted > Estimated

The "effective cost" displayed is the highest precedence value available.

Cost tracking includes:

- **Per-task costs** on all tasks
- **Misc expenses** not tied to specific tasks
- **Team member cost allocation** tracking budget per person
- **Grand total rollup** across:
  - All song tasks
  - All version tasks
  - All video tasks
  - All release tasks
  - All global tasks
  - Misc expenses
- **Budget remaining** display per task
- **Cost breakdown** by entity type in sidebar

### 3.8. Team Members & Collaborators

The app maintains a directory of:

**Team Members** (individuals) with:
- Name, phone, email
- Role/title
- Musician flag
- Instrument list (if musician)
- Cost allocation tracking
- Notes

**Companies/Vendors** with:
- Company name
- Contact details
- Associated individuals
- Cost tracking

**Team member capabilities:**
- Assign to tasks with specific cost allocation
- Assign musicians to songs/versions with instrument specification
- Filter views to show musicians only
- Track costs per team member across all assignments

### 3.9. Photo Gallery

The app includes photo management:

- Upload photos (base64 storage)
- View in gallery grid
- Click to enlarge
- Editable title and description
- Download individual photos
- Download all photos (batch)
- Delete photos

### 3.10. Notification System

The app actively monitors and alerts for:

- **Overdue tasks** - Tasks past their due date
- **Tasks due this week** - Upcoming deadlines
- **Upcoming releases** (30-day window) - Release date reminders
- **Upcoming songs** - Song release reminders
- **Budget exceeded** - When costs surpass estimates
- **Delayed tasks** - Tasks marked as delayed status

Notifications appear in:
- Task Dashboard view
- Alert badges throughout the app

### 3.11. Active Tasks View

A focused view highlighting:

- **Overdue tasks** - Past due date
- **Due soon** - Upcoming deadlines
- **In-progress** - Currently being worked on
- **Unpaid** - Tasks with costs not yet paid

This view helps prioritize immediate work.

### 3.12. Archive & Trash

Tasks can be:

- **Archived** - Completed or no longer active but preserved
- Filtered out of active views
- Restored if needed

### 3.13. Settings & Configuration

The app includes configuration for:

**Theme:**
- Dark mode toggle
- Light mode (default)
- Accent color selection:
  - Pink
  - Cyan
  - Lime
  - Violet
- Brutalist/punk design system:
  - Bold 4px borders
  - Hard shadows
  - Uppercase typography
  - Monospace font
  - High contrast

**Cloud Sync:**
- Firebase connection toggle
- Connection status display
- Anonymous authentication
- Real-time sync across devices
- Offline-first architecture (works without internet)
- Local storage fallback

### 3.14. Cloud Storage & Collaboration

The app currently supports:

✅ **Implemented:**
- Firebase Firestore backend
- Anonymous authentication
- Real-time synchronization across devices
- Offline-first functionality (full features without internet)
- Automatic cloud sync when connected
- Local storage fallback

🔄 **Future Enhancements:**
- Multi-user collaboration with permissions
- Shared project workspaces
- User accounts and authentication
- Team-based access control

---

## 4. Guiding Constraints

- The app is free.
- It is made by **JX Holdings, LLC** and **Jeffrey Guntly**.
- Source code will be made available.
- Mods may exist, but:
  - Mods are not officially supported.
  - They cannot be monetized.
  - They cannot imply official affiliation.
- Long-term design choices should keep modding flexibility in mind.

---

## 5. Direction Notes & Priorities

These principles guide future development:

### 5.1. Accuracy Over Assumption

Features should only be included if defined.
No speculative features unless explicitly chosen.

### 5.2. Musician-First Workflow

Everything should map naturally onto the real workflow of:

- Writing songs
- Recording and producing
- Planning releases
- Coordinating videos
- Managing tasks and budgets
- Tracking collaborators

### 5.3. Modest Scope, Expandable Foundation

The app should work fully even if used offline and without collaboration features.
Additional systems can layer on top later.

### 5.4. User Autonomy

Auto-generated tasks should be editable, removable, or ignorable.
The user remains in control.

### 5.5. Clear Data Connections

Internal objects (songs, versions, releases, videos, tasks, collaborators) need predictable relationships.

### 5.6. Offline-First Architecture

The app must function completely without internet connectivity.
Cloud sync is an enhancement, not a requirement.

### 5.7. Cost Transparency

All costs should be trackable at granular levels and roll up clearly to totals.
Users should always know where money is being spent or planned.

---

## 6. What Is Not Defined Yet

These areas are intentionally left open until more clarity is provided:

- ❓ The exact final naming of the app
- ❓ Advanced notification customization
- ❓ Multi-user collaboration model with permissions
- ❓ User accounts and authentication (beyond anonymous)
- ❓ **Exporting and reporting** (PDF/CSV/printable formats) - *in planning*
- ❓ **Activity log/change history** - *in planning*
- ❓ Advanced budgeting features (forecasting, variance analysis)
- ❓ Integration with external services (Spotify, distributor APIs)
- ❓ AI-based features
- ❓ Mobile-specific optimizations
- ❓ Advanced analytics and insights

They may come later, but they are not defined yet.

---

## 7. Technology Stack

**Current Implementation:**

- **Frontend:** React 18 + Vite
- **Styling:** TailwindCSS with custom brutalist theme
- **State Management:** React Context API
- **Backend:** Firebase (Firestore + Anonymous Auth)
- **Icons:** Lucide React
- **Storage:**
  - LocalStorage (offline)
  - Firebase Firestore (cloud sync)
- **Build Tool:** Vite

---

## 8. Key Architectural Patterns

1. **Cost Precedence System:** Paid > Quoted > Estimated (via `getEffectiveCost`)
2. **Unified Task Schema:** All tasks share common structure regardless of parent type
3. **Auto-Generation with Override:** Tasks automatically created but user-editable
4. **Multi-Linking:** Songs/versions can belong to multiple releases
5. **Availability Windows:** Exclusivity tracking across all content types
6. **Offline-First:** Works without internet, syncs when available
7. **Three-Tier Costs:** Estimated/Quoted/Paid on all entities
8. **Real-Time Sync:** Firebase real-time updates when connected

---

## 9. Summary

This app is a **musician-focused organizational tool** built around:

- **Songs** with multiple versions
- **Videos** (song-attached and standalone)
- **Releases** with multi-content attachment
- **Tasks** with auto-generation and manual control
- **Calendar/Timeline** views with filtering
- **Budgets** with three-tier cost tracking
- **Team Members** with role and instrument management
- **Photo Gallery** for visual assets
- **Notifications** for deadline and budget awareness
- **Dark Mode** for comfortable viewing
- **Cloud Sync** with offline capability

Its purpose is to **reduce administrative stress**, **centralize information**, and **support the full music-creation and release cycle** without overcomplicating workflows.

The app is production-ready with core features implemented and additional enhancements planned based on user feedback.

---

## 10. Implementation Status

### ✅ Fully Implemented

- Songs and versions with multi-release linking
- Videos (song-attached and standalone)
- Releases with auto-task generation
- Three-tier cost tracking system
- Team members with musician flags
- Calendar with clickable entries
- Combined timeline with filtering
- Photo gallery with upload/download
- Notification system
- Task dashboard with statistics
- Dark mode with accent colors
- Firebase cloud sync
- Offline-first architecture
- Active tasks view
- Task archiving
- Exclusivity windows
- Instrument tracking
- Auto-task generation and recalculation
- Manual task override capability

### 🔄 Planned Features

- **Unified task editor component** (currently uses separate forms)
- **PDF/CSV/printable exporting** for:
  - Releases summary
  - Budget summary
  - Task list
  - Song version comparison
  - Album rollout timeline
- **Activity log/change history** tracking:
  - Task changes
  - Cost changes
  - Release date changes
  - Song version modifications
  - Team member updates
  - Completion/archival actions
- **Advanced reporting and analytics**
- **Multi-user collaboration with permissions**
- **User authentication** (beyond anonymous)

---

*Last updated: 2025-11-28*
