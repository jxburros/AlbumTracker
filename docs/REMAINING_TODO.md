# Album Tracker - Remaining Implementation Items

This document lists the remaining features from `music-tracker-implementation-plan.md` that have not yet been implemented, organized by complexity tier.

---

## Detailed Section Analysis

### Section 1: Cross-cutting Foundations ✅ MOSTLY COMPLETE
| Feature | Status | Notes |
|---------|--------|-------|
| Routes for Item pages (Songs, Videos, Releases, Events, Expenses, Global Tasks) | ✅ Done | App.jsx has routes |
| Routes for View pages (Dashboard, Financials, Tasks, Progress) | ✅ Done | All views accessible |
| Team Members and Settings pages | ✅ Done | TeamView, SettingsView exist |
| Deep links for Item More/Edit dialogs | ✅ Done | Detail views exist |
| Data model alignment (Items, Tasks, Versions, Stages, Eras, Tags) | ✅ Done | Store.jsx has schemas |
| Cost fields (Estimated/Quoted/Amount Paid + Partial flag) | ✅ Done | Full implementation |
| UI shared layout components (grid/list toggles, filters, sortable tables) | ✅ Done | Grid/list toggle implemented for SongListView, ReleasesListView |
| Settings-driven visibility toggles | ⚠️ Partial | Some toggles exist, not comprehensive |

### Section 2: Item Pages ✅ MOSTLY COMPLETE
| Feature | Status | Notes |
|---------|--------|-------|
| Shared ItemList template with grid/list switch | ✅ Done | Implemented in SongListView and ReleasesListView |
| Add New and row click behavior | ✅ Done | Works for all item types |
| Songs: Versions count and quick link | ✅ Done | SongDetailView shows versions |
| Releases: Stage/Era and Tracklist progress summary | ✅ Done | Has tracklist, progress summary in grid view |
| Events: date/location chips and status | ⚠️ Partial | CalendarView shows events, no dedicated list |
| Global Tasks: Category badge | ✅ Done | GlobalTasksView has categories |
| Expenses: Task-based expense flow | ✅ Done | MiscView handles expenses |

### Section 3: Item More/Edit Info Pages ✅ MOSTLY COMPLETE
| Feature | Status | Notes |
|---------|--------|-------|
| Basic Information module (editable fields) | ✅ Done | All detail views have this |
| Display Information module (read-only linked data) | ✅ Done | SongDetailView and ReleaseDetailView have this |
| Tasks module with sorting/filtering | ✅ Done | SongDetailView and ReleaseDetailView have sorting/filtering |
| Notes module | ✅ Done | All detail views have notes |
| Song Versions module | ✅ Done | Full implementation |
| Release Tracklist module | ✅ Done | Required recordings section |
| Event Date/Location module | ⚠️ Partial | Basic fields, no dedicated module |
| Video Platform/Exclusivity module | ✅ Done | Fields exist in video views |
| Task linking when opened from Item | ✅ Done | Tasks filtered by parent |

### Section 4: Task More/Edit Info Pages ✅ MOSTLY COMPLETE
| Feature | Status | Notes |
|---------|--------|-------|
| Task Name, Due Date, Status | ✅ Done | UnifiedTaskEditor has all fields |
| Assigned Team Members (multi-select) | ✅ Done | Works with cost allocation |
| Cost trio (Estimated, Quoted, Amount Paid) | ✅ Done | Full implementation |
| Partial Payment flag | ✅ Done | Field exists |
| Cost splitting | ✅ Done | Member assignments with costs |
| Eras/Stages/Tags | ⚠️ Partial | Tags work, Era/Stage partial |
| Parent context (Item/Version/Standalone) | ✅ Done | Breadcrumb navigation exists |
| Cost precedence (Paid > Quoted > Estimated) | ✅ Done | getEffectiveCost function |

### Section 5: View Pages ✅ COMPLETE
| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard: in-progress/due-soon Tasks | ✅ Done | TaskDashboardView |
| Dashboard: upcoming Events | ✅ Done | Notifications section |
| Dashboard: global cost metrics | ✅ Done | Totals displayed |
| Dashboard: random Item spotlight | ✅ Done | Implemented in TaskDashboardView |
| Financials: filter panel | ✅ Done | Full implementation |
| Financials: tables based on cost precedence | ✅ Done | Summary and detail tables |
| Financials: charts | ❌ Missing | No visualizations (requires chart library) |
| Tasks: Global Task table with sorting/filtering | ✅ Done | GlobalTasksView |
| Progress: 0/0.5/1 model with filters | ✅ Done | ProgressView |

