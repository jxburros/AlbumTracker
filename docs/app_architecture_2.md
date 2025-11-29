# Music Tracker App — Page Architecture & New Specifications

This document contains **all new specifications you provided**, structured clearly and independently from the main architecture document.

---

# 1. Page Types Overview

The app is divided into **six major page categories**, each with consistent patterns and behaviors:

1. **Item Pages**
2. **View Pages**
3. **Item More/Edit Info Pages**
4. **Task More/Edit Info Pages**
5. **Team Member Pages**
6. **Settings Pages**

---

# 2. Item Pages

Item Pages show all Items of one type and allow editing or creation.

## 2.1 Shared Behavior

All Item Pages support:

* A **grid/list view** of Items
* An **Add New Item** button
* Clicking an Item opens its **Edit/More Info Page**
* Clicking Add New opens a **blank Edit/More Info Page**

The layout defaults are consistent but Item types may show additional fields.

## 2.2 Item Types

Item Pages correspond to these Item Types:

* **Songs**

  * More/Edit Info includes **Versions module**
* **Videos**
* **Releases**
* **Expenses** (uses invisible Items to track Expenses as Tasks)
* **Events**
* **Global / Standalone Tasks** (supports Categories; uncategorized Tasks use invisible Category Item)

---

# 3. Item More/Edit Info Pages

Each Item has a dedicated detail/edit screen. This page is **consistent across Item types** with customization.

## 3.1 Universal Modules

Each Edit/More Info Page includes:

### A. **Basic Information Module**

Contains all editable core Item fields.

### B. **Display Information Module**

Shows linked information from other Items that is not editable from this screen.

### C. **Tasks Module**

Displays all Tasks for this Item:

* All auto-generated & custom Tasks
* Sorting/filtering
* Add Custom Task button

### D. **Notes Module**

Freeform notes about the Item.

### E. **Item-Specific Modules**

Examples:

* Songs → Versions Module
* Releases → Tracklist
* Events → Date/Location Module
* Videos → Platform/Exclusivity Module

---

# 4. Task More/Edit Info Pages

Every Task opens into a streamlined editing interface.

A Task Edit Page includes:

* Task Name
* Due Date
* Status
* Assigned Team Members (multiple allowed)
* Cost fields:

  * Estimated Cost
  * Quoted Cost
  * Amount Paid
  * Optional Partial Payment flag
* Cost splitting between Team Members (optional)
* Eras, Stages, Tags
* Notes

Tasks can belong to:

* An Item
* A Version
* Standalone

---

# 5. View Pages

View Pages aggregate data from Items and Tasks.

## 5.1 Dashboard / Home

Displays:

* Tasks that are **in progress** or **due soon**
* Upcoming Events
* Global metrics:

  * Total costs
  * Total paid
  * Total progress
* Optional random Item spotlight (ex: "Progress update: Song X is 63% complete")

## 5.2 Financials View

Allows multiple cost-based filters.
You can view expenses by:

* Stage
* Era
* Release
* Song
* Version
* Item Type
* Paid only
* Quoted only
* Projected only
* Any combination of the above

## 5.3 Tasks View

Displays **all Tasks in the app** with:

* Sorting (due date, cost, status, Item type, etc.)
* Filtering (status, era, stage, tag, team member)
* Summary counts by Task State

## 5.4 Progress View

Shows progress across Items using the 0 / 0.5 / 1 point model.
Supports filtering by:

* Era
* Stage
* Tags
* Item Type
* Release / Song / Version

---

# 6. Team Member Pages

Team Members have their own pages.

A Team Member Page displays:

* Name
* Phone
* Email
* Notes
* Type (Person, Group, Organization)
* Roles / Instruments (Individuals)
* Whether they are a Musician
* All Tasks attached to them
* A button to create a new Standalone Task with the Team Member pre-filled

### 6.1 Team Member Types

#### Individuals:

* Roles
* Work mode (Remote / In-Person / Traveling)
* Musician (yes/no)
* Instruments played

#### Groups:

* Group Type
* Individuals in Group
* Organizations Group belongs to
* Linked Groups

#### Organizations:

* For-Profit / Nonprofit / Other
* Groups and Individuals within Organization

### 6.2 Cost Splitting

Tasks allow:

* Cost splitting across multiple Team Members (optional)
* Or no splitting

Items calculate costs based on Tasks.

---

# 7. Settings Pages

Settings configure global behavior of the app.

Configurable items include:

* Auto-generated Task definitions
* Auto-deadline formulas
* Default Stage / Era for new Items
* Cost calculation rules
* Visibility rules
* Dashboard customization
* Filtering rules

---

# 8. Cost & Calculation System

## 8.1 Cost Hierarchy

Task cost fields follow this order:

1. **Amount Paid**
2. **Quoted Cost**
3. **Estimated Cost**

## 8.2 Partial Payments

Partial payment flag exists, but the app does **not track specific partial amounts**.

## 8.3 Items & Costs

* Item cost = sum of all Task costs inside the Item
* Items may have optional global estimated cost, but it is **not** used in calculations

---

# 9. Summary

This document captures the **entire behavior and structure** of:

* Page navigation
* Item screens
* Task editing
* View pages
* Team Member behavior
* Cost logic
* Settings logic

It functions as a standalone spec for the app’s UI-level architecture.
