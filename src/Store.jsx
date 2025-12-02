import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc } from 'firebase/firestore';

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

// Export format version and app version for data portability
export const EXPORT_VERSION = '1.0.0';
export const APP_VERSION = '2.0.0';

// Status enum for consistency across all entities - per APP ARCHITECTURE.txt Section 1.7
export const STATUS_OPTIONS = [
  'Not Started',
  'In-Progress',
  'Waiting on Someone Else',
  'Paid But Not Complete',
  'Complete But Not Paid',
  'Complete',
  'Other'
];

// Progress Calculation per APP ARCHITECTURE.txt Section 1.7:
// Complete = 1 point
// In-Progress, Waiting on Someone Else, Paid But Not Complete, Complete But Not Paid = 0.5 points
// All others = 0
export const STATUS_POINTS = {
  'Complete': 1,
  'Done': 1, // Legacy alias for backwards compatibility
  'In-Progress': 0.5,
  'In Progress': 0.5, // Legacy alias
  'Waiting on Someone Else': 0.5,
  'Paid But Not Complete': 0.5,
  'Complete But Not Paid': 0.5,
  'Not Started': 0,
  'Other': 0,
  'Delayed': 0, // Legacy status
  default: 0
};

export const getStatusPoints = (status) => {
  if (!status) return 0;
  return STATUS_POINTS[status] ?? STATUS_POINTS.default;
};

export const calculateTaskProgress = (tasks = []) => {
  if (!tasks.length) return { pointsEarned: 0, totalTasks: 0, progress: 0 };

  const pointsEarned = tasks.reduce((sum, task) => sum + getStatusPoints(task.status), 0);
  const progress = Math.round((pointsEarned / tasks.length) * 100);

  return { pointsEarned, totalTasks: tasks.length, progress };
};

// Song categories - DEPRECATED: Phase 0 removes category-based filtering
// Keeping for backwards compatibility but not used in new features
export const SONG_CATEGORIES = ['Album', 'Bonus', 'Christmas EP', 'EP', 'Other'];

// Video types - DEPRECATED: Use video type checkboxes on video entities instead
export const VIDEO_TYPES = ['None', 'Lyric', 'Enhanced', 'Enhanced + Loop', 'Full'];

// Unified Item schema - per APP ARCHITECTURE.txt Section 6
// All Items (Song, Version, Video, Release, Event, Standalone Task Category, Global Task Item) share this base
// Unified Item schema - per APP ARCHITECTURE.txt Section 6
// All Items (Song, Version, Video, Release, Event, Standalone Task Category, Global Task Item) share this base
// Legacy aliases are maintained for backward compatibility with existing UI code
export const createUnifiedItem = (overrides = {}) => ({
  // Core properties per Section 6: Item (base)
  id: overrides.id || crypto.randomUUID(),
  type: overrides.type || 'generic', // 'song', 'version', 'video', 'release', 'event', 'category', 'globalTask'
  name: overrides.name || overrides.title || '', // name/title
  description: overrides.description || overrides.notes || '',
  // Primary date - unified field name, with legacy alias fallbacks for input
  primary_date: overrides.primary_date || overrides.primaryDate || overrides.releaseDate || overrides.date || '',
  // Metadata arrays per Section 6 - underscore_case as primary
  era_ids: overrides.era_ids || overrides.eraIds || [],
  tag_ids: overrides.tag_ids || overrides.tagIds || [],
  stage_ids: overrides.stage_ids || overrides.stageIds || [],
  team_member_ids: overrides.team_member_ids || overrides.teamMemberIds || [],
  // Cost fields - using underscore_case as primary per unified schema
  estimated_cost: overrides.estimated_cost ?? overrides.estimatedCost ?? 0,
  quoted_cost: overrides.quoted_cost ?? overrides.quotedCost ?? 0,
  amount_paid: overrides.amount_paid ?? overrides.paidCost ?? overrides.amountPaid ?? 0,
  // Legacy camelCase aliases - required for backward compatibility with existing UI components
  // (Views.jsx, SpecViews.jsx, ItemComponents.jsx all use camelCase field names)
  primaryDate: overrides.primaryDate || overrides.primary_date || overrides.releaseDate || overrides.date || '',
  eraIds: overrides.eraIds || overrides.era_ids || [],
  tagIds: overrides.tagIds || overrides.tag_ids || [],
  stageIds: overrides.stageIds || overrides.stage_ids || [],
  teamMemberIds: overrides.teamMemberIds || overrides.team_member_ids || [],
  estimatedCost: overrides.estimatedCost ?? overrides.estimated_cost ?? 0,
  quotedCost: overrides.quotedCost ?? overrides.quoted_cost ?? 0,
  paidCost: overrides.paidCost ?? overrides.amount_paid ?? overrides.amountPaid ?? 0,
  // Extended metadata
  metadata: overrides.metadata || {},
  ...overrides
});

// Normalize any existing Item to the unified format for consistent UI display
// This allows existing data to be displayed using unified components
export const normalizeToUnifiedItem = (item = {}, itemType = 'generic') => {
  // Preserve original ID or generate new one
  const id = item.id || crypto.randomUUID();
  
  // Handle assignedMembers which could be an array of objects or IDs
  const extractMemberIds = (members) => {
    if (!members || !Array.isArray(members)) return [];
    return members.map(m => typeof m === 'object' ? (m.memberId || m.id) : m).filter(Boolean);
  };
  
  return {
    ...createUnifiedItem({ type: itemType }),
    id,
    type: itemType,
    name: item.name || item.title || item.taskName || '',
    description: item.description || item.notes || '',
    primary_date: item.primary_date || item.primaryDate || item.releaseDate || item.date || '',
    era_ids: item.era_ids || item.eraIds || [],
    tag_ids: item.tag_ids || item.tagIds || [],
    stage_ids: item.stage_ids || item.stageIds || [],
    team_member_ids: item.team_member_ids || item.teamMemberIds || extractMemberIds(item.assignedMembers),
    estimatedCost: item.estimatedCost || item.estimated_cost || 0,
    quotedCost: item.quotedCost || item.quoted_cost || 0,
    paidCost: item.paidCost || item.amount_paid || item.amountPaid || 0,
    // Legacy aliases
    primaryDate: item.primaryDate || item.primary_date || item.releaseDate || item.date || '',
    eraIds: item.eraIds || item.era_ids || [],
    tagIds: item.tagIds || item.tag_ids || [],
    stageIds: item.stageIds || item.stage_ids || [],
    teamMemberIds: item.teamMemberIds || item.team_member_ids || extractMemberIds(item.assignedMembers),
    // Preserve original item data
    _original: item
  };
};

// Normalize any existing Task to the unified format for consistent UI display
export const normalizeToUnifiedTask = (task = {}, parentType = null) => {
  // Preserve original ID or generate new one
  const id = task.id || crypto.randomUUID();
  
  // Handle assignedMembers which could be an array of objects or IDs
  const extractMemberIds = (members) => {
    if (!members || !Array.isArray(members)) return [];
    return members.map(m => typeof m === 'object' ? (m.memberId || m.id) : m).filter(Boolean);
  };
  
  // Preserve assignedMembers in original format for UI components
  const assignedMembers = task.assignedMembers || [];
  
  return {
    ...createUnifiedTask({ parentType }),
    id,
    parent_item_id: task.parent_item_id || task.parentItemId || task.parentId || null,
    name: task.name || task.title || task.type || task.taskName || '',
    status: task.status || 'Not Started',
    due_date: task.due_date || task.dueDate || task.date || '',
    team_member_ids: task.team_member_ids || task.teamMemberIds || extractMemberIds(assignedMembers),
    estimated_cost: task.estimated_cost ?? task.estimatedCost ?? 0,
    quoted_cost: task.quoted_cost ?? task.quotedCost ?? 0,
    amount_paid: task.amount_paid ?? task.paidCost ?? task.amountPaid ?? 0,
    partially_paid: task.partially_paid ?? task.partiallyPaid ?? false,
    era_ids: task.era_ids || task.eraIds || [],
    tag_ids: task.tag_ids || task.tagIds || [],
    stage_ids: task.stage_ids || task.stageIds || [],
    notes: task.notes || task.description || '',
    type: task.type || 'Custom',
    category: task.category || 'Other',
    parentType: parentType || task.parentType || null,
    isOverridden: task.isOverridden || false,
    isArchived: task.isArchived || false,
    // Legacy aliases - parent_item_id is source of truth for parent reference
    parentId: task.parent_item_id || task.parentItemId || task.parentId || null,
    parentItemId: task.parent_item_id || task.parentItemId || task.parentId || null,
    title: task.title || task.name || task.type || task.taskName || '',
    description: task.description || task.notes || '',
    date: task.due_date || task.dueDate || task.date || '',
    dueDate: task.due_date || task.dueDate || task.date || '',
    estimatedCost: task.estimatedCost ?? task.estimated_cost ?? 0,
    quotedCost: task.quotedCost ?? task.quoted_cost ?? 0,
    paidCost: task.paidCost ?? task.amount_paid ?? task.amountPaid ?? 0,
    // Preserve original assignedMembers format for UI components
    assignedMembers: assignedMembers,
    eraIds: task.eraIds || task.era_ids || [],
    tagIds: task.tagIds || task.tag_ids || [],
    stageIds: task.stageIds || task.stage_ids || [],
    // Preserve original task data
    _original: task
  };
};

// Unified Task schema factory - per APP ARCHITECTURE.txt Section 6
// All Tasks share this common structure regardless of parent type
export const createUnifiedTask = (overrides = {}) => ({
  // Core properties per Section 6: Task
  id: overrides.id || crypto.randomUUID(),
  parent_item_id: overrides.parent_item_id || overrides.parentItemId || overrides.parentId || null,
  name: overrides.name || overrides.title || overrides.type || '',
  status: overrides.status || 'Not Started',
  due_date: overrides.due_date || overrides.dueDate || overrides.date || '',
  team_member_ids: overrides.team_member_ids || overrides.teamMemberIds || overrides.assignedMembers || [],
  // Cost fields per Section 6 and 2.2
  estimated_cost: overrides.estimated_cost ?? overrides.estimatedCost ?? 0,
  quoted_cost: overrides.quoted_cost ?? overrides.quotedCost ?? 0,
  amount_paid: overrides.amount_paid ?? overrides.paidCost ?? overrides.amountPaid ?? 0,
  partially_paid: overrides.partially_paid ?? overrides.partiallyPaid ?? false,
  // Metadata per Section 6
  era_ids: overrides.era_ids || overrides.eraIds || [],
  tag_ids: overrides.tag_ids || overrides.tagIds || [],
  stage_ids: overrides.stage_ids || overrides.stageIds || [],
  notes: overrides.notes || overrides.description || '',
  // Additional properties for UI and categorization
  type: overrides.type || 'Custom',
  category: overrides.category || 'Other',
  parentType: overrides.parentType || null,
  isOverridden: overrides.isOverridden || false,
  isArchived: overrides.isArchived || false,
  // Legacy aliases for backwards compatibility with existing UI
  // parent_item_id is the source of truth for parent reference
  parentId: overrides.parent_item_id || overrides.parentItemId || overrides.parentId || null,
  parentItemId: overrides.parent_item_id || overrides.parentItemId || overrides.parentId || null,
  title: overrides.title || overrides.name || overrides.type || '',
  description: overrides.description || overrides.notes || '',
  date: overrides.due_date || overrides.dueDate || overrides.date || '',
  dueDate: overrides.due_date || overrides.dueDate || overrides.date || '',
  estimatedCost: overrides.estimatedCost ?? overrides.estimated_cost ?? 0,
  quotedCost: overrides.quotedCost ?? overrides.quoted_cost ?? 0,
  paidCost: overrides.paidCost ?? overrides.amount_paid ?? overrides.amountPaid ?? 0,
  assignedMembers: overrides.assignedMembers || overrides.team_member_ids || overrides.teamMemberIds || [],
  eraIds: overrides.eraIds || overrides.era_ids || [],
  tagIds: overrides.tagIds || overrides.tag_ids || [],
  stageIds: overrides.stageIds || overrides.stage_ids || [],
  ...overrides
});

// Resolve a task's due date - supports both new unified schema (due_date) and legacy fields
export const getTaskDueDate = (task = {}) => task.due_date || task.dueDate || task.date || '';

// Resolve the primary date for any item based on overrides, direct dates, and attached releases
export const getPrimaryDate = (item = {}, releases = [], extraReleaseIds = []) => {
  if (!item) return '';
  if (item.primary_date) return item.primary_date;
  if (item.primaryDate) return item.primaryDate;
  if (item.primaryDateOverride) return item.primaryDateOverride;
  if (item.releaseDate) return item.releaseDate;

  const overrideDates = item.releaseOverrides ? Object.values(item.releaseOverrides).filter(Boolean) : [];
  if (overrideDates.length > 0) return overrideDates.sort()[0];

  const collectedReleaseIds = [
    ...(item.coreReleaseId ? [item.coreReleaseId] : []),
    ...(item.releaseIds || []),
    ...extraReleaseIds
  ];

  const releaseDates = collectedReleaseIds
    .map(id => releases.find(r => r.id === id)?.releaseDate)
    .filter(Boolean)
    .sort();

  if (releaseDates.length > 0) return releaseDates[0];
  if (item.date) return item.date;
  if (item.exclusiveStartDate) return item.exclusiveStartDate;
  if (item.exclusiveEndDate) return item.exclusiveEndDate;
  return '';
};

// Compute effective cost with precedence: paid > quoted > estimated
// Supports both new unified schema (amount_paid, quoted_cost, estimated_cost) and legacy fields
export const resolveCostPrecedence = (entity = {}) => {
  // Support both new schema and legacy field names
  const actual = entity.actualCost || 0;
  const paid = entity.amount_paid || entity.paidCost || entity.amountPaid || 0;
  const partial = entity.partially_paid || entity.partiallyPaidAmount || entity.partialPaidCost || 0;
  const quoted = entity.quoted_cost || entity.quotedCost || 0;
  const estimated = entity.estimated_cost || entity.estimatedCost || 0;

  if (actual > 0) return { value: actual, source: 'actual' };
  if (paid > 0) return { value: paid, source: 'paid' };
  if (partial > 0) return { value: partial, source: 'partially_paid' };
  if (quoted > 0) return { value: quoted, source: 'quoted' };
  return { value: estimated, source: 'estimated' };
};

export const getEffectiveCost = (entity = {}) => resolveCostPrecedence(entity).value;