### Section 6: Team Member Pages ✅ MOSTLY COMPLETE
| Feature | Status | Notes |
|---------|--------|-------|
| Profile layout (name, phone, email, notes, type) | ✅ Done | TeamView has all fields |
| Musician flag and instruments | ✅ Done | Phase 8 implementation |
| Tasks attached to member | ✅ Done | memberTaskLookup in TeamView |
| New Standalone Task with member prefilled | ✅ Done | Quick-add button with createTaskForTeamMember action |
| Cost splitting display | ⚠️ Partial | Shows in tasks, not in member summary |
| Group/Organization membership lists | ⚠️ Partial | Links exist but limited display |

### Section 7: Settings Pages ⚠️ PARTIALLY COMPLETE
| Feature | Status | Notes |
|---------|--------|-------|
| Auto-generated task definitions | ⚠️ Partial | Toggle exists, no granular control |
| Auto-deadline formulas | ⚠️ Partial | Hardcoded offsets in Store.jsx |
| Default Stage/Era | ⚠️ Partial | defaultEraId exists |
| Cost calculation rules | ❌ Missing | Precedence is hardcoded |
| Visibility rules | ⚠️ Partial | Some toggles exist |
| Dashboard customization | ❌ Missing | No widget show/hide toggles |
| Filtering rules/presets | ❌ Missing | No saved filter presets |

### Section 8: Cost & Calculation System ✅ COMPLETE
| Feature | Status | Notes |
|---------|--------|-------|
| Item cost = sum of Task costs | ✅ Done | Aggregation helpers exist |
| Cost precedence (Paid > Quoted > Estimated) | ✅ Done | resolveCostPrecedence function |
| Partial Payment flag (informational) | ✅ Done | Field exists, not summed |
| Financials/dashboard use same helpers | ✅ Done | getEffectiveCost used consistently |

---

## Implementation Status Summary

### ✅ Fully Implemented
- Section 5: View Pages (except charts)
- Section 8: Cost & Calculation System

### ✅ Mostly Complete
- Section 1: Cross-cutting Foundations
- Section 2: Item Pages
- Section 3: Item More/Edit Info Pages
- Section 4: Task More/Edit Info Pages
- Section 6: Team Member Pages

### ⚠️ Partially Complete
- Section 7: Settings Pages (missing customization options)

### ✅ Recently Implemented (This PR)
- **Tier 1.1 - Grid/List Toggle** for SongListView and ReleasesListView
- **Tier 1.2 - Display Information module** for ReleaseDetailView (linked songs, team members, summary stats)
- **Tier 1.3 - Task Sorting/Filtering** for ReleaseDetailView
- **Tier 1.4 - Random Item Spotlight** on TaskDashboardView
- **Tier 2.1 - New Standalone Task from Team Member** (already implemented - createTaskForTeamMember action)

---

## Tier 1: Low Complexity (1-2 hours each)

### 1.1 Section 2: Grid/List Toggle for Item Pages ✅ COMPLETED
**Status:** ✅ Completed  
**Location:** `src/SpecViews.jsx` (SongListView, ReleasesListView)  
**Description:** Added toggle to switch between list and grid/card view
- Grid view shows cards with key info (title, date, progress, cost)
- Badges for singles, exclusivity, physical copies
- Works on both Songs and Releases list views

### 1.2 Section 3: Display Information for ReleaseDetailView ✅ COMPLETED
**Status:** ✅ Completed  
**Location:** `src/SpecViews.jsx` (ReleaseDetailView)  
**Description:** Added Display Information module showing:
- Linked songs (from attachedSongIds and requiredRecordings)
- Assigned team members (from task assignments)
- Summary stats (songs count, recordings count, tasks count, progress percentage)

### 1.3 Section 3: Task Sorting/Filtering for ReleaseDetailView ✅ COMPLETED
**Status:** ✅ Completed  
**Location:** `src/SpecViews.jsx` (ReleaseDetailView)  
**Description:** Added sort/filter controls to Release Tasks section
- Filter by status, category
- Sort by date, type, status, cost (ascending/descending)
- Clickable table headers for quick sorting

### 1.4 Section 5: Random Item Spotlight on Dashboard ✅ COMPLETED
**Status:** ✅ Completed  
**Location:** `src/SpecViews.jsx` (TaskDashboardView)  
**Description:** Added random song/release spotlight card
- Random selection that changes daily (deterministic based on date)
- Shows item type, name, category, date, and progress
- Styled with gradient background

