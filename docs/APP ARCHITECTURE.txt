Music Tracker App Architecture

1. Core Concepts

1.1 Items

The app is built around a shared Item concept. All domain entities are Items and share a unified set of behaviors and UI layouts.

Item Types:

Song

Version

Video

Release

Event

Standalone Task Category (Global Categories)

Global Task Item (Standalone Tasks)

All Items:

Can have Tasks (auto-generated or custom).

Can be edited, archived, or deleted.

Can have a primary date (release date, event date, etc.).

Are shown in consistent list, grid, and timeline views.

Can be tagged with Eras, Stages, and Tags.

1.2 Categories for Standalone Tasks

Standalone Tasks are grouped using Category Items.

Users may create Tasks with or without Categories.

Tasks without a Category use an invisible Undefined Category Item for internal consistency.

1.3 New: Team Members

Team Members are not Items but are attachable to Items and Tasks.

Types of Team Members:

Individual

Group

Organization

Relationships:

Individuals can belong to Groups.

Groups can belong to Organizations.

Individuals, Groups, and Organizations can cross-link.

Properties:

Name

Phone Number

Email

Notes

Whether they are Person, Group, or Organization

All Tasks they are linked to (display only)

Additional Rules:

Individuals may be marked as Musicians.

Musicians track the Instruments they play.

Musicians can be assigned to Songs/Versions.

Tasks and Items can each have multiple Team Members attached.

Tasks for individual instrument recordings can be auto-generated.

1.4 New: Eras

Eras are optional labels applied to any Item or Task.

Changing an Era on a parent Item offers to override all child Tasks and linked Items.

Eras can be used to filter views, but filtering happens at the Settings level.

Users may set a default Era for all newly created Items/Tasks until disabled.

1.5 New: Stages

Stages group Tasks according to general workflow categories (e.g., Recording Stage, Production Stage).

Any Task can have 0 or more Stages.

1.6 New: Tags

Tags help sort Items by loose categories like “Marketing”, “Legal”, “Creative”, etc.

Tags can be assigned to Items and Tasks.

1.7 Progress System

Task statuses are now:

Not Started

In-Progress

Waiting on Someone Else

Paid But Not Complete

Complete But Not Paid

Complete

Other

Progress Calculation:

Complete = 1 point

In-Progress, Waiting on Someone Else, Paid But Not Complete, Complete but Not Paid = 0.5 points

All others = 0

Item progress = sum(task points) / total tasks

2. Tasks

2.1 Auto-generated Tasks

Auto tasks are generated for Songs, Versions, Videos, Releases, Instrument recording, and Events.

Users may:

Edit titles, descriptions, Team Members, cost fields, dates.

Adjust auto-generated templates globally.

Turn individual auto tasks on/off.

Modify due date formulas.

2.2 Cost Tracking (All Tasks)

Each Task can track three values:

Estimated Cost

Quoted Cost

Amount Paid

Rules:

Total calculations always prefer: Amount Paid → Quoted → Estimated.

A toggle allows marking something “Partially Paid” without tracking specific amounts.

Team Members may optionally have cost allocation.

2.3 Instrument Recording Tasks

If a Version lists instruments, auto-generate:

“Record (Instrument)” for each listed Instrument.

2.4 Standalone Custom Tasks

Standalone Tasks carry:

Name

Notes

Due Date

Team Members involved

Cost fields

Eras / Stages / Tags

Optional Category

3. Auto-Generation Rules

3.1 When a Song is created

Create Core Version.

Create Core Version tasks:

Demo

Record

Mix

Master

Release

3.2 When a Version is created

Create Version tasks:

Record

Mix

Master

Release

If instruments exist for that Version, generate: Record (Instrument)

If Stems are needed for this Version or its parent Song, also generate:

Receive Stems

Release Stems

3.3 Video Generation

When a video type is selected on a Song/Version, create a connected Video Item.

Users may create Videos unattached to Songs.

Videos may attach to any Item or nothing.

Generate Video tasks:

Plan

Hire Crew

Film

Edit

Submit

Release

3.4 When a Release is created

Record/Mix/Master all songs (as meta-progress tasks)

Submit album

Create album art

Release album

Physical production tasks (optional)

3.5 When an Event is created

Attend Event

Optional preparation tasks