// Exclusivity options for availability windows
export const EXCLUSIVITY_OPTIONS = ['None', 'Platform Exclusive', 'Website Only', 'Radio Only', 'Timed Exclusive'];

// Video types available for selection
export const VIDEO_TYPE_OPTIONS = [
  { key: 'lyric', label: 'Lyric Video' },
  { key: 'enhancedLyric', label: 'Enhanced Lyric' },
  { key: 'music', label: 'Music Video' },
  { key: 'visualizer', label: 'Visualizer' },
  { key: 'custom', label: 'Custom' }
];

// Task types for songs - per APP ARCHITECTURE.txt Section 3.1 and 3.2
// Core Version tasks: Demo, Record, Mix, Master, Release
// Version tasks: Record, Mix, Master, Release, plus Record (Instrument) for each instrument
// Stems tasks (when stemsNeeded): Receive Stems, Release Stems
// Issue #5: Removed Artwork and Radio/Playlist Push - those belong ONLY to Releases, not Songs
export const SONG_TASK_TYPES = [
  // Core Production Tasks per Section 3.1
  { type: 'Demo', category: 'Production', daysBeforeRelease: 100, appliesTo: 'all' },
  { type: 'Arrangement', category: 'Production', daysBeforeRelease: 90, appliesTo: 'all' },
  { type: 'Record', category: 'Recording', daysBeforeRelease: 70, appliesTo: 'all' },
  { type: 'Vocal Recording', category: 'Recording', daysBeforeRelease: 60, appliesTo: 'all' },
  { type: 'Instrument Recording', category: 'Recording', daysBeforeRelease: 55, appliesTo: 'all' },
  { type: 'Mix', category: 'Post-Production', daysBeforeRelease: 42, appliesTo: 'all' },
  { type: 'Master', category: 'Post-Production', daysBeforeRelease: 21, appliesTo: 'all' },
  // Single-specific tasks - DSP Upload only, Artwork and Radio Push belong to Releases
  { type: 'DSP Upload', category: 'Distribution', daysBeforeRelease: 14, appliesTo: 'single' },
  // Release task
  { type: 'Release', category: 'Distribution', daysBeforeRelease: 0, appliesTo: 'all' }
];

// Stems-related tasks per APP ARCHITECTURE.txt Section 3.2
// Auto-generated when stemsNeeded is true on Song or Version
export const STEMS_TASK_TYPES = [
  { type: 'Receive Stems', category: 'Post-Production', daysBeforeRelease: 35 },
  { type: 'Release Stems', category: 'Distribution', daysBeforeRelease: 7 }
];

// Video task types - per APP ARCHITECTURE.txt Section 3.3 and Phase 1.8 specification
// Phase 1.8: Autogenerated Video Tasks must include: Plan Video, Hire Crew, Film Video, Edit Video, Submit Video, Release Video
// All video types get these 6 core tasks
export const VIDEO_TASK_TYPES = [
  { type: 'Plan Video', category: 'Video', daysBeforeRelease: 60, videoTypes: ['music', 'Full', 'lyric', 'enhancedLyric', 'visualizer', 'Lyric', 'Enhanced', 'Enhanced + Loop', 'custom', 'live', 'loop'] },
  { type: 'Hire Crew', category: 'Video', daysBeforeRelease: 45, videoTypes: ['music', 'Full', 'lyric', 'enhancedLyric', 'visualizer', 'Lyric', 'Enhanced', 'Enhanced + Loop', 'custom', 'live', 'loop'] },
  { type: 'Film Video', category: 'Video', daysBeforeRelease: 35, videoTypes: ['music', 'Full', 'lyric', 'enhancedLyric', 'visualizer', 'Lyric', 'Enhanced', 'Enhanced + Loop', 'custom', 'live', 'loop'] },
  { type: 'Edit Video', category: 'Video', daysBeforeRelease: 25, videoTypes: ['music', 'Full', 'lyric', 'enhancedLyric', 'visualizer', 'Lyric', 'Enhanced', 'Enhanced + Loop', 'custom', 'live', 'loop'] },
  { type: 'Submit Video', category: 'Video', daysBeforeRelease: 14, videoTypes: ['music', 'Full', 'lyric', 'enhancedLyric', 'visualizer', 'Lyric', 'Enhanced', 'Enhanced + Loop', 'custom', 'live', 'loop'] },
  { type: 'Release Video', category: 'Distribution', daysBeforeRelease: 0, videoTypes: ['music', 'Full', 'lyric', 'enhancedLyric', 'visualizer', 'Lyric', 'Enhanced', 'Enhanced + Loop', 'custom', 'live', 'loop'] }
];

// Generate tasks for a video based on its type
export const generateVideoTasks = (releaseDate, videoTypeKey) => {
  if (!releaseDate) return [];
  
  const release = new Date(releaseDate);
  const tasks = [];
  
  VIDEO_TASK_TYPES.forEach(taskType => {
    if (taskType.videoTypes.includes(videoTypeKey)) {
      const taskDate = new Date(release);
      taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);
      
      tasks.push(createUnifiedTask({
        type: taskType.type,
        category: taskType.category,
        date: taskDate.toISOString().split('T')[0],
        dueDate: taskDate.toISOString().split('T')[0],
        parentType: 'video'
      }));
    }
  });
  
  // Sort by date
  tasks.sort((a, b) => a.date.localeCompare(b.date));
  
  return tasks;
};

// Release task types - per APP ARCHITECTURE.txt Section 3.4 and Phase 3 specification
// Phase 3.6: When Release is created, auto-generate these tasks
// Core tasks: Complete All Tracks, Finalize Album Art, Submit Release, Release
export const RELEASE_TASK_TYPES = [
  { type: 'Complete All Tracks', category: 'Production', daysBeforeRelease: 60 },
  { type: 'Finalize Album Art', category: 'Marketing', daysBeforeRelease: 45 },
  { type: 'Submit Release', category: 'Distribution', daysBeforeRelease: 14 },
  { type: 'Release', category: 'Distribution', daysBeforeRelease: 0 }
];

// Physical release task types (optional, for releases with hasPhysicalCopies)
// Phase 3.6: If "Has Physical Copies?" = Yes, add these tasks
// Submit Physical Design, Receive Physical Copies, Distribute Physical Copies
export const PHYSICAL_RELEASE_TASK_TYPES = [
  { type: 'Submit Physical Design', category: 'Distribution', daysBeforeRelease: 90 },
  { type: 'Receive Physical Copies', category: 'Distribution', daysBeforeRelease: 21 },
  { type: 'Distribute Physical Copies', category: 'Distribution', daysBeforeRelease: 7 }
];

// Event task types - per APP ARCHITECTURE.txt Section 3.5
// When an Event is created: Attend Event, Optional preparation tasks
export const EVENT_TASK_TYPES = [
  { type: 'Attend Event', category: 'Events', daysBeforeEvent: 0, required: true },
  { type: 'Prepare for Event', category: 'Events', daysBeforeEvent: 7, required: false },
  { type: 'Rehearsal', category: 'Events', daysBeforeEvent: 3, required: false },
  { type: 'Travel Arrangements', category: 'Events', daysBeforeEvent: 14, required: false },
  { type: 'Equipment Setup', category: 'Events', daysBeforeEvent: 1, required: false },
  { type: 'Soundcheck', category: 'Events', daysBeforeEvent: 0, required: false }
];

// Generate tasks for an event
export const generateEventTasks = (eventDate, includePreparation = true) => {
  if (!eventDate) return [];
  
  const date = new Date(eventDate);
  const tasks = [];
  
  EVENT_TASK_TYPES.forEach(taskType => {
    // Always include required tasks, optionally include preparation tasks
    if (taskType.required || includePreparation) {
      const taskDate = new Date(date);
      taskDate.setDate(taskDate.getDate() - taskType.daysBeforeEvent);
      
      tasks.push(createUnifiedTask({
        type: taskType.type,
        category: taskType.category,
        date: taskDate.toISOString().split('T')[0],
        dueDate: taskDate.toISOString().split('T')[0],
        parentType: 'event',
        isOptional: !taskType.required
      }));
    }
  });
  
  // Sort by date
  tasks.sort((a, b) => a.date.localeCompare(b.date));
  
  return tasks;
};

// Deadline types (legacy - kept for compatibility)
export const DEADLINE_TYPES = ['Mix', 'Master', 'Artwork', 'Upload', 'VideoDelivery', 'Release'];

// Release types - Phase 3 Overhaul: Expanded list
export const RELEASE_TYPES = [
  'Album',
  'Deluxe Album',
  'Double Album',
  'EP',
  'Remix EP',
  'Holiday Release',
  'Single',
  'Double Single',
  'Mixtape',
  'Re-issue',
  'Other'
];

// Version types for recording requirements
export const VERSION_TYPES = ['Album', 'Radio Edit', 'Acoustic', 'Extended', 'Loop Version', 'Remix', 'Instrumental', 'Clean'];

// Global task categories
export const GLOBAL_TASK_CATEGORIES = ['Branding', 'Web', 'Legal', 'Visuals', 'Marketing', 'Events', 'Audio', 'Video', 'Merch', 'Other'];

// Helper function to calculate task dates based on release date
// Per APP ARCHITECTURE.txt Section 3.1 and 3.2
export const calculateSongTasks = (releaseDate, isSingle, videoType, stemsNeeded = false) => {
  if (!releaseDate) return [];
  
  const release = new Date(releaseDate);
  const tasks = [];
  
  // Add production/recording tasks from SONG_TASK_TYPES
  SONG_TASK_TYPES.forEach(taskType => {
    // Skip single-specific tasks if not a single
    if (taskType.appliesTo === 'single' && !isSingle) return;
    
    const taskDate = new Date(release);
    taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);
    
    // Use unified task schema
    tasks.push(createUnifiedTask({
      type: taskType.type,
      category: taskType.category,
      date: taskDate.toISOString().split('T')[0],
      dueDate: taskDate.toISOString().split('T')[0],
      parentType: 'song'
    }));
  });
  
  // Add stems tasks if stemsNeeded per Section 3.2
  if (stemsNeeded) {
    STEMS_TASK_TYPES.forEach(taskType => {
      const taskDate = new Date(release);
      taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);
      
      tasks.push(createUnifiedTask({
        type: taskType.type,
        category: taskType.category,
        date: taskDate.toISOString().split('T')[0],
        dueDate: taskDate.toISOString().split('T')[0],
        parentType: 'song'
      }));
    });
  }
  
  // Add video tasks based on video type
  if (videoType && videoType !== 'None') {
    VIDEO_TASK_TYPES.forEach(taskType => {
      if (taskType.videoTypes.includes(videoType)) {
        const taskDate = new Date(release);
        taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);
        
        tasks.push(createUnifiedTask({
          type: taskType.type,
          category: taskType.category,
          date: taskDate.toISOString().split('T')[0],
          dueDate: taskDate.toISOString().split('T')[0],
          parentType: 'song'
        }));
      }
    });
  }
  
  // Sort by date
  tasks.sort((a, b) => a.date.localeCompare(b.date));
  
  return tasks;
};

// Legacy function - calls the new one for backwards compatibility
export const calculateDeadlines = (releaseDate, isSingle, videoType, stemsNeeded = false) => {
  return calculateSongTasks(releaseDate, isSingle, videoType, stemsNeeded);
};

// Helper function to calculate release tasks
export const calculateReleaseTasks = (releaseDate) => {
  if (!releaseDate) return [];
  
  const release = new Date(releaseDate);
  const tasks = [];
  
  RELEASE_TASK_TYPES.forEach(taskType => {
    const taskDate = new Date(release);
    taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);

    // Use unified task schema
    tasks.push(createUnifiedTask({
      type: taskType.type,
      category: taskType.category,
      date: taskDate.toISOString().split('T')[0],
      dueDate: taskDate.toISOString().split('T')[0],
      parentType: 'release'
    }));
  });
  
  // Sort by date
  tasks.sort((a, b) => a.date.localeCompare(b.date));
  
  return tasks;
};

// Recalculate deadlines from release date (only non-overridden ones)
export const recalculateDeadlines = (existingDeadlines, releaseDate, isSingle, videoType) => {
  if (!releaseDate) return existingDeadlines;
  
  const release = new Date(releaseDate);
  const newDeadlines = [...existingDeadlines];
  
  // Build offsets from SONG_TASK_TYPES and VIDEO_TASK_TYPES
  const offsets = {};
  SONG_TASK_TYPES.forEach(task => {
    if (task.appliesTo === 'all' || (task.appliesTo === 'single' && isSingle)) {
      offsets[task.type] = -task.daysBeforeRelease;
    }
  });
  VIDEO_TASK_TYPES.forEach(task => {
    if (videoType && task.videoTypes.includes(videoType)) {
      offsets[task.type] = -task.daysBeforeRelease;
    }
  });
  
  newDeadlines.forEach(deadline => {
    if (!deadline.isOverridden && deadline.status !== 'Done' && offsets[deadline.type] !== undefined) {
      const newDate = new Date(release);
      newDate.setDate(newDate.getDate() + offsets[deadline.type]);
      deadline.date = newDate.toISOString().split('T')[0];
      deadline.dueDate = newDate.toISOString().split('T')[0];
    }
  });
  
  return newDeadlines;
};

// Recalculate release tasks from release date
export const recalculateReleaseTasks = (existingTasks, releaseDate) => {
  if (!releaseDate) return existingTasks;
  
  const release = new Date(releaseDate);
  const newTasks = [...existingTasks];
  
  const offsets = {};
  RELEASE_TASK_TYPES.forEach(task => {
    offsets[task.type] = -task.daysBeforeRelease;
  });
  
  newTasks.forEach(task => {
    if (!task.isOverridden && task.status !== 'Done' && offsets[task.type] !== undefined) {
      const newDate = new Date(release);
      newDate.setDate(newDate.getDate() + offsets[task.type]);
      task.date = newDate.toISOString().split('T')[0];
      task.dueDate = newDate.toISOString().split('T')[0];
    }
  });
  
  return newTasks;
};

const applyMetadataDefaults = (entity = {}, fallback = {}) => {
  const fallbackEras = fallback.eraIds || [];
  const fallbackStages = fallback.stageIds || [];
  const fallbackTags = fallback.tagIds || [];
  return {
    ...entity,
    eraIds: (entity.eraIds && entity.eraIds.length > 0) ? entity.eraIds : [...fallbackEras],
    stageIds: (entity.stageIds && entity.stageIds.length > 0) ? entity.stageIds : [...fallbackStages],
    tagIds: (entity.tagIds && entity.tagIds.length > 0) ? entity.tagIds : [...fallbackTags]
  };
};