### 1.5 UI Consistency Polish
**Effort:** 1-2 hours  
**Location:** Various view files  
**Description:** Standardize styling across all views

---

## Tier 2: Medium Complexity (3-6 hours each)

### 2.1 Section 6: New Standalone Task from Team Member ✅ COMPLETED
**Status:** ✅ Completed (Previously implemented)  
**Location:** `src/Views.jsx` (TeamView) + `src/Store.jsx`  
**Description:** "+" button on team member card creates task with member prefilled
- Uses createTaskForTeamMember action
- Creates Global Task with member auto-assigned
- Shows confirmation alert

### 2.2 Section 7: Dashboard Customization Toggles
**Effort:** 3-4 hours  
**Location:** `src/Views.jsx` (SettingsView) + TaskDashboardView  
**Description:** Add settings to show/hide dashboard sections
- Toggle notifications, upcoming tasks, progress bars
- Save preferences

### 2.3 Section 7: Auto-Deadline Formula Configuration
**Effort:** 4-5 hours  
**Location:** `src/Views.jsx` (SettingsView) + Store.jsx  
**Description:** UI to customize task deadline offsets
- Days before release for each task type
- Save per-entity-type configuration

### 2.4 CSV Export for Cost/Budget Summary
**Effort:** 3-4 hours  
**Location:** New export utility + FinancialsView  
**Description:** Export financial data to CSV

### 2.5 CSV Export for Task List
**Effort:** 3-4 hours  
**Location:** New export utility + multiple views  
**Description:** Export tasks from Timeline, Global Tasks, or Dashboard

---

## Tier 3: High Complexity (1-2 days each)

### 3.1 Section 5: Financials Charts
**Effort:** 1-2 days  
**Location:** FinancialsView enhancement  
**Dependencies:** Chart library (Chart.js, Recharts)  
**Description:** Visual cost breakdowns
- Pie chart by source type
- Bar chart estimated vs quoted vs paid

### 3.2 Section 7: Filtering Rules/Presets
**Effort:** 1-2 days  
**Location:** SettingsView + multiple views  
**Description:** Save and restore filter configurations
- Save named presets
- Quick-apply saved filters

### 3.3 Activity Log / Change History
**Effort:** 1-2 days  
**Location:** New ActivityLogView + Store.jsx  
**Description:** Track changes to tasks, costs, dates, team members

### 3.4 PDF Export for Release Summary
**Effort:** 1-2 days  
**Dependencies:** PDF library (jsPDF, html2pdf)  
**Description:** Generate PDF reports

### 3.5 Song Version Comparison View
**Effort:** 1-2 days  
**Description:** Side-by-side version comparison

---

## Tier 4: Very High Complexity (3+ days each)

### 4.1 Full Reporting Module
**Effort:** 3-5 days  
**Description:** Comprehensive reporting with multiple report types

### 4.2 Section 2: Dedicated Events List View
**Effort:** 3-5 days  
**Description:** Full events page (currently only in calendar)
- Events list/grid view
- Event detail page
- date/location chips

---

## Implementation Priority Recommendations

### ✅ Completed (This Sprint)
1. **Tier 1.1** - Grid/List Toggle for Item Pages ✅
2. **Tier 1.2** - Display Information for ReleaseDetailView ✅
3. **Tier 1.3** - Task Sorting/Filtering for ReleaseDetailView ✅
4. **Tier 1.4** - Random Item Spotlight on Dashboard ✅
5. **Tier 2.1** - New Standalone Task from Team Member ✅

### Medium Priority (Following Sprint)
1. **Tier 2.4** - CSV Export for Financials
2. **Tier 2.2** - Dashboard Customization
3. **Tier 1.5** - UI Consistency Polish

### Lower Priority (Future Sprints)
1. **Tier 3.1** - Financials Charts
2. **Tier 3.3** - Activity Log
3. **Tier 4.x** - Full Reporting & Events

---

## Notes

- Section 8 (Cost & Calculation) is fully complete
- Section 5 (View Pages) is now complete except for Financials Charts
- Section 3 improvements (Display Information, Task sorting) now applied to both SongDetailView and ReleaseDetailView
- Grid/List toggle implemented for Songs and Releases lists
- New Standalone Task from Team Member was already implemented
- Charts require adding a new npm dependency (Chart.js or Recharts)
- Consider implementing CSV exports before PDF exports (simpler)