4. Dates & Scheduling

4.1 Release Date Propagation

Songs and Versions take earliest release date from attached Releases.

User may override.

4.2 Singles

Songs may be Singles even without a Single-type Release.

Single Date auto-fills from Releases but user may override.

4.3 Auto Deadline Calculations

Users can fully modify auto-deadline generation.

Deadlines use conservative presets.

Recalculation available per Task or per Item.

Completed Tasks are never recalculated.

5. Item Details

5.1 Songs

Song List/Grid displays:

Name

Releases attached

Number of Versions

Upcoming task indicator

Core progress + total Version progress

Song Edit Screen

Basic Information:

Name

Writers

Composers

Core Release Date (calc or overridden)

Is Single?

Timed exclusivity (platform + date range)

Stems needed? (yes/no)

If yes, auto-generate Tasks: Receive Stems, Release Stems for the Core Version

Releases containing Core Version

Instruments & Musicians

Notes

Eras / Stages / Tags

Team Members involved

Estimated total cost

Amount Paid

Core Song Progress

Versions Module

The Versions section shows a list/grid of Versions for this Song.

The list/grid displays Version Name and Release Date for each Version.

Clicking a Version opens its detailed view/edit panel.

Detailed Version entry displays:

Version Name

Releases containing this Version

Release Date (calc or overridden)

Single? Exclusivity?

Instruments & Musicians

Notes

Tags/Eras/Stages

Team Members involved

Option to view Version-specific Tasks

Custom Tasks (Song screen)

Name

Due Date

Notes

Team Members

Version (optional)

All Tasks (Song screen)

For each Task:

Name

Status

Due Date

Version reference

5.2 Videos

Video List/Grid shows:

Name

Release Date

Linked Item (if any)

Upcoming task indicator

Video Type (if derived from Song)

Progress

Video Edit Screen

Name

Release Date

Linked Item (+ ability to change)

Eras / Stages

Team Members

Tasks

Platforms available

Timed exclusivity details

Total estimated cost & paid

Progress

5.3 Standalone Tasks

List/Grid displays:

Name

Due Date

Progress

Due soon indicator

Standalone Task properties:

Name

Notes

Due Date

Team Members

Cost fields

Eras / Stages

Progress

Optional Category

Users may create Custom Tasks for any Item from the Standalone screen.

5.4 Events

Events appear on Calendar.

Event properties:

Name

Era / Stage

Team Members

Tasks

Notes

Location

Time/Date

Entry Cost (counts as a hidden Completed Paid Task)

Estimated cost & amount paid

Progress

Custom Tasks for Events match same schema as above.

5.5 Team Members

All Team Members:

Name

Phone

Email

Type (Person, Group, Org)

Linked Tasks

Notes

Shortcut to create Standalone Task with this Team Member pre-filled

Organizations

For-Profit / Nonprofit / Other

Groups & Individuals in Org

Groups

Group Type

Individuals in Group / Orgs containing Group

Linked Groups

Individuals

Roles

Work Mode: Remote / In-Person / Traveling

Musician toggle

Musicians

Instruments they play

Songs/Versions they are linked to

5.6 Expenses

Expenses show all Tasks with cost values.

Users may add Extra Expenses, collected as invisible "Paid & Completed" Tasks.

Extra Expense fields:

Name

Team Members paying or receiving

Payee (Team Member or free text)

Amount Paid / Estimated / Quoted

Notes

6. Schema Sketch

Item (base)

id

type

name/title

description

primary_date

era_ids

tag_ids

stage_ids

team_member_ids

cost_summary (computed)

progress (computed)

Task

id

parent_item_id

name

status

due_date

team_member_ids

estimated_cost

quoted_cost

amount_paid

partially_paid (bool)

era_ids

tag_ids

stage_ids

notes

Song extends Item

writers

composers

core_version_id

version_ids

release_ids

exclusivity data

instrument_ids

Version extends Item

parent_song_id

release_ids

instrument_ids

Video extends Item

linked_item_id (optional)

video_type

platforms

exclusivity

Release extends Item

release_date

release_type

tracklist (song/version ids)

Event extends Item

location

datetime

entry_cost

Standalone Task Category

id

name

color/icon

TeamMember

id

type

name

contact info

notes

roles / instruments

linked relationships

Mod System