const propagateSongMetadata = (song) => {
  const meta = {
    eraIds: song.eraIds || [],
    stageIds: song.stageIds || [],
    tagIds: song.tagIds || []
  };

  const mapTasks = (tasks = []) => tasks.map(task => {
    if (task.isOverridden || task.status === 'Done') {
      return applyMetadataDefaults(task, {});
    }
    return applyMetadataDefaults(task, meta);
  });

  return {
    ...song,
    deadlines: mapTasks(song.deadlines || []),
    customTasks: mapTasks(song.customTasks || []),
    versions: (song.versions || []).map(version => ({
      ...applyMetadataDefaults(version, meta),
      tasks: mapTasks(version.tasks || [])
    })),
    videos: (song.videos || []).map(video => ({
      ...applyMetadataDefaults(video, meta),
      tasks: mapTasks(video.tasks || [])
    }))
  };
};

// Migration function for legacy data - returns data in expected format
const migrateLegacyData = (data) => {
  if (!data) return { items: [], tasks: [] };
  return {
    items: data.items || [],
    tasks: data.tasks || []
  };
};

export const StoreProvider = ({ children }) => {
  const [mode, setMode] = useState('loading');
  const [data, setData] = useState({
    tasks: [],
    photos: [],
    files: [],
    vendors: [],
    teamMembers: [],
    misc: [],
    events: [],
    stages: [],
    eras: [],
    tags: [],
    settings: { mods: [] },
    // New entities from spec
    songs: [],
    globalTasks: [],
    releases: [],
    // Phase 2: Standalone videos
    standaloneVideos: [],
    templates: [],
    auditLog: [],
    // Per APP ARCHITECTURE.txt Section 1.2: Expense and Task Category Item types
    expenses: [],
    taskCategories: []
  });
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const appId = "album-tracker-v2";

  useEffect(() => {
    const init = async () => {
      const savedConfig = localStorage.getItem('at_firebase_config');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          const app = initializeApp(config);
          const auth = getAuth(app);
          const firestore = getFirestore(app);
          await signInAnonymously(auth);
          setUser(auth.currentUser);
          setDb(firestore);
          setMode('cloud');
          return;
        } catch (e) { console.error("Cloud Error", e); }
      }
      const localData = JSON.parse(localStorage.getItem(appId)) || {};
      setData(prev => {
        const merged = { ...prev, ...localData };
        const migrated = migrateLegacyData(merged);
        return { ...merged, items: migrated.items, tasksV2: migrated.tasks };
      });
      setMode('local');
    };
    init();
  }, []);

  useEffect(() => {
    if (mode === 'cloud' && db && user) {
      const collections = [
        'album_items', 'album_tasks_v2',
        'album_tasks', 'album_photos', 'album_files', 'album_vendors', 'album_teamMembers', 'album_misc_expenses',
        'album_events', 'album_stages', 'album_eras', 'album_tags', 'album_songs', 'album_globalTasks', 'album_releases',
        // Per APP ARCHITECTURE.txt Section 1.2: Expense and Task Category Item types
        'album_expenses', 'album_taskCategories'
      ];
      const unsubs = collections.map(col => {
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, col));
        return onSnapshot(q, (snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (col === 'album_items') {
             setData(prev => ({ ...prev, items: list }));
          } else if (col === 'album_tasks_v2') {
             setData(prev => ({ ...prev, tasksV2: list }));
          } else if (col === 'album_tasks') {
             const settingsDoc = list.find(d => d.id === 'settings');
             const taskDocs = list.filter(d => d.id !== 'settings');
             setData(prev => ({ ...prev, tasks: taskDocs, settings: settingsDoc || prev.settings }));
          } else {
             // Handle collection name mapping
             let key = col.replace('album_', '');
             // Special case for misc_expenses (legacy)
             if (key === 'misc_expenses') key = 'misc';
             // Map to correct state keys
             const mappedKey = key === 'task' ? 'tasks' : key === 'teamMembers' ? 'teamMembers' : key;
             setData(prev => ({ ...prev, [mappedKey]: list }));
          }
        });
      });
      return () => unsubs.forEach(u => u());
    } else if (mode === 'local') {
      localStorage.setItem(appId, JSON.stringify(data));
    }
  }, [data, mode, db, user]);

  useEffect(() => {
    if (mode === 'local' && (!data.stages || data.stages.length === 0)) {
        const defaults = [
          { id: 's1', name: "Stage 1: Arrangements", order: 1 },
          { id: 's2', name: "Stage 2: Pre-Production", order: 2 },
          { id: 's3', name: "Stage 3: Recording", order: 3 },
          { id: 's4', name: "Stage 4: Mixing/Mastering", order: 4 }
        ];
        setData(prev => ({ ...prev, stages: defaults }));
    }
  }, [mode, data.stages]);

  const syncVersionRecordingTasks = (version) => {
    const baseTasks = (version.tasks || []).filter(t => !t.generatedFromInstrument);
    const instrumentAssignments = [];
    (version.musicians || []).forEach(m => {
      (m.instruments || []).forEach(inst => {
        instrumentAssignments.push({ instrument: inst, memberId: m.memberId });
      });
    });
    const uniqueInstruments = Array.from(new Set([...(version.instruments || []), ...instrumentAssignments.map(i => i.instrument)]));
    const recordingTasks = uniqueInstruments.map(inst => {
      const existing = (version.tasks || []).find(t => t.generatedFromInstrument === inst);
      const assignments = instrumentAssignments.filter(a => a.instrument === inst).map(a => ({ memberId: a.memberId, instrument: inst }));
      if (existing) {
        return { ...existing, assignedMembers: assignments };
      }
      return createUnifiedTask({
        type: `Record (${inst})`,
        category: 'Recording',
        parentType: 'version',
        generatedFromInstrument: inst,
        assignedMembers: assignments
      });
    });
    return { ...version, tasks: [...baseTasks, ...recordingTasks] };
  };

    const stats = useMemo(() => {
    // Use getEffectiveCost directly for consistent cost calculation (paid > quoted > estimated)
    const costValue = getEffectiveCost;
    
    const visible = data.tasks.filter(t => !t.archived);
    let min = 0, max = 0, act = 0;
    const processNode = (nodeId) => {
        const children = visible.filter(t => t.parentId === nodeId);
        let pMin = 0, pMax = 0, pAct = 0;
        const t = visible.find(v => v.id === nodeId);
        const selfAct = t?.actualCost || 0;
        const selfEst = selfAct > 0 ? selfAct : (t?.quotedCost || t?.estimatedCost || 0);
        
        if (children.length === 0) {
             if (!t) return {min:0, max:0, act:0};
             return { min: (t.isOptional && !selfAct) ? 0 : selfEst, max: selfEst, act: selfAct };
        }
        const isChoice = t?.type === 'choice_group';
        if (isChoice) {
             const optionCosts = children.map(c => processNode(c.id));
             const selectedId = t.selectedOptionId;
             if (selectedId) {
                 const selectedCost = optionCosts.find((_, i) => children[i].id === selectedId);
                 if (selectedCost) { pMin = selectedCost.min; pMax = selectedCost.max; pAct = selectedCost.act; }
             } else if (optionCosts.length > 0) {
                 pMin = Math.min(...optionCosts.map(c => c.min));
                 pMax = Math.max(...optionCosts.map(c => c.max));
                 pAct = 0; 
             }
        } else {
             children.forEach(c => {
                 const cStats = processNode(c.id);
                 pMin += cStats.min; pMax += cStats.max; pAct += cStats.act;
             });
        }
        if (t) pAct += (t.actualCost || 0);
        return { min: pMin + selfEst, max: pMax + selfEst, act: pAct + selfAct };
    };
    visible.filter(t => !t.parentId).forEach(t => {
        const nodeStats = processNode(t.id);
        min += nodeStats.min; max += nodeStats.max; act += nodeStats.act;
    });
    const miscTotal = (data.misc || []).reduce((s, i) => s + (i.amount || 0), 0);
    
    // Calculate totals from new entities (songs, globalTasks, releases, expenses)
    let songsTotal = 0;
    let globalTasksTotal = 0;
    let releasesTotal = 0;
    let expensesTotal = 0;
    
    (data.songs || []).forEach(song => {
      songsTotal += costValue(song);
      (song.deadlines || []).forEach(d => { songsTotal += costValue(d); });
      (song.customTasks || []).forEach(t => { songsTotal += costValue(t); });
      (song.versions || []).forEach(v => { songsTotal += costValue(v); });
    });

    (data.globalTasks || []).forEach(t => { globalTasksTotal += costValue(t); });
    (data.releases || []).forEach(r => { releasesTotal += costValue(r); });
    // Per APP ARCHITECTURE.txt Section 1.2: Expenses as Item type
    (data.expenses || []).forEach(e => { expensesTotal += costValue(e); });
    
    const newEntitiesTotal = songsTotal + globalTasksTotal + releasesTotal + expensesTotal;
    
    return { 
      min: min + miscTotal, 
      max: max + miscTotal, 
      act: act + miscTotal,
      songsTotal,
      globalTasksTotal,
      releasesTotal,
      expensesTotal,
      grandTotal: min + miscTotal + newEntitiesTotal
    };
  }, [data.tasks, data.misc, data.songs, data.globalTasks, data.releases, data.expenses]);

  const actions = {
     logAudit: (action, entityType, entityId, metadata = {}) => {
        const actor = data.settings?.artistName || 'System';
        const entry = {
          id: crypto.randomUUID(),
          action,
          entityType,
          entityId,
          actor,
          timestamp: new Date().toISOString(),
          ...metadata
        };
        setData(prev => ({ ...prev, auditLog: [entry, ...(prev.auditLog || [])].slice(0, 200) }));
     },
     add: async (col, item) => {
        const colKey = col === 'misc_expenses' ? 'misc' : col;
        if (mode === 'cloud') await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, `album_${col}`), { ...item, createdAt: serverTimestamp() });
        else setData(p => ({...p, [colKey]: [...(p[colKey] || []), {id:crypto.randomUUID(), ...item}]}));
     },
     update: async (col, id, item) => {
         const colKey = col === 'misc_expenses' ? 'misc' : col;
         if (mode === 'cloud') await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, `album_${col}`, id), item);
         else setData(p => {
             return {...p, [colKey]: (p[colKey] || []).map(i => i.id === id ? { ...i, ...item } : i)};
         });
     },
     delete: async (col, id) => {
         const colKey = col === 'misc_expenses' ? 'misc' : col;
         actions.logAudit('delete', colKey, id);
         if (mode === 'cloud') await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, `album_${col}`, id));
         else setData(p => {
             return {...p, [colKey]: (p[colKey] || []).filter(i => i.id !== id)};
         });
     },
     archiveItem: async (col, id, reason = '') => {
        const colKey = col === 'misc_expenses' ? 'misc' : col;
        const actor = data.settings?.artistName || 'System';
        const payload = { archived: true, isArchived: true, archivedAt: new Date().toISOString(), archivedBy: actor, archiveReason: reason };
        actions.logAudit('archive', colKey, id, { reason });
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, `album_${col}`, id), { ...payload, archivedAt: serverTimestamp() });
        } else {
          setData(p => ({
            ...p,
            [colKey]: (p[colKey] || []).map(i => i.id === id ? { ...i, ...payload } : i)
          }));
        }
     },
     restoreItem: async (col, id) => {
        const colKey = col === 'misc_expenses' ? 'misc' : col;
        const payload = { archived: false, isArchived: false, restoredAt: new Date().toISOString() };
        actions.logAudit('restore', colKey, id);
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, `album_${col}`, id), payload);
        } else {
          setData(p => ({
            ...p,
            [colKey]: (p[colKey] || []).map(i => i.id === id ? { ...i, ...payload } : i)
          }));
        }
     },
     saveSettings: async (newSettings) => {
         if (mode === 'cloud') await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_tasks', 'settings'), newSettings, { merge: true });
         else setData(p => ({...p, settings: {...p.settings, ...newSettings}}));
     },
     runMigration: async (notes = '') => {
        actions.logAudit('migration', 'system', 'onboarding', { notes });
        const marker = { migrationRanAt: new Date().toISOString(), migrationNotes: notes, lastBackup: data.settings?.lastBackup || '' };
        await actions.saveSettings(marker);
        return marker;
     },
     connectCloud: (config) => { localStorage.setItem('at_firebase_config', JSON.stringify(config)); window.location.reload(); },
     disconnect: () => { localStorage.removeItem('at_firebase_config'); window.location.reload(); },

     // Mod handling
     registerMod: async (modConfig) => {
       const existingMods = data.settings?.mods || [];
       const normalizedActions = (modConfig.actions || []).map(action => ({
         id: action.id || crypto.randomUUID(),
         label: action.label || action.name || 'Action',
         type: action.type || 'createTask',
         target: action.target || 'tasks',
         template: action.template || action.payload || {},
         url: action.url || '',
         description: action.description || action.help || ''
       }));

       const normalizedMod = {
         id: modConfig.id || crypto.randomUUID(),
         name: modConfig.name || 'Custom Mod',
         version: modConfig.version || '0.1.0',
         description: modConfig.description || '',
         author: modConfig.author || 'Unknown',
         enabled: modConfig.enabled !== false,
         actions: normalizedActions,
         links: modConfig.links || []
       };

       const updatedMods = [...existingMods.filter(m => m.id !== normalizedMod.id), normalizedMod];
       await actions.saveSettings({ mods: updatedMods });
       return normalizedMod;
     },

     toggleMod: async (modId, enabled) => {
       const mods = data.settings?.mods || [];
       const updated = mods.map(mod => mod.id === modId ? { ...mod, enabled } : mod);
       await actions.saveSettings({ mods: updated });
       return updated.find(m => m.id === modId);
     },

     removeMod: async (modId) => {
       const mods = data.settings?.mods || [];
       const updated = mods.filter(mod => mod.id !== modId);
       await actions.saveSettings({ mods: updated });
       return updated;
     },

     runModAction: async (modId, actionId) => {
       const mods = data.settings?.mods || [];
       const mod = mods.find(m => m.id === modId);
       if (!mod || mod.enabled === false) return null;
       const action = (mod.actions || []).find(a => a.id === actionId);
       if (!action) return null;

       const baseTitle = action.title || action.label || `${mod.name} Action`;

       switch (action.type) {
         case 'createTask': {
           const newTask = createUnifiedTask({
             title: baseTitle,
             description: action.template?.description || '',
             status: action.template?.status || 'Not Started',
             dueDate: action.template?.dueDate || action.template?.date || '',
             estimatedCost: action.template?.estimatedCost || 0,
             quotedCost: action.template?.quotedCost || 0,
             paidCost: action.template?.paidCost || 0,
             notes: action.template?.notes || '',
             metadata: action.template?.metadata || {},
             parentType: action.template?.parentType || null,
             parentId: action.template?.parentId || null
           });
           await actions.add('tasks', newTask);
           return newTask;
         }
         case 'createGlobalTask': {
           const globalTask = createUnifiedTask({
             type: 'Global',
             title: baseTitle,
             taskName: baseTitle,
             status: action.template?.status || 'Not Started',
             date: action.template?.primaryDate || action.template?.date || '',
             category: action.template?.category || 'Other',
             estimatedCost: action.template?.estimatedCost || 0,
             quotedCost: action.template?.quotedCost || 0,
             paidCost: action.template?.paidCost || 0,
             notes: action.template?.notes || '',
             parentType: 'global'
           });
           await actions.add('globalTasks', globalTask);
           return globalTask;
         }
         case 'addTemplate': {
           const templates = data.settings?.templates || [];
           const newTemplate = {
             id: crypto.randomUUID(),
             name: action.template?.name || baseTitle,
             era: action.template?.era || data.settings?.defaultEra || 'Modern',
             body: action.template?.body || ''
           };
           await actions.saveSettings({ templates: [...templates, newTemplate] });
           return newTemplate;
         }
         case 'openLink': {
           if (action.url) window.open(action.url, '_blank', 'noopener,noreferrer');
           return action.url || null;
         }
         case 'addStage': {
           return actions.addStage({ name: action.name || baseTitle });
         }
         case 'addTag': {
           return actions.addTag({ name: action.name || baseTitle, color: action.color || '#000000' });
         }
         default:
           console.warn('Unknown mod action type', action.type);
           return null;
       }
     },

     // Phase 5: Enhanced event actions with custom tasks
     addEventCustomTask: async (eventId, task) => {
       const newTask = createUnifiedTask({
         type: 'Custom',
         title: task.title || 'New Task',
         description: task.description || '',
         date: task.date || '',
         status: task.status || 'Not Started',
         estimatedCost: task.estimatedCost || 0,
         quotedCost: task.quotedCost || 0,
         paidCost: task.paidCost || 0,
         notes: task.notes || '',
         parentType: 'event',
         parentId: eventId
       });
       if (mode === 'cloud') {
         const event = data.events.find(e => e.id === eventId);
         if (event) {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_events', eventId), {
             customTasks: [...(event.customTasks || []), newTask]
           });
         }
       } else {
         setData(p => ({
           ...p,
           events: (p.events || []).map(e => e.id === eventId ? { ...e, customTasks: [...(e.customTasks || []), newTask] } : e)
         }));
       }
       return newTask;
     },

     updateEventCustomTask: async (eventId, taskId, updates) => {
       if (mode === 'cloud') {
         const event = data.events.find(e => e.id === eventId);
         if (event) {
           const updatedTasks = (event.customTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_events', eventId), { customTasks: updatedTasks });
         }
       } else {
         setData(p => ({
           ...p,
           events: (p.events || []).map(e => e.id === eventId ? {
             ...e,
             customTasks: (e.customTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t)
           } : e)
         }));
       }
     },

     deleteEventCustomTask: async (eventId, taskId) => {
       if (mode === 'cloud') {
         const event = data.events.find(e => e.id === eventId);
         if (event) {
           const updatedTasks = (event.customTasks || []).filter(t => t.id !== taskId);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_events', eventId), { customTasks: updatedTasks });
         }
       } else {
         setData(p => ({
           ...p,
           events: (p.events || []).map(e => e.id === eventId ? {
             ...e,
             customTasks: (e.customTasks || []).filter(t => t.id !== taskId)
           } : e)
         }));
       }
     },

     // Per APP ARCHITECTURE.txt Section 5.4: Event properties
     // Events have: Name, Era/Stage, Team Members, Tasks, Notes, Location, Time/Date, Entry Cost, Progress
     // Phase 2: Events derive cost from Tasks only - no event-level cost fields
     addEvent: async (event, includePreparation = true) => {
       const defaultEraIds = event.eraIds || (data.settings?.defaultEraId ? [data.settings.defaultEraId] : []);
       // Generate auto-tasks per Section 3.5
       const autoTasks = generateEventTasks(event.date, includePreparation);
       
       const newEvent = {
         id: crypto.randomUUID(),
         title: event.title || 'New Event',
         type: event.type || 'Standalone Event',
         date: event.date || '',
         // Section 5.4: Time separate from date
         time: event.time || '',
         // Section 5.4: Location
         location: event.location || '',
         description: event.description || '',
         notes: event.notes || '',
         // Section 5.4: Entry Cost (counts as a hidden Completed Paid Task)
         entryCost: event.entryCost || 0,
         // Phase 2.1: Attendees - simple list of names (no functional logic)
         attendees: event.attendees || [],
         // Metadata
         eraIds: defaultEraIds,
         stageIds: event.stageIds || [],
         tagIds: event.tagIds || [],
         teamMemberIds: event.teamMemberIds || [],
         // Auto-generated tasks per Section 3.5
         tasks: autoTasks,
         customTasks: []
       };
       
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_events'), { ...newEvent, createdAt: serverTimestamp() });
       } else {
         setData(p => ({...p, events: [...(p.events || []), newEvent]}));
       }
       return newEvent;
     },

     updateEvent: async (eventId, updates) => {
       if (mode === 'cloud') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_events', eventId), updates);
       } else {
         setData(p => ({
           ...p,
           events: (p.events || []).map(e => e.id === eventId ? { ...e, ...updates } : e)
         }));
       }
     },

     deleteEvent: async (eventId) => {
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_events', eventId));
       } else {
         setData(p => ({...p, events: (p.events || []).filter(e => e.id !== eventId)}));
       }
     },

 

    addEra: async (era) => {
      const newEra = { id: crypto.randomUUID(), name: era.name || 'New Era', color: era.color || '#000000' };
      if (mode === 'cloud') {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_eras'), { ...newEra, createdAt: serverTimestamp() });
      } else {
        setData(p => ({ ...p, eras: [...(p.eras || []), newEra] }));
      }
      return newEra;
    },

    updateEra: async (eraId, updates) => {
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_eras', eraId), updates);
      } else {
        setData(p => ({ ...p, eras: (p.eras || []).map(e => e.id === eraId ? { ...e, ...updates } : e) }));
      }
    },

    deleteEra: async (eraId) => {
      if (mode === 'cloud') {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_eras', eraId));
      } else {
        setData(p => ({ ...p, eras: (p.eras || []).filter(e => e.id !== eraId) }));
      }
    },
    addStage: async (stage) => {
     const newStage = { id: crypto.randomUUID(), name: stage.name || 'New Stage', order: stage.order || (data.stages.length + 1) };
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_stages'), { ...newStage, createdAt: serverTimestamp() });
       } else {
         setData(p => ({ ...p, stages: [...(p.stages || []), newStage] }));
       }
       return newStage;
     },

     updateStage: async (stageId, updates) => {
       if (mode === 'cloud') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_stages', stageId), updates);
       } else {
         setData(p => ({ ...p, stages: (p.stages || []).map(s => s.id === stageId ? { ...s, ...updates } : s) }));
       }
     },

     deleteStage: async (stageId) => {
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_stages', stageId));
       } else {
         setData(p => ({ ...p, stages: (p.stages || []).filter(s => s.id !== stageId) }));
       }
     },

 

    addTag: async (tag) => {
      const newTag = { id: crypto.randomUUID(), name: tag.name || 'New Tag', color: tag.color || '#000000' };
      if (mode === 'cloud') {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_tags'), { ...newTag, createdAt: serverTimestamp() });
      } else {
        setData(p => ({ ...p, tags: [...(p.tags || []), newTag] }));
      }
      return newTag;
    },

    updateTag: async (tagId, updates) => {
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_tags', tagId), updates);
      } else {
        setData(p => ({ ...p, tags: (p.tags || []).map(t => t.id === tagId ? { ...t, ...updates } : t) }));
      }
    },

    deleteTag: async (tagId) => {
      if (mode === 'cloud') {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_tags', tagId));
      } else {
        setData(p => ({ ...p, tags: (p.tags || []).filter(t => t.id !== tagId) }));
      }
    },
    addTeamMember: async (member) => {
       // Per APP ARCHITECTURE.txt Section 1.3 and 5.5
       const newMember = {
         id: crypto.randomUUID(),
         name: member.name || 'New Member',
         // Contacts consolidated under contacts for future expansion
         contacts: {
           phone: member.contacts?.phone || member.phone || '',
           email: member.contacts?.email || member.email || '',
           website: member.contacts?.website || member.website || ''
         },
         // Backwards-compatible role string plus structured roles array
         role: member.role || '',
         roles: member.roles || (member.role ? [member.role] : []),
         notes: member.notes || '',
         type: member.type || 'individual',
         // Section 5.5: Work Mode (Remote/In-Person/Traveling) - for Individuals
         workMode: member.workMode || 'In-Person',
         // Section 5.5: Organization Type (For-Profit/Nonprofit/Other) - for Organizations
         orgType: member.orgType || 'For-Profit',
         // Section 5.5: Group Type - for Groups
         groupType: member.groupType || '',
         // Relationship graph between individuals, groups, and orgs
         links: {
           groups: member.links?.groups || [],
           organizations: member.links?.organizations || [],
           members: member.links?.members || []
         },
         instruments: member.instruments || [],
         costs: member.costs || {},
         isMusician: member.isMusician || false
       };
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_teamMembers'), { ...newMember, createdAt: serverTimestamp() });
       } else {
         setData(p => ({...p, teamMembers: [...(p.teamMembers || []), newMember]}));
       }
       return newMember;
     },

     updateTeamMember: async (memberId, updates) => {
      const normalizedUpdates = {
        ...updates,
        contacts: {
          phone: updates.contacts?.phone || updates.phone || '',
          email: updates.contacts?.email || updates.email || '',
          website: updates.contacts?.website || updates.website || ''
        },
        roles: updates.roles || (updates.role ? [updates.role] : undefined),
        links: updates.links || { groups: updates.groups || [], organizations: updates.organizations || [], members: updates.members || [] }
      };
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_teamMembers', memberId), normalizedUpdates);
      } else {
        setData(p => ({
          ...p,
          teamMembers: (p.teamMembers || []).map(m => m.id === memberId ? { ...m, ...normalizedUpdates } : m)
        }));
      }
    },

     deleteTeamMember: async (memberId) => {
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_teamMembers', memberId));
       } else {
         setData(p => ({...p, teamMembers: (p.teamMembers || []).filter(m => m.id !== memberId)}));
       }
     },
     
     // Song-specific actions - per APP ARCHITECTURE.txt Section 5.1
    addSong: async (song) => {
      const defaultEraIds = song.eraIds || (data.settings?.defaultEraId ? [data.settings.defaultEraId] : []);
      const metaDefaults = {
        eraIds: defaultEraIds,
        stageIds: song.stageIds || [],
        tagIds: song.tagIds || []
      };
      // Pass stemsNeeded to calculateDeadlines per Section 3.2
      const deadlines = calculateDeadlines(song.releaseDate, song.isSingle, song.videoType, song.stemsNeeded).map(t => applyMetadataDefaults(t, metaDefaults));
    const newSong = propagateSongMetadata({
        id: crypto.randomUUID(),
        title: song.title || 'New Song',
        // DEPRECATED: category field kept for backwards compatibility
        category: song.category || 'Album',
        releaseDate: song.releaseDate || '',
        coreReleaseId: song.coreReleaseId || '',
        isSingle: song.isSingle || false,
        videoType: song.videoType || 'None',
        stemsNeeded: song.stemsNeeded || false,
        // Writers and Composers per APP ARCHITECTURE.txt Section 5.1
        writers: song.writers || [],
        composers: song.composers || [],
        // Cost layers with precedence: paidCost > quotedCost > estimatedCost
        estimatedCost: song.estimatedCost || 0,
        quotedCost: song.quotedCost || 0,
        paidCost: song.paidCost || 0,
        // Availability windows for exclusivity
        exclusiveType: song.exclusiveType || 'None',
        exclusiveStartDate: song.exclusiveStartDate || '',
        exclusiveEndDate: song.exclusiveEndDate || '',
        exclusiveNotes: song.exclusiveNotes || '',
        instruments: song.instruments || [],
        musicians: song.musicians || [],
        eraIds: defaultEraIds,
        stageIds: song.stageIds || [],
        tagIds: song.tagIds || [],
        deadlines: deadlines,
        customTasks: [],
        versions: [
          {
            id: 'core',
            name: 'Core Version',
            releaseIds: song.coreReleaseId ? [song.coreReleaseId] : [],
            releaseOverrides: {},
            exclusiveType: song.exclusiveType || 'None',
            exclusiveStartDate: song.exclusiveStartDate || '',
            exclusiveEndDate: song.exclusiveEndDate || '',
            exclusiveNotes: song.exclusiveNotes || '',
            instruments: song.instruments || [],
            musicians: song.musicians || [],
            eraIds: defaultEraIds,
            stageIds: song.stageIds || [],
            tagIds: song.tagIds || [],
            // Cost layers
            estimatedCost: 0,
            quotedCost: 0,
            paidCost: 0,
            basedOnCore: true
          }
        ],
        videos: []
      });
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_songs'), { ...newSong, createdAt: serverTimestamp() });
       } else {
         setData(p => ({...p, songs: [...(p.songs || []), newSong]}));
       }
       return newSong;
     },
     
    updateSong: async (songId, updates) => {
      const song = data.songs.find(s => s.id === songId);
      const updatedSong = song ? propagateSongMetadata({ ...song, ...updates }) : updates;
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), updatedSong);
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, ...updatedSong } : s)
        }));
      }
    },
     
     deleteSong: async (songId) => {
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId));
       } else {
         setData(p => ({...p, songs: (p.songs || []).filter(s => s.id !== songId)}));
       }
     },
     
     // Add custom task to a song
     addSongCustomTask: async (songId, task) => {
       // Use unified task schema with cost layers
      const newTask = createUnifiedTask({
        type: 'Custom',
        title: task.title || 'New Task',
        description: task.description || '',
        date: task.date || '',
        status: task.status || 'Not Started',
        // Cost layers with precedence
        estimatedCost: task.estimatedCost || 0,
        quotedCost: task.quotedCost || 0,
        paidCost: task.paidCost || 0,
        notes: task.notes || '',
        parentType: 'song',
        parentId: songId
      });
      const song = data.songs.find(s => s.id === songId) || {};
      const taskWithMeta = applyMetadataDefaults(newTask, song);
      if (mode === 'cloud') {
        // For cloud mode, we need to update the song document
        const song = data.songs.find(s => s.id === songId);
        if (song) {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), {
            customTasks: [...(song.customTasks || []), taskWithMeta]
          });
        }
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, customTasks: [...(s.customTasks || []), taskWithMeta] } : s)
        }));
      }
      return taskWithMeta;
    },
     
     updateSongCustomTask: async (songId, taskId, updates) => {
       if (mode === 'cloud') {
         const song = data.songs.find(s => s.id === songId);
         if (song) {
           const updatedTasks = (song.customTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { customTasks: updatedTasks });
         }
       } else {
         setData(p => ({
           ...p,
           songs: (p.songs || []).map(s => s.id === songId ? {
             ...s,
             customTasks: (s.customTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t)
           } : s)
         }));
       }
     },
     
    deleteSongCustomTask: async (songId, taskId) => {
      if (mode === 'cloud') {
        const song = data.songs.find(s => s.id === songId);
        if (song) {
          const updatedTasks = (song.customTasks || []).filter(t => t.id !== taskId);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { customTasks: updatedTasks });
         }
       } else {
         setData(p => ({
           ...p,
           songs: (p.songs || []).map(s => s.id === songId ? {
             ...s,
             customTasks: (s.customTasks || []).filter(t => t.id !== taskId)
           } : s)
         }));
      }
    },

    addSongMusician: async (songId, musician) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => song.id === songId ? {
          ...song,
          musicians: [...(song.musicians || []), musician]
        } : song)
      }));
    },

    removeSongMusician: async (songId, musicianId) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => song.id === songId ? {
          ...song,
          musicians: (song.musicians || []).filter(m => m.id !== musicianId)
        } : song)
      }));
    },

    addVersionMusician: async (songId, versionId, musician) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVersions = (song.versions || []).map(v => {
            if (v.id !== versionId) return v;
            return syncVersionRecordingTasks({ ...v, musicians: [...(v.musicians || []), musician] });
          });
          return { ...song, versions: updatedVersions };
        })
      }));
    },

    removeVersionMusician: async (songId, versionId, musicianId) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVersions = (song.versions || []).map(v => {
            if (v.id !== versionId) return v;
            return syncVersionRecordingTasks({ ...v, musicians: (v.musicians || []).filter(m => m.id !== musicianId) });
          });
          return { ...song, versions: updatedVersions };
        })
      }));
    },

    // Version helpers - Phase 1: Enhanced version management
    addSongVersion: async (songId, baseData = null) => {
      const song = data.songs.find(s => s.id === songId);
      if (!song) return null;
      const coreVersion = song.versions?.find(v => v.id === 'core') || {};
      const template = baseData || coreVersion;
      
      // Generate version-specific tasks (arrangement, mix, master, release)
      const generateVersionTasks = (releaseDate) => {
        if (!releaseDate) return [];
        const versionTaskTypes = [
          { type: 'Arrangement', category: 'Production', daysBeforeRelease: 60 },
          { type: 'Instrumentation', category: 'Production', daysBeforeRelease: 50 },
          { type: 'Mix', category: 'Post-Production', daysBeforeRelease: 30 },
          { type: 'Master', category: 'Post-Production', daysBeforeRelease: 14 },
          { type: 'Release', category: 'Distribution', daysBeforeRelease: 0 }
        ];
        const release = new Date(releaseDate);
        return versionTaskTypes.map(taskType => {
          const taskDate = new Date(release);
          taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);
          return createUnifiedTask({
            type: taskType.type,
            category: taskType.category,
            date: taskDate.toISOString().split('T')[0],
            parentType: 'version'
          });
        });
      };
      
      const versionReleaseDate = baseData?.releaseDate || song.releaseDate || '';
      const versionTasks = generateVersionTasks(versionReleaseDate);
      
      let newVersion = {
        id: crypto.randomUUID(),
        name: baseData?.name || `${song.title} Alt`,
        // Multi-release linking
        releaseIds: [...(template.releaseIds || [])],
        releaseOverrides: { ...(template.releaseOverrides || {}) },
        // Version-specific release date
        releaseDate: versionReleaseDate,
        // Availability windows
        exclusiveType: template.exclusiveType || 'None',
        exclusiveStartDate: template.exclusiveStartDate || '',
        exclusiveEndDate: template.exclusiveEndDate || '',
        exclusiveNotes: template.exclusiveNotes || '',
        // Instruments and musicians
        instruments: [...(template.instruments || [])],
        musicians: [...(template.musicians || [])],
        // Cost layers
        estimatedCost: template.estimatedCost || 0,
        quotedCost: template.quotedCost || 0,
        paidCost: template.paidCost || 0,
        // Core inheritance
        basedOnCore: baseData?.basedOnCore !== undefined ? baseData.basedOnCore : true,
        // Video type selections (copied from template)
        videoTypes: { ...(template.videoTypes || { lyric: false, enhancedLyric: false, music: false, visualizer: false, custom: false }) },
        // Version-specific tasks (auto-generated)
        tasks: versionTasks,
        customTasks: []
      };

      newVersion = syncVersionRecordingTasks(newVersion);

      const saveVersions = (versions) => {
        if (mode === 'cloud') {
          updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions });
        } else {
          setData(p => ({
            ...p,
            songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions } : s)
          }));
        }
      };

      const updatedVersions = [...(song.versions || []), newVersion];
      saveVersions(updatedVersions);
      return newVersion;
    },

    updateSongVersion: async (songId, versionId, updates) => {
      const song = data.songs.find(s => s.id === songId);
      if (!song) return;
      const updatedVersions = (song.versions || []).map(v => {
        if (v.id !== versionId) return v;
        return syncVersionRecordingTasks({ ...v, ...updates });
      });
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions: updatedVersions });
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions: updatedVersions } : s)
        }));
      }
    },

    attachVersionToRelease: async (songId, versionId, releaseId, releaseDate) => {
      const song = data.songs.find(s => s.id === songId);
      if (!song) return;
      const updatedVersions = (song.versions || []).map(v => {
        if (v.id !== versionId) return v;
        const releaseIds = v.releaseIds?.includes(releaseId) ? v.releaseIds : [...(v.releaseIds || []), releaseId];
        const releaseOverrides = { ...(v.releaseOverrides || {}) };
        if (releaseDate) {
          releaseOverrides[releaseId] = releaseDate;
        }
        
        // Auto-fill version releaseDate from earliest attached release
        const allDates = releaseIds
          .map(id => data.releases.find(r => r.id === id)?.releaseDate)
          .filter(Boolean)
          .sort();
        const earliestDate = allDates[0];
        const newReleaseDate = (earliestDate && (!v.releaseDate || new Date(earliestDate) < new Date(v.releaseDate)))
          ? earliestDate
          : v.releaseDate;
        
        return { ...v, releaseIds, releaseOverrides, releaseDate: newReleaseDate };
      });
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions: updatedVersions });
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions: updatedVersions } : s)
        }));
      }
    },

    // Detach a version from a release (Phase 4: ability to decouple/unlink releases from versions)
    detachVersionFromRelease: async (songId, versionId, releaseId) => {
      const song = data.songs.find(s => s.id === songId);
      if (!song) return;
      const updatedVersions = (song.versions || []).map(v => {
        if (v.id !== versionId) return v;
        const releaseIds = (v.releaseIds || []).filter(id => id !== releaseId);
        const releaseOverrides = { ...(v.releaseOverrides || {}) };
        delete releaseOverrides[releaseId];
        return { ...v, releaseIds, releaseOverrides };
      });
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions: updatedVersions });
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions: updatedVersions } : s)
        }));
      }
    },

    // Delete a song version (except core)
    deleteSongVersion: async (songId, versionId) => {
      if (versionId === 'core') return; // Cannot delete core version
      const song = data.songs.find(s => s.id === songId);
      if (!song) return;
      const updatedVersions = (song.versions || []).filter(v => v.id !== versionId);
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions: updatedVersions });
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions: updatedVersions } : s)
        }));
      }
    },

    // Update a task on a song version
    updateVersionTask: async (songId, versionId, taskId, updates) => {
      const song = data.songs.find(s => s.id === songId);
      if (!song) return;
      const updatedVersions = (song.versions || []).map(v => {
        if (v.id !== versionId) return v;
        const updatedTasks = (v.tasks || []).map(t => t.id === taskId ? { ...t, ...updates, isOverridden: true } : t);
        return { ...v, tasks: updatedTasks };
      });
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions: updatedVersions });
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions: updatedVersions } : s)
        }));
      }
    },

    // Add custom task to a song version
    addVersionCustomTask: async (songId, versionId, task) => {
      const song = data.songs.find(s => s.id === songId);
      if (!song) return;
      const newTask = createUnifiedTask({
        type: 'Custom',
        title: task.title || 'New Task',
        description: task.description || '',
        date: task.date || '',
        dueDate: task.date || task.dueDate || '',
        status: task.status || 'Not Started',
        estimatedCost: task.estimatedCost || 0,
        quotedCost: task.quotedCost || 0,
        paidCost: task.paidCost || 0,
        notes: task.notes || '',
        parentType: 'version',
        parentId: versionId
      });
      const updatedVersions = (song.versions || []).map(v => {
        if (v.id !== versionId) return v;
        return { ...v, customTasks: [...(v.customTasks || []), newTask] };
      });
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions: updatedVersions });
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions: updatedVersions } : s)
        }));
      }
      return newTask;
    },
     
     // Issue #4: Add a song deadline/task
     addSongDeadline: async (songId, task) => {
       const newTask = createUnifiedTask({
         ...task,
         id: crypto.randomUUID(),
         parentType: 'song',
         parentId: songId
       });
       if (mode === 'cloud') {
         const song = data.songs.find(s => s.id === songId);
         if (song) {
           const updatedDeadlines = [...(song.deadlines || []), newTask];
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { deadlines: updatedDeadlines });
         }
       } else {
         setData(p => ({
           ...p,
           songs: (p.songs || []).map(s => s.id === songId ? {
             ...s,
             deadlines: [...(s.deadlines || []), newTask]
           } : s)
         }));
       }
       return newTask;
     },

     // Issue #4: Delete a song deadline/task
     deleteSongDeadline: async (songId, deadlineId) => {
       if (mode === 'cloud') {
         const song = data.songs.find(s => s.id === songId);
         if (song) {
           const updatedDeadlines = (song.deadlines || []).filter(d => d.id !== deadlineId);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { deadlines: updatedDeadlines });
         }
       } else {
         setData(p => ({
           ...p,
           songs: (p.songs || []).map(s => s.id === songId ? {
             ...s,
             deadlines: (s.deadlines || []).filter(d => d.id !== deadlineId)
           } : s)
         }));
       }
     },
     
     // Update a song deadline
     updateSongDeadline: async (songId, deadlineId, updates) => {
       // Mark as overridden if date is being updated
       const finalUpdates = updates.date !== undefined ? { ...updates, isOverridden: true } : updates;
       if (mode === 'cloud') {
         const song = data.songs.find(s => s.id === songId);
         if (song) {
           const updatedDeadlines = (song.deadlines || []).map(d => d.id === deadlineId ? { ...d, ...finalUpdates } : d);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { deadlines: updatedDeadlines });
         }
       } else {
         setData(p => ({
           ...p,
           songs: (p.songs || []).map(s => s.id === songId ? {
             ...s,
             deadlines: (s.deadlines || []).map(d => d.id === deadlineId ? { ...d, ...finalUpdates } : d)
           } : s)
         }));
       }
     },
     
     // Recalculate song deadlines from release date
     recalculateSongDeadlines: async (songId) => {
       const song = data.songs.find(s => s.id === songId);
       if (song && song.releaseDate) {
         let newDeadlines;
         // If no deadlines exist, create them from scratch
         if (!song.deadlines || song.deadlines.length === 0) {
           newDeadlines = calculateDeadlines(song.releaseDate, song.isSingle, song.videoType);
         } else {
           // Recalculate existing deadlines
           newDeadlines = recalculateDeadlines(song.deadlines, song.releaseDate, song.isSingle, song.videoType);
         }
         if (mode === 'cloud') {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { deadlines: newDeadlines });
         } else {
           setData(p => ({
             ...p,
             songs: (p.songs || []).map(s => s.id === songId ? { ...s, deadlines: newDeadlines } : s)
           }));
         }
       }
     },
     
     // Global task actions
     addGlobalTask: async (task) => {
       // Use unified task schema with cost layers
       const newTask = createUnifiedTask({
         type: 'Global',
         title: task.taskName || 'New Task',
         taskName: task.taskName || 'New Task',
         category: task.category || 'Other',
         date: task.date || '',
         description: task.description || '',
         assignedTo: task.assignedTo || '',
         status: task.status || 'Not Started',
         // Cost layers with precedence
         estimatedCost: task.estimatedCost || 0,
         quotedCost: task.quotedCost || 0,
         paidCost: task.paidCost || 0,
         notes: task.notes || '',
         parentType: 'global'
       });
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_globalTasks'), { ...newTask, createdAt: serverTimestamp() });
       } else {
         setData(p => ({...p, globalTasks: [...(p.globalTasks || []), newTask]}));
       }
       return newTask;
     },
     
     updateGlobalTask: async (taskId, updates) => {
       if (mode === 'cloud') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_globalTasks', taskId), updates);
       } else {
         setData(p => ({
           ...p,
           globalTasks: (p.globalTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t)
         }));
       }
     },
     
     deleteGlobalTask: async (taskId) => {
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_globalTasks', taskId));
       } else {
         setData(p => ({...p, globalTasks: (p.globalTasks || []).filter(t => t.id !== taskId)}));
       }
     },

     // Archive global task - Following unified Item/Page architecture
     archiveGlobalTask: async (taskId) => {
       if (mode === 'cloud') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_globalTasks', taskId), { isArchived: true });
       } else {
         setData(p => ({
           ...p,
           globalTasks: (p.globalTasks || []).map(t => t.id === taskId ? { ...t, isArchived: true } : t)
         }));
       }
     },
     
     // Per APP ARCHITECTURE.txt Section 5.5: Shortcut to create Standalone Task with Team Member pre-filled
     createTaskForTeamMember: async (memberId, taskData = {}) => {
       const member = data.teamMembers?.find(m => m.id === memberId);
       const memberName = member?.name || 'Team Member';
       const taskTitle = taskData.title || `Task for ${memberName}`;
       
       const newTask = createUnifiedTask({
         type: 'Global',
         title: taskTitle,
         category: taskData.category || 'Other',
         date: taskData.date || '',
         description: taskData.description || '',
         assignedTo: memberName,
         status: taskData.status || 'Not Started',
         estimatedCost: taskData.estimatedCost || 0,
         quotedCost: taskData.quotedCost || 0,
         paidCost: taskData.paidCost || 0,
         notes: taskData.notes || '',
         parentType: 'global',
         // Pre-fill assigned members with this team member
         assignedMembers: [{ memberId: memberId, cost: 0, instrument: '' }]
       });
       
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_globalTasks'), { ...newTask, createdAt: serverTimestamp() });
       } else {
         setData(p => ({...p, globalTasks: [...(p.globalTasks || []), newTask]}));
       }
       return newTask;
     },
     
     // Per APP ARCHITECTURE.txt Section 1.4: Propagate Era changes to child Tasks and linked Items
     propagateEraToChildren: async (entityType, entityId, eraIds) => {
       if (entityType === 'song') {
         const song = data.songs?.find(s => s.id === entityId);
         if (!song) return;
         
         // Update song deadlines/tasks with new era
         const updatedDeadlines = (song.deadlines || []).map(t => ({ ...t, eraIds }));
         const updatedCustomTasks = (song.customTasks || []).map(t => ({ ...t, eraIds }));
         
         // Update version tasks
         const updatedVersions = (song.versions || []).map(v => ({
           ...v,
           eraIds,
           tasks: (v.tasks || []).map(t => ({ ...t, eraIds })),
           customTasks: (v.customTasks || []).map(t => ({ ...t, eraIds }))
         }));
         
         // Update videos
         const updatedVideos = (song.videos || []).map(v => ({
           ...v,
           eraIds,
           tasks: (v.tasks || []).map(t => ({ ...t, eraIds })),
           customTasks: (v.customTasks || []).map(t => ({ ...t, eraIds }))
         }));
         
         const updatedSong = {
           ...song,
           eraIds,
           deadlines: updatedDeadlines,
           customTasks: updatedCustomTasks,
           versions: updatedVersions,
           videos: updatedVideos
         };
         
         if (mode === 'cloud') {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', entityId), updatedSong);
         } else {
           setData(p => ({
             ...p,
             songs: (p.songs || []).map(s => s.id === entityId ? updatedSong : s)
           }));
         }
       } else if (entityType === 'release') {
         const release = data.releases?.find(r => r.id === entityId);
         if (!release) return;
         
         // Update release tasks
         const updatedTasks = (release.tasks || []).map(t => ({ ...t, eraIds }));
         const updatedCustomTasks = (release.customTasks || []).map(t => ({ ...t, eraIds }));
         
         const updatedRelease = {
           ...release,
           eraIds,
           tasks: updatedTasks,
           customTasks: updatedCustomTasks
         };
         
         if (mode === 'cloud') {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', entityId), updatedRelease);
         } else {
           setData(p => ({
             ...p,
             releases: (p.releases || []).map(r => r.id === entityId ? updatedRelease : r)
           }));
         }
       } else if (entityType === 'event') {
         const event = data.events?.find(e => e.id === entityId);
         if (!event) return;
         
         // Update event tasks
         const updatedTasks = (event.tasks || []).map(t => ({ ...t, eraIds }));
         const updatedCustomTasks = (event.customTasks || []).map(t => ({ ...t, eraIds }));
         
         const updatedEvent = {
           ...event,
           eraIds,
           tasks: updatedTasks,
           customTasks: updatedCustomTasks
         };
         
         if (mode === 'cloud') {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_events', entityId), updatedEvent);
         } else {
           setData(p => ({
             ...p,
             events: (p.events || []).map(e => e.id === entityId ? updatedEvent : e)
           }));
         }
       }
     },
     
     // Release actions - Phase 3 enhancement
     addRelease: async (release) => {
       // Auto-spawn release tasks based on release date
       let releaseTasks = calculateReleaseTasks(release.releaseDate);
       
       // Phase 3.6: If hasPhysicalCopies, add physical release tasks
       if (release.hasPhysicalCopies && release.releaseDate) {
         const releaseDate = new Date(release.releaseDate);
         PHYSICAL_RELEASE_TASK_TYPES.forEach(taskType => {
           const taskDate = new Date(releaseDate);
           taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);
           releaseTasks.push(createUnifiedTask({
             type: taskType.type,
             category: taskType.category,
             date: taskDate.toISOString().split('T')[0],
             dueDate: taskDate.toISOString().split('T')[0],
             parentType: 'release'
           }));
         });
         // Sort by date
         releaseTasks.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
       }
       
       const newRelease = {
         id: crypto.randomUUID(),
         name: release.name || 'New Release',
         type: release.type || 'Album',
         // Phase 3.3: If type is 'Other', store details
         typeDetails: release.typeDetails || '',
         releaseDate: release.releaseDate || '',
         // Cost layers with precedence: paidCost > quotedCost > estimatedCost
         estimatedCost: release.estimatedCost || 0,
         quotedCost: release.quotedCost || 0,
         paidCost: release.paidCost || 0,
         notes: release.notes || '',
         // Phase 3.2: Exclusive YES/NO pattern (like Songs/Versions/Videos)
         hasExclusivity: release.hasExclusivity || false,
         exclusiveStartDate: release.exclusiveStartDate || '',
         exclusiveEndDate: release.exclusiveEndDate || '',
         exclusiveNotes: release.exclusiveNotes || '',
         // Phase 3.1 & 3.5: Has physical copies
         hasPhysicalCopies: release.hasPhysicalCopies || false,
         // Phase 3.5: Tracks module (replaces requiredRecordings and attachedSongIds)
         // Each track: { id, songId, versionIds: [], order, isExternal, externalArtist, externalTitle }
         tracks: release.tracks || [],
         // Legacy: Keep requiredRecordings for backward compatibility
         requiredRecordings: release.requiredRecordings || [],
         tasks: releaseTasks,  // Auto-spawned tasks
         // Phase 3: Custom tasks on releases
         customTasks: [],
         // Phase 3.4: Stage/Era/Tags directly on Release
         eraIds: release.eraIds || [],
         stageIds: release.stageIds || [],
         tagIds: release.tagIds || [],
         // Legacy: Attached content (replaced by tracks module but kept for migration)
         attachedSongIds: release.attachedSongIds || [],
         attachedVersions: release.attachedVersions || [], // [{songId, versionId}]
         attachedVideoIds: release.attachedVideoIds || [],
         attachedStandaloneVideoIds: release.attachedStandaloneVideoIds || []
       };
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_releases'), { ...newRelease, createdAt: serverTimestamp() });
       } else {
         setData(p => ({...p, releases: [...(p.releases || []), newRelease]}));
       }
       return newRelease;
     },
     
    updateRelease: async (releaseId, updates) => {
      // Helper to generate physical release tasks
      const generatePhysicalTasks = (releaseDate, existingTasks = []) => {
        const physicalTaskTypes = PHYSICAL_RELEASE_TASK_TYPES.map(t => t.type);
        const hasPhysicalTasks = existingTasks.some(t => physicalTaskTypes.includes(t.type));
        if (hasPhysicalTasks) return existingTasks;
        
        const releaseDateObj = new Date(releaseDate);
        const newTasks = [...existingTasks];
        PHYSICAL_RELEASE_TASK_TYPES.forEach(taskType => {
          const taskDate = new Date(releaseDateObj);
          taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);
          newTasks.push(createUnifiedTask({
            type: taskType.type,
            category: taskType.category,
            date: taskDate.toISOString().split('T')[0],
            dueDate: taskDate.toISOString().split('T')[0],
            parentType: 'release'
          }));
        });
        newTasks.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        return newTasks;
      };

      const applyReleaseSync = (releaseDate, additionalUpdates = {}) => {
        if (!releaseDate) return;
        setData(prev => {
          const updatedSongs = (prev.songs || []).map(song => {
            const touchesRelease = song.coreReleaseId === releaseId || (song.versions || []).some(v => (v.releaseIds || []).includes(releaseId));
            if (!touchesRelease) return song;
            const updatedVersions = (song.versions || []).map(v => {
              if (!(v.releaseIds || []).includes(releaseId)) return v;
              const existing = v.releaseOverrides?.[releaseId];
              const earliest = existing && existing < releaseDate ? existing : releaseDate;
              const releaseOverrides = { ...(v.releaseOverrides || {}), [releaseId]: earliest };
              return { ...v, releaseOverrides };
            });
            const effectiveSongDate = song.releaseDate && song.releaseDate <= releaseDate ? song.releaseDate : releaseDate;
            const updatedDeadlines = song.releaseDate
              ? recalculateDeadlines(song.deadlines || [], effectiveSongDate, song.isSingle, song.videoType)
              : song.deadlines;
            return { ...song, releaseDate: effectiveSongDate, versions: updatedVersions, deadlines: updatedDeadlines };
          });
          const updatedReleases = (prev.releases || []).map(r => {
            if (r.id !== releaseId) return r;
            let tasks = recalculateReleaseTasks(r.tasks || [], releaseDate);
            // Generate physical tasks if toggling hasPhysicalCopies to true
            if (additionalUpdates.hasPhysicalCopies === true && !r.hasPhysicalCopies) {
              tasks = generatePhysicalTasks(releaseDate, tasks);
            }
            return { ...r, ...additionalUpdates, releaseDate, tasks };
          });
          return { ...prev, songs: updatedSongs, releases: updatedReleases };
        });
      };

      const release = data.releases.find(r => r.id === releaseId);
      const effectiveReleaseDate = updates.releaseDate || release?.releaseDate;
      const isTogglingPhysicalOn = updates.hasPhysicalCopies === true && !release?.hasPhysicalCopies;

      if (mode === 'cloud') {
        let recalculatedTasks = updates.releaseDate ? recalculateReleaseTasks(release?.tasks || [], updates.releaseDate) : undefined;
        
        // Generate physical tasks if toggling hasPhysicalCopies to true
        if (isTogglingPhysicalOn && effectiveReleaseDate) {
          const baseTasks = recalculatedTasks || release?.tasks || [];
          recalculatedTasks = generatePhysicalTasks(effectiveReleaseDate, baseTasks);
        }
        
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), {
          ...updates,
          ...(recalculatedTasks ? { tasks: recalculatedTasks } : {})
        });
        if (updates.releaseDate) applyReleaseSync(updates.releaseDate);
      } else {
        if (updates.releaseDate) {
          applyReleaseSync(updates.releaseDate, updates);
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => {
              if (r.id !== releaseId) return r;
              let updatedRelease = { ...r, ...updates };
              // Generate physical tasks if toggling hasPhysicalCopies to true
              if (isTogglingPhysicalOn && effectiveReleaseDate) {
                updatedRelease.tasks = generatePhysicalTasks(effectiveReleaseDate, r.tasks || []);
              }
              return updatedRelease;
            })
          }));
        }
      }
    },
     
     deleteRelease: async (releaseId) => {
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId));
       } else {
         setData(p => ({...p, releases: (p.releases || []).filter(r => r.id !== releaseId)}));
       }
     },
     
     // Add recording requirement to release
     addRecordingRequirement: async (releaseId, requirement) => {
       const newReq = {
         id: crypto.randomUUID(),
         releaseId,
         songId: requirement.songId || '',
         versionType: requirement.versionType || 'Album',
         status: requirement.status || 'Not Started',
         notes: requirement.notes || ''
       };
       if (mode === 'cloud') {
         const release = data.releases.find(r => r.id === releaseId);
         if (release) {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), {
             requiredRecordings: [...(release.requiredRecordings || []), newReq]
           });
         }
       } else {
         setData(p => ({
           ...p,
           releases: (p.releases || []).map(r => r.id === releaseId ? {
             ...r,
             requiredRecordings: [...(r.requiredRecordings || []), newReq]
           } : r)
         }));
       }
       return newReq;
     },
     
     updateRecordingRequirement: async (releaseId, reqId, updates) => {
       if (mode === 'cloud') {
         const release = data.releases.find(r => r.id === releaseId);
         if (release) {
           const updatedReqs = (release.requiredRecordings || []).map(req => req.id === reqId ? { ...req, ...updates } : req);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { requiredRecordings: updatedReqs });
         }
       } else {
         setData(p => ({
           ...p,
           releases: (p.releases || []).map(r => r.id === releaseId ? {
             ...r,
             requiredRecordings: (r.requiredRecordings || []).map(req => req.id === reqId ? { ...req, ...updates } : req)
           } : r)
         }));
       }
     },
     
     deleteRecordingRequirement: async (releaseId, reqId) => {
       if (mode === 'cloud') {
         const release = data.releases.find(r => r.id === releaseId);
         if (release) {
           const updatedReqs = (release.requiredRecordings || []).filter(req => req.id !== reqId);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { requiredRecordings: updatedReqs });
         }
       } else {
         setData(p => ({
           ...p,
           releases: (p.releases || []).map(r => r.id === releaseId ? {
             ...r,
             requiredRecordings: (r.requiredRecordings || []).filter(req => req.id !== reqId)
           } : r)
         }));
       }
     },
     
     // Update a release task
    updateReleaseTask: async (releaseId, taskId, updates) => {
      const finalUpdates = updates.date !== undefined ? { ...updates, isOverridden: true } : updates;
      if (mode === 'cloud') {
        const release = data.releases.find(r => r.id === releaseId);
        if (release) {
           const updatedTasks = (release.tasks || []).map(t => t.id === taskId ? { ...t, ...finalUpdates } : t);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { tasks: updatedTasks });
         }
       } else {
         setData(p => ({
           ...p,
           releases: (p.releases || []).map(r => r.id === releaseId ? {
             ...r,
             tasks: (r.tasks || []).map(t => t.id === taskId ? { ...t, ...finalUpdates } : t)
           } : r)
        }));
      }
    },

    // Phase 3: Add custom task to a release
    addReleaseCustomTask: async (releaseId, task) => {
      const newTask = createUnifiedTask({
        type: 'Custom',
        title: task.title || 'New Task',
        description: task.description || '',
        date: task.date || '',
        dueDate: task.date || task.dueDate || '',
        status: task.status || 'Not Started',
        estimatedCost: task.estimatedCost || 0,
        quotedCost: task.quotedCost || 0,
        paidCost: task.paidCost || 0,
        notes: task.notes || '',
        parentType: 'release',
        parentId: releaseId
      });
      const release = data.releases.find(r => r.id === releaseId);
      if (release) {
        const updatedCustomTasks = [...(release.customTasks || []), newTask];
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { customTasks: updatedCustomTasks });
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, customTasks: updatedCustomTasks } : r)
          }));
        }
      }
      return newTask;
    },

    // Phase 3: Update custom task on a release
    updateReleaseCustomTask: async (releaseId, taskId, updates) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (release) {
        const updatedCustomTasks = (release.customTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t);
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { customTasks: updatedCustomTasks });
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, customTasks: updatedCustomTasks } : r)
          }));
        }
      }
    },

    // Phase 3: Delete custom task from a release
    deleteReleaseCustomTask: async (releaseId, taskId) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (release) {
        const updatedCustomTasks = (release.customTasks || []).filter(t => t.id !== taskId);
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { customTasks: updatedCustomTasks });
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, customTasks: updatedCustomTasks } : r)
          }));
        }
      }
    },

    // Phase 3.5: Add track to release (Tracks Module)
    // Track: { id, songId, versionIds: [], order, isExternal, externalArtist, externalTitle }
    addReleaseTrack: async (releaseId, track) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (!release) return;
      
      const existingTracks = release.tracks || [];
      const newTrack = {
        id: track.id || crypto.randomUUID(),
        songId: track.songId || null,
        versionIds: track.versionIds || [],
        order: track.order ?? existingTracks.length,
        isExternal: track.isExternal || false,
        externalArtist: track.externalArtist || '',
        externalTitle: track.externalTitle || ''
      };
      
      const updatedTracks = [...existingTracks, newTrack];
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { tracks: updatedTracks });
      } else {
        setData(p => ({
          ...p,
          releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, tracks: updatedTracks } : r)
        }));
      }
      return newTrack;
    },

    // Phase 3.5: Update track in release
    updateReleaseTrack: async (releaseId, trackId, updates) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (!release) return;
      
      const updatedTracks = (release.tracks || []).map(t => 
        t.id === trackId ? { ...t, ...updates } : t
      );
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { tracks: updatedTracks });
      } else {
        setData(p => ({
          ...p,
          releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, tracks: updatedTracks } : r)
        }));
      }
    },

    // Phase 3.5: Remove track from release
    removeReleaseTrack: async (releaseId, trackId) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (!release) return;
      
      const updatedTracks = (release.tracks || []).filter(t => t.id !== trackId);
      // Reorder remaining tracks
      updatedTracks.forEach((t, idx) => { t.order = idx; });
      
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { tracks: updatedTracks });
      } else {
        setData(p => ({
          ...p,
          releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, tracks: updatedTracks } : r)
        }));
      }
    },

    // Phase 3.5: Reorder tracks in release
    reorderReleaseTracks: async (releaseId, orderedTrackIds) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (!release) return;
      
      const trackMap = new Map((release.tracks || []).map(t => [t.id, t]));
      const updatedTracks = orderedTrackIds.map((id, idx) => ({
        ...trackMap.get(id),
        order: idx
      })).filter(Boolean);
      
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { tracks: updatedTracks });
      } else {
        setData(p => ({
          ...p,
          releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, tracks: updatedTracks } : r)
        }));
      }
    },

    // Phase 3: Attach song to release
    attachSongToRelease: async (releaseId, songId) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (release && !release.attachedSongIds?.includes(songId)) {
        const updatedAttachedSongIds = [...(release.attachedSongIds || []), songId];
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { attachedSongIds: updatedAttachedSongIds });
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, attachedSongIds: updatedAttachedSongIds } : r)
          }));
        }
      }
    },

    // Phase 3: Detach song from release
    detachSongFromRelease: async (releaseId, songId) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (release) {
        const updatedAttachedSongIds = (release.attachedSongIds || []).filter(id => id !== songId);
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { attachedSongIds: updatedAttachedSongIds });
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, attachedSongIds: updatedAttachedSongIds } : r)
          }));
        }
      }
    },

    // Phase 3: Auto-calculate release date from earliest attached content
    autoCalculateReleaseDateFromContent: async (releaseId) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (!release) return;
      
      let earliestDate = null;
      
      // Check attached songs
      (release.attachedSongIds || []).forEach(songId => {
        const song = data.songs.find(s => s.id === songId);
        if (song?.releaseDate && (!earliestDate || song.releaseDate < earliestDate)) {
          earliestDate = song.releaseDate;
        }
      });
      
      // Check attached versions
      (release.attachedVersions || []).forEach(({ songId, versionId }) => {
        const song = data.songs.find(s => s.id === songId);
        const version = song?.versions?.find(v => v.id === versionId);
        if (version?.releaseDate && (!earliestDate || version.releaseDate < earliestDate)) {
          earliestDate = version.releaseDate;
        }
      });
      
      if (earliestDate && (!release.releaseDate || earliestDate !== release.releaseDate)) {
        // Update release date and recalculate tasks
        const newTasks = calculateReleaseTasks(earliestDate);
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { 
            releaseDate: earliestDate,
            tasks: newTasks
          });
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, releaseDate: earliestDate, tasks: newTasks } : r)
          }));
        }
      }
    },

    // Phase 1: Enhanced video creation with auto-generated tasks and single video type
    // Phase 1.1: Videos can only have one Type
    // Phase 1.8: Creates 6 autogenerated tasks: Plan Video, Hire Crew, Film Video, Edit Video, Submit Video, Release Video
    addSongVideo: async (songId, video) => {
      // Find the song to get the release date for task generation
      const song = data.songs.find(s => s.id === songId);
      const releaseDate = video.releaseDate || song?.releaseDate || '';
      
      // Phase 1.1: Videos can only have one Type - use videoType field (string) as primary
      // For backwards compatibility, also support legacy types object
      const videoType = video.videoType || null;
      let primaryVideoType = videoType;
      
      // Legacy support: if types object provided, extract first true type
      if (!primaryVideoType && video.types) {
        const videoTypes = video.types;
        if (videoTypes.music) primaryVideoType = 'music';
        else if (videoTypes.lyric) primaryVideoType = 'lyric';
        else if (videoTypes.enhancedLyric) primaryVideoType = 'enhancedLyric';
        else if (videoTypes.visualizer) primaryVideoType = 'visualizer';
        else if (videoTypes.live) primaryVideoType = 'live';
        else if (videoTypes.loop) primaryVideoType = 'loop';
        else if (videoTypes.custom) primaryVideoType = 'custom';
      }
      
      // Phase 1.8: Auto-generate video tasks based on video type (6 core tasks)
      const autoTasks = primaryVideoType ? generateVideoTasks(releaseDate, primaryVideoType) : [];
      
      // Phase 1.1: Convert single type to types object for backwards compatibility
      const typesObject = primaryVideoType ? { [primaryVideoType]: true } : {};
      
      const newVideo = {
        id: crypto.randomUUID(),
        title: video.title || 'New Video',
        versionId: video.versionId || 'core',
        releaseDate: releaseDate,
        // Phase 1.1: Single video type (primary field)
        videoType: primaryVideoType || '',
        // Legacy types object for backwards compatibility
        types: typesObject,
        // Phase 1.1: If autogenerated from song/version, type is display-only
        isAutogenerated: video.isAutogenerated || false,
        // Phase 1.4: Timed Exclusive rework - YES/NO with dates and notes
        timedExclusive: video.timedExclusive || false,
        exclusiveStartDate: video.exclusiveStartDate || '',
        exclusiveEndDate: video.exclusiveEndDate || '',
        exclusiveNotes: video.exclusiveNotes || '',
        // Phase 1.5: Cost cleanup - remove estimated/quoted/paid, add budgetedCost
        budgetedCost: video.budgetedCost || 0,
        // Phase 1.6: Stage/Era/Tags for Videos
        eraIds: video.eraIds || song?.eraIds || [],
        stageIds: video.stageIds || song?.stageIds || [],
        tagIds: video.tagIds || song?.tagIds || [],
        // Phase 1.3: Attached items for tracking
        attachedReleaseIds: video.attachedReleaseIds || [],
        attachedEventIds: video.attachedEventIds || [],
        // Phase 1.8: Auto-generated tasks (6 core tasks)
        tasks: autoTasks,
        // Custom tasks on videos
        customTasks: video.customTasks || [],
        // Team members/musicians assigned to video
        musicians: video.musicians || [],
        teamMemberIds: video.teamMemberIds || [],
        // Notes
        notes: video.notes || ''
      };
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => song.id === songId ? {
          ...song,
          videos: [...(song.videos || []), newVideo]
        } : song)
      }));
      return newVideo;
    },

    updateSongVideo: async (songId, videoId, updates) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => song.id === songId ? {
          ...song,
          videos: (song.videos || []).map(v => v.id === videoId ? { ...v, ...updates } : v)
        } : song)
      }));
    },

    deleteSongVideo: async (songId, videoId) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => song.id === songId ? { ...song, videos: (song.videos || []).filter(v => v.id !== videoId) } : song)
      }));
    },

    // Update a task on a video
    updateVideoTask: async (songId, videoId, taskId, updates) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVideos = (song.videos || []).map(v => {
            if (v.id !== videoId) return v;
            const updatedTasks = (v.tasks || []).map(t => t.id === taskId ? { ...t, ...updates, isOverridden: true } : t);
            return { ...v, tasks: updatedTasks };
          });
          return { ...song, videos: updatedVideos };
        })
      }));
    },

    // Add custom task to a video
    addVideoCustomTask: async (songId, videoId, task) => {
      const newTask = createUnifiedTask({
        type: 'Custom',
        title: task.title || 'New Task',
        description: task.description || '',
        date: task.date || '',
        dueDate: task.date || task.dueDate || '',
        status: task.status || 'Not Started',
        estimatedCost: task.estimatedCost || 0,
        quotedCost: task.quotedCost || 0,
        paidCost: task.paidCost || 0,
        notes: task.notes || '',
        parentType: 'video',
        parentId: videoId
      });
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVideos = (song.videos || []).map(v => {
            if (v.id !== videoId) return v;
            return { ...v, customTasks: [...(v.customTasks || []), newTask] };
          });
          return { ...song, videos: updatedVideos };
        })
      }));
      return newTask;
    },

    // Delete custom task from a video
    deleteVideoCustomTask: async (songId, videoId, taskId) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVideos = (song.videos || []).map(v => {
            if (v.id !== videoId) return v;
            return { ...v, customTasks: (v.customTasks || []).filter(t => t.id !== taskId) };
          });
          return { ...song, videos: updatedVideos };
        })
      }));
    },

    // Phase 8: Add musician to a video
    addVideoMusician: async (songId, videoId, musician) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVideos = (song.videos || []).map(v => {
            if (v.id !== videoId) return v;
            return { ...v, musicians: [...(v.musicians || []), musician] };
          });
          return { ...song, videos: updatedVideos };
        })
      }));
    },

    // Phase 8: Remove musician from a video
    removeVideoMusician: async (songId, videoId, musicianId) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVideos = (song.videos || []).map(v => {
            if (v.id !== videoId) return v;
            return { ...v, musicians: (v.musicians || []).filter(m => m.id !== musicianId) };
          });
          return { ...song, videos: updatedVideos };
        })
      }));
    },

    // Phase 1: Add standalone video (not tied to a song)
    // Phase 1.1: Videos can only have one Type
    // Phase 1.2: Standalone videos must pick a Type first
    // Phase 1.8: Creates 6 autogenerated tasks
    addStandaloneVideo: async (video) => {
      const releaseDate = video.releaseDate || '';
      
      // Phase 1.1 & 1.2: Videos can only have one Type - use videoType field (string) as primary
      const videoType = video.videoType || null;
      let primaryVideoType = videoType;
      
      // Legacy support: if types object provided, extract first true type
      if (!primaryVideoType && video.types) {
        const videoTypes = video.types;
        if (videoTypes.music) primaryVideoType = 'music';
        else if (videoTypes.lyric) primaryVideoType = 'lyric';
        else if (videoTypes.enhancedLyric) primaryVideoType = 'enhancedLyric';
        else if (videoTypes.visualizer) primaryVideoType = 'visualizer';
        else if (videoTypes.live) primaryVideoType = 'live';
        else if (videoTypes.loop) primaryVideoType = 'loop';
        else if (videoTypes.custom) primaryVideoType = 'custom';
      }
      
      // Phase 1.8: Auto-generate video tasks based on video type (6 core tasks)
      const autoTasks = primaryVideoType ? generateVideoTasks(releaseDate, primaryVideoType) : [];
      
      // Phase 1.1: Convert single type to types object for backwards compatibility
      const typesObject = primaryVideoType ? { [primaryVideoType]: true } : {};
      
      const newVideo = {
        id: crypto.randomUUID(),
        title: video.title || 'New Standalone Video',
        isStandalone: true,
        releaseDate: releaseDate,
        // Phase 1.1: Single video type (primary field)
        videoType: primaryVideoType || '',
        // Legacy types object for backwards compatibility
        types: typesObject,
        // Phase 1.2: Standalone videos - attached song/version info
        attachedSongId: video.attachedSongId || null,
        attachedVersionId: video.attachedVersionId || null,
        // Phase 1.4: Timed Exclusive rework - YES/NO with dates and notes
        timedExclusive: video.timedExclusive || false,
        exclusiveStartDate: video.exclusiveStartDate || '',
        exclusiveEndDate: video.exclusiveEndDate || '',
        exclusiveNotes: video.exclusiveNotes || '',
        // Phase 1.5: Cost cleanup - remove estimated/quoted/paid, add budgetedCost
        budgetedCost: video.budgetedCost || 0,
        // Phase 1.6: Stage/Era/Tags for Videos
        eraIds: video.eraIds || [],
        stageIds: video.stageIds || [],
        tagIds: video.tagIds || [],
        // Phase 1.3: Attached items for tracking
        attachedReleaseIds: video.attachedReleaseIds || [],
        attachedEventIds: video.attachedEventIds || [],
        // Phase 1.8: Auto-generated tasks (6 core tasks)
        tasks: autoTasks,
        // Custom tasks on videos
        customTasks: video.customTasks || [],
        // Team members
        teamMemberIds: video.teamMemberIds || [],
        // Notes
        notes: video.notes || ''
      };
      
      // Store standalone videos in a separate array
      setData(prev => ({
        ...prev,
        standaloneVideos: [...(prev.standaloneVideos || []), newVideo]
      }));
      return newVideo;
    },

    // Update standalone video
    updateStandaloneVideo: async (videoId, updates) => {
      setData(prev => ({
        ...prev,
        standaloneVideos: (prev.standaloneVideos || []).map(v => v.id === videoId ? { ...v, ...updates } : v)
      }));
    },

    // Delete standalone video
    deleteStandaloneVideo: async (videoId) => {
      setData(prev => ({
        ...prev,
        standaloneVideos: (prev.standaloneVideos || []).filter(v => v.id !== videoId)
      }));
    },

    // Add custom task to standalone video - Following unified Task system
    addStandaloneVideoCustomTask: async (videoId, task) => {
      const newTask = {
        id: crypto.randomUUID(),
        ...task,
        status: task.status || 'Not Started'
      };
      setData(prev => ({
        ...prev,
        standaloneVideos: (prev.standaloneVideos || []).map(v =>
          v.id === videoId ? { ...v, customTasks: [...(v.customTasks || []), newTask] } : v
        )
      }));
      return newTask;
    },

    // Delete custom task from standalone video
    deleteStandaloneVideoCustomTask: async (videoId, taskId) => {
      setData(prev => ({
        ...prev,
        standaloneVideos: (prev.standaloneVideos || []).map(v =>
          v.id === videoId ? { ...v, customTasks: (v.customTasks || []).filter(t => t.id !== taskId) } : v
        )
      }));
    },

    // Add custom task to song video - Following unified Task system
    addSongVideoCustomTask: async (songId, videoId, task) => {
      const newTask = {
        id: crypto.randomUUID(),
        ...task,
        status: task.status || 'Not Started'
      };
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(s =>
          s.id === songId ? {
            ...s,
            videos: (s.videos || []).map(v =>
              v.id === videoId ? { ...v, customTasks: [...(v.customTasks || []), newTask] } : v
            )
          } : s
        )
      }));
      return newTask;
    },

    // Delete custom task from song video
    deleteSongVideoCustomTask: async (songId, videoId, taskId) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(s =>
          s.id === songId ? {
            ...s,
            videos: (s.videos || []).map(v =>
              v.id === videoId ? { ...v, customTasks: (v.customTasks || []).filter(t => t.id !== taskId) } : v
            )
          } : s
        )
      }));
    },
     
     // Recalculate release tasks from release date
     recalculateReleaseTasksAction: async (releaseId) => {
       const release = data.releases.find(r => r.id === releaseId);
       if (release && release.releaseDate) {
         let newTasks;
         if (!release.tasks || release.tasks.length === 0) {
           newTasks = calculateReleaseTasks(release.releaseDate);
         } else {
           newTasks = recalculateReleaseTasks(release.tasks, release.releaseDate);
         }
         if (mode === 'cloud') {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { tasks: newTasks });
         } else {
           setData(p => ({
             ...p,
             releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, tasks: newTasks } : r)
           }));
         }
       }
     },

     // ============================================================
     // EXPENSE ITEM ACTIONS - Per APP ARCHITECTURE.txt Section 1.2
     // Expenses are first-class Items with unified Item properties
     // ============================================================
     
     addExpense: async (expense) => {
       const newExpense = {
         id: crypto.randomUUID(),
         // Unified Item fields per Section 6
         // Use name if provided, otherwise default to 'New Expense'
         name: expense.name || 'New Expense',
         date: expense.date || new Date().toISOString().split('T')[0],
         // Cost layers with precedence: paidCost > quotedCost > estimatedCost
         estimatedCost: expense.estimatedCost || 0,
         quotedCost: expense.quotedCost || 0,
         paidCost: expense.paidCost || expense.amount || 0,
         partiallyPaid: expense.partiallyPaid || 0,
         // Metadata
         category: expense.category || 'General',
         // Phase 4.2: Vendor field - EITHER short text OR attach team members
         vendorMode: expense.vendorMode || 'text', // 'text' or 'teamMember'
         vendorText: expense.vendorText || '', // Short text input for vendor name
         vendorId: expense.vendorId || '', // Legacy - kept for backwards compatibility
         teamMemberIds: expense.teamMemberIds || [], // Team members as vendor/payees
         // Phase 4.4: Receipt Location field
         receiptLocation: expense.receiptLocation || '', // URL, path, or note for receipt
         // Metadata arrays
         eraIds: expense.eraIds || [],
         stageIds: expense.stageIds || [],
         tagIds: expense.tagIds || [],
         // Status using unified STATUS_OPTIONS
         status: expense.status || 'Complete',
         // Parent relationship (optional - can link to Song, Release, Event, etc.)
         parentType: expense.parentType || null,
         parentId: expense.parentId || null,
         notes: expense.notes || '',
         isArchived: false
       };
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_expenses'), { ...newExpense, createdAt: serverTimestamp() });
       } else {
         setData(p => ({ ...p, expenses: [...(p.expenses || []), newExpense] }));
       }
       return newExpense;
     },

     updateExpense: async (expenseId, updates) => {
       if (mode === 'cloud') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_expenses', expenseId), updates);
       } else {
         setData(p => ({
           ...p,
           expenses: (p.expenses || []).map(e => e.id === expenseId ? { ...e, ...updates } : e)
         }));
       }
     },

     deleteExpense: async (expenseId) => {
       actions.logAudit('delete', 'expense', expenseId);
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_expenses', expenseId));
       } else {
         setData(p => ({
           ...p,
           expenses: (p.expenses || []).filter(e => e.id !== expenseId)
         }));
       }
     },

     archiveExpense: async (expenseId) => {
       const payload = { isArchived: true, archivedAt: new Date().toISOString() };
       actions.logAudit('archive', 'expense', expenseId);
       if (mode === 'cloud') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_expenses', expenseId), payload);
       } else {
         setData(p => ({
           ...p,
           expenses: (p.expenses || []).map(e => e.id === expenseId ? { ...e, ...payload } : e)
         }));
       }
     },

     // ============================================================
     // TASK CATEGORY ITEM ACTIONS - Per APP ARCHITECTURE.txt Section 1.2
     // Task Categories are first-class Items that group Global Tasks
     // ============================================================
     
     addTaskCategory: async (category) => {
       const newCategory = {
         id: crypto.randomUUID(),
         // Unified Item fields per Section 6
         name: category.name || 'New Category',
         description: category.description || '',
         // Categories don't need dates typically, but support them for sorting
         date: category.date || '',
         // Cost layers (aggregated from tasks, but can have own costs)
         estimatedCost: category.estimatedCost || 0,
         quotedCost: category.quotedCost || 0,
         paidCost: category.paidCost || 0,
         // Metadata
         color: category.color || '#000000',
         icon: category.icon || 'Folder',
         order: category.order || 0,
         // Metadata arrays
         eraIds: category.eraIds || [],
         stageIds: category.stageIds || [],
         tagIds: category.tagIds || [],
         teamMemberIds: category.teamMemberIds || [],
         // Status
         status: category.status || 'Not Started',
         isArchived: false,
         // Migration: Keep legacy name for backwards compatibility with existing Global Tasks
         legacyCategoryName: category.legacyCategoryName || category.name || ''
       };
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_taskCategories'), { ...newCategory, createdAt: serverTimestamp() });
       } else {
         setData(p => ({ ...p, taskCategories: [...(p.taskCategories || []), newCategory] }));
       }
       return newCategory;
     },

     updateTaskCategory: async (categoryId, updates) => {
       if (mode === 'cloud') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_taskCategories', categoryId), updates);
       } else {
         setData(p => ({
           ...p,
           taskCategories: (p.taskCategories || []).map(c => c.id === categoryId ? { ...c, ...updates } : c)
         }));
       }
     },

     deleteTaskCategory: async (categoryId) => {
       actions.logAudit('delete', 'taskCategory', categoryId);
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_taskCategories', categoryId));
       } else {
         setData(p => ({
           ...p,
           taskCategories: (p.taskCategories || []).filter(c => c.id !== categoryId)
         }));
       }
     },

     // Get all global tasks for a specific category
     getGlobalTasksByCategory: (categoryId) => {
       const category = data.taskCategories?.find(c => c.id === categoryId);
       if (!category) return [];
       // Match by category ID or by legacy category name
       return (data.globalTasks || []).filter(t => 
         t.categoryId === categoryId || 
         t.category === category.name || 
         t.category === category.legacyCategoryName
       );
     },

     // Link a global task to a category
     linkTaskToCategory: async (taskId, categoryId) => {
       const category = data.taskCategories?.find(c => c.id === categoryId);
       if (!category) return;
       await actions.updateGlobalTask(taskId, { 
         categoryId: categoryId,
         category: category.name 
       });
     },

     // ============================================================
     // DATA IMPORT/EXPORT ACTIONS
     // ============================================================

     // Import data from a backup file
     // mode: 'replace' - replace all existing data
     // mode: 'merge' - merge with existing data (new items added, conflicts use imported)
     importData: async (importedData, importMode = 'replace') => {
       // Collections to import
       const collections = [
         'tasks', 'photos', 'files', 'vendors', 'teamMembers', 'misc',
         'events', 'stages', 'eras', 'tags', 'songs', 'globalTasks',
         'releases', 'standaloneVideos', 'templates', 'auditLog',
         'expenses', 'taskCategories'
       ];

       if (importMode === 'replace') {
         // Replace mode: clear and replace all data
         const newData = { settings: data.settings };
         
         collections.forEach(col => {
           newData[col] = importedData[col] || [];
         });
         
         // Import settings if present
         if (importedData.settings) {
           newData.settings = { ...data.settings, ...importedData.settings };
         }
         
         if (mode === 'cloud' && db && user) {
           // For cloud mode: delete existing documents then add imported ones
           // Note: This uses setDoc which will create or overwrite documents by ID.
           // Existing documents with IDs not in the import will remain.
           // For a true "replace all", you would need to query and delete all first,
           // but that's expensive. This approach effectively merges by ID while
           // replacing document contents.
           for (const col of collections) {
             const colData = importedData[col] || [];
             const colName = col === 'misc' ? 'misc_expenses' : col;
             
             // Delete existing items that are not in the import
             const existingItems = data[col] || [];
             const importedIds = new Set(colData.map(item => item.id));
             for (const existing of existingItems) {
               if (!importedIds.has(existing.id)) {
                 try {
                   await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, `album_${colName}`, existing.id));
                 } catch (e) {
                   console.error(`Failed to delete ${col} item during replace`, existing.id, e);
                 }
               }
             }
             
             // Add/update imported items
             for (const item of colData) {
               try {
                 await setDoc(
                   doc(db, 'artifacts', appId, 'users', user.uid, `album_${colName}`, item.id),
                   { ...item, importedAt: serverTimestamp() }
                 );
               } catch (e) {
                 console.error(`Failed to import ${col} item`, item.id, e);
               }
             }
           }
           // Save settings
           if (importedData.settings) {
             await setDoc(
               doc(db, 'artifacts', appId, 'users', user.uid, 'album_tasks', 'settings'),
               { ...data.settings, ...importedData.settings },
               { merge: true }
             );
           }
         } else {
           // Local mode: directly update state with imported data
           setData(prev => ({
             ...prev,
             ...newData
           }));
         }
       } else {
         // Merge mode: add new items, update existing by ID
         const mergedData = { ...data };
         
         collections.forEach(col => {
           const existingItems = data[col] || [];
           const newItems = importedData[col] || [];
           const existingIds = new Set(existingItems.map(i => i.id));
           
           // Items that exist get updated, new ones get added
           const updatedExisting = existingItems.map(existing => {
             const imported = newItems.find(i => i.id === existing.id);
             return imported ? { ...existing, ...imported } : existing;
           });
           
           // Add items that don't exist
           const toAdd = newItems.filter(i => !existingIds.has(i.id));
           
           mergedData[col] = [...updatedExisting, ...toAdd];
         });
         
         // Merge settings
         if (importedData.settings) {
           mergedData.settings = { ...data.settings, ...importedData.settings };
         }
         
         if (mode === 'cloud' && db && user) {
           // For cloud mode in merge, upsert each item
           for (const col of collections) {
             const colData = mergedData[col] || [];
             for (const item of colData) {
               const colName = col === 'misc' ? 'misc_expenses' : col;
               try {
                 await setDoc(
                   doc(db, 'artifacts', appId, 'users', user.uid, `album_${colName}`, item.id),
                   { ...item, importedAt: serverTimestamp() },
                   { merge: true }
                 );
               } catch (e) {
                 console.error(`Failed to merge ${col} item`, item.id, e);
               }
             }
           }
           // Save settings
           if (importedData.settings) {
             await setDoc(
               doc(db, 'artifacts', appId, 'users', user.uid, 'album_tasks', 'settings'),
               mergedData.settings,
               { merge: true }
             );
           }
         } else {
           // Local mode
           setData(prev => ({
             ...prev,
             ...mergedData
           }));
         }
       }
       
       // Log the import action
       actions.logAudit('import', 'system', 'data-import', { 
         mode: importMode,
         importedAt: new Date().toISOString()
       });
       
       return { success: true, mode: importMode };
     },

     // Get export data payload with metadata
     getExportPayload: () => {
       const collections = [
         'tasks', 'photos', 'files', 'vendors', 'teamMembers', 'misc',
         'events', 'stages', 'eras', 'tags', 'songs', 'globalTasks',
         'releases', 'standaloneVideos', 'templates', 'auditLog',
         'expenses', 'taskCategories'
       ];
       
       const payload = {
         exportVersion: EXPORT_VERSION,
         appVersion: APP_VERSION,
         exportedAt: new Date().toISOString(),
         mode: mode,
         settings: data.settings
       };
       
       collections.forEach(col => {
         payload[col] = data[col] || [];
       });
       
       return payload;
     }
  };

  const mods = data.settings?.mods || [];

  return (
    <StoreContext.Provider value={{ data, actions, mode, stats, mods }}>
      {children}
    </StoreContext.Provider>
  );
};