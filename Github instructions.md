✅ GitHub Copilot Agent — Instruction Block: Unified Item & Page Architecture
Purpose

Ensure the entire app uses a single unified architecture for all Item Pages, Edit/More Info Pages, Task handling, and Page behaviors.
Songs and Releases are the master templates.
Everything else must conform to them.

1. Unified Item Page Requirements

These Item Pages must ALL behave the same way:

Songs

Videos

Releases

Expenses

Global / Standalone Tasks

Events (new page; separate from Calendar)

For ALL Item Pages:

Use the same grid/list template as Songs/Releases.

Items use the same card/row style, same field visibility patterns.

“Add New” must always open the Item’s Edit/More Info Page, not a custom dialog or adder.

No custom layouts, no special-case UI.

2. Unified Item Edit/More Info Page Requirements

Every Item Type MUST use the same Edit/More Info structure, with only field changes.

The Edit/Layout template includes:

Basic Information Module

Display Information Module
(shows linked Item data; read-only here)

Tasks Module

Same UI and behavior for all Items

Auto-generated Tasks + Custom Tasks

Same Task sorting/filtering UI

Notes Module

Item-Specific Modules (Optional)
Examples:

Songs → Versions

Releases → Tracklist

Events → Date/Location

Videos → Platforms/Exclusivity

All Edit Pages must:

Use the same layout hierarchy

Use the same component structure

Use the same Task module instance

Use the same Task edit dialog

NO custom edit dialogs for separate Item types.

3. Unified Task System Requirements
All Tasks must use the single global task system:

No item-specific task implementations

No separate systems for Standalone Tasks or Videos

No custom task dialogs

No custom per-type task logic

Every Item Type must:

Be able to create Tasks

Display Tasks inside its Tasks Module

Support auto-generated + custom Tasks

Use the same Task edit dialog

Use the same cost, team member, and date framework

Regardless of Item:

Songs

Versions

Videos

Releases

Events

Expenses

Standalone Tasks

→ All Tasks go into one universal task pool.

4. Specific Corrections the Agent Must Enforce
The following ARE NOT allowed:

Custom “Add Video” screen

Custom “Add Standalone Task” dialog

Videos without Tasks

Expenses that can’t be edited

Standalone Tasks with special-case add/edit flows

Videos displayed differently from Items

Expense Items not using the common Item layout

One-off UI systems for any Item Type

Instead, enforce the following AT ALL TIMES:

Every Item uses the same Item Page + Edit Page templates

All Tasks use the same Task Module + Edit Dialog

All Items use the same display format for their grid/list views

“Add Item” always opens the Item Edit Page, never a custom form

5. New Item Type: Events

Events must:

Have their own Item Page (same template as Songs/Releases)

Not be bundled into the Calendar view

Use the same Edit/More Info Page template

Use the same Task Module

Use the same Task edit dialog

Support custom Tasks and auto-generated Tasks

6. Model Examples (Use These as the Standard)

Songs and Releases are the canonical, correct implementation.
All other Item types must match their:

Page layout

Edit/More Info structure

Task handling

Navigation behavior

Component architecture

Do NOT invent new patterns.

7. Summary for Enforcement

Copilot must ensure that:

All Item Pages = consistent structure

All Edit Pages = consistent structure

All Tasks = same global system

All Item creation flows = same behavior

Videos, Expenses, Standalone Tasks, and Events use the same architecture

No custom or divergent behaviors are introduced

Songs/Releases serve as the authoritative template

Any deviation from this unified system must be corrected in generated code.