# Data Export/Import Compatibility Guide

This document describes the data export format used by Album Tracker and provides guidance for maintaining backwards compatibility across versions.

---

## 1. Export Format Overview

The application uses a **JSON export format** for data portability and backup.

### Export File Structure

```json
{
  "exportVersion": "1.0.0",
  "appVersion": "2.0.0",
  "exportedAt": "2025-12-02T03:59:14.096Z",
  "mode": "local",
  "settings": { ... },
  "songs": [ ... ],
  "releases": [ ... ],
  "events": [ ... ],
  ...
}
```

### Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `exportVersion` | string | Format version for compatibility checks (currently `"1.0.0"`) |
| `appVersion` | string | Application version that created the export (currently `"2.0.0"`) |
| `exportedAt` | string | ISO 8601 timestamp of when the export was created |
| `mode` | string | Storage mode at time of export (`"local"` or `"cloud"`) |

---

## 2. Data Schema - Constants That Cannot Change

The following field names and structures **MUST remain consistent** across versions to ensure data can be imported successfully.

### Top-Level Metadata Fields

These fields are required for compatibility checking:

```javascript
{
  exportVersion: string,  // Required - format version
  appVersion: string,     // Required - app version that created export
  exportedAt: string,     // Required - ISO timestamp
}
```

### Data Collections

All exports include these collections:

| Collection | Description |
|------------|-------------|
| `songs` | Songs with versions, videos, and tasks |
| `releases` | Albums, EPs, singles, and other release types |
| `events` | Calendar events with tasks |
| `globalTasks` | Tasks not tied to specific content |
| `expenses` | Standalone expense items |
| `teamMembers` | Collaborators and musicians |
| `eras` | Project eras/periods |
| `stages` | Production stages |
| `tags` | User-defined tags |
| `photos` | Photo gallery items |
| `files` | Uploaded files |
| `standaloneVideos` | Videos not attached to songs |
| `templates` | Reusable templates |
| `settings` | User preferences and configuration |
| `tasks` | Legacy task collection |
| `misc` | Legacy miscellaneous expenses |
| `vendors` | Legacy vendor/company records |
| `auditLog` | Action history (capped at 200 entries) |
| `taskCategories` | Global task category definitions |

---

## 3. Entity ID Schema

### ID Format

All entities use a **UUID format** generated via `crypto.randomUUID()`:

```javascript
id: crypto.randomUUID()  // e.g., "550e8400-e29b-41d4-a716-446655440000"
```

### ID Preservation

**IDs must be preserved during import** to maintain entity relationships. The import process should:

1. Use the original `id` from the export file
2. Not regenerate new IDs
3. Preserve all relationship references

### Relationship Fields

Entities use specific ID fields to reference other entities:

#### Song Relationships
```javascript
{
  coreReleaseId: string | null,     // Single release ID (core release)
  coreReleaseIds: string[],         // Multiple core release IDs
}
```

#### Version/Video Relationships
```javascript
{
  releaseIds: string[],             // Releases this version belongs to
  attachedReleaseIds: string[],     // Releases this video is attached to
}
```

#### Task Relationships
```javascript
{
  parentId: string | null,          // Parent entity ID (legacy)
  parentItemId: string | null,      // Parent entity ID (legacy alias)
  parent_item_id: string | null,    // Parent entity ID (unified schema)
}
```

#### Team Member Relationships
```javascript
{
  teamMemberIds: string[],          // Array of team member IDs
  assignedMembers: [                // Detailed assignment objects
    { memberId: string, ... }
  ]
}
```

---

## 4. Backwards Compatibility Strategy

The application maintains backwards compatibility by supporting **both old and new field names** for key properties.

### Dual Field Name Support

The `Store.jsx` uses both camelCase and underscore_case aliases for many fields:

```javascript
// Primary (underscore_case) and legacy (camelCase) field names
{
  // Primary field          // Legacy alias
  primary_date:             primaryDate,
  era_ids:                  eraIds,
  tag_ids:                  tagIds,
  stage_ids:                stageIds,
  team_member_ids:          teamMemberIds,
  estimated_cost:           estimatedCost,
  quoted_cost:              quotedCost,
  amount_paid:              paidCost,
  due_date:                 dueDate,
  parent_item_id:           parentId,
}
```

### Normalization Functions

The application uses normalization functions to convert legacy data to the unified format:

#### `normalizeToUnifiedItem(item, itemType)`

Converts any existing Item to the unified format:

```javascript
// Handles multiple field name variations
name: item.name || item.title || item.taskName || ''
primary_date: item.primary_date || item.primaryDate || item.releaseDate || item.date || ''
era_ids: item.era_ids || item.eraIds || []
```

#### `normalizeToUnifiedTask(task, parentType)`

Converts any existing Task to the unified format:

```javascript
// Handles parent ID variations
parent_item_id: task.parent_item_id || task.parentItemId || task.parentId || null

// Handles team member assignment variations
team_member_ids: task.team_member_ids || task.teamMemberIds || extractMemberIds(assignedMembers)
```

### Schema Factory Functions

The `createUnifiedItem` and `createUnifiedTask` factories accept both field naming conventions:

```javascript
// Both of these work:
createUnifiedItem({ eraIds: ['era1'] })
createUnifiedItem({ era_ids: ['era1'] })
```

---

## 5. Adding New Fields Safely

When adding new fields to the schema, follow these guidelines:

### 1. Use Default Values

New fields should have sensible defaults so older exports work:

```javascript
// Good - has fallback default
newField: overrides.newField || ''

// Good - supports null/undefined
optionalCount: overrides.optionalCount ?? 0
```

### 2. Use Nullish Coalescing

For numeric fields, use `??` to distinguish between `0` and `undefined`:

```javascript
// Correct - allows 0 as a valid value
estimated_cost: overrides.estimated_cost ?? overrides.estimatedCost ?? 0

// Incorrect - treats 0 as falsy
estimated_cost: overrides.estimated_cost || overrides.estimatedCost || 0
```

### 3. Never Remove Existing Fields

Only add new fields. Never remove or rename existing fields without providing:

1. A migration function for the old field name
2. Support for reading both old and new field names

### 4. Test Older Exports

Always verify that older export files can be imported after changes:

```javascript
// Example: importing older data with missing fields
const legacyData = {
  songs: [{ id: '123', name: 'My Song' }]  // Missing new fields
};

// Should work - new fields get defaults
actions.importData(legacyData, 'merge');
```

---

## 6. Version Migration Guide

When making breaking changes that require data transformation, implement version-aware migrations.

### Migration Strategy

1. **Check `exportVersion`** on import
2. **Apply sequential migrations** from old version to current
3. **Keep old migration functions** for chain upgrades (1.0 → 2.0 → 3.0)

### Migration Function Skeleton

```javascript
// Example migration handler
const migrateExportData = (data) => {
  let migratedData = { ...data };
  const version = data.exportVersion || '0.0.0';

  // Migration from 1.0.0 to 2.0.0
  if (compareVersions(version, '2.0.0') < 0) {
    migratedData = migrate_v1_to_v2(migratedData);
    migratedData.exportVersion = '2.0.0';
  }

  // Migration from 2.0.0 to 3.0.0
  if (compareVersions(version, '3.0.0') < 0) {
    migratedData = migrate_v2_to_v3(migratedData);
    migratedData.exportVersion = '3.0.0';
  }

  return migratedData;
};

// Example specific migration
const migrate_v1_to_v2 = (data) => {
  // Transform songs to new schema
  const songs = (data.songs || []).map(song => ({
    ...song,
    // Add new required field with default
    newRequiredField: song.newRequiredField || 'default_value',
    // Rename old field to new field
    newFieldName: song.oldFieldName,
  }));

  return { ...data, songs };
};
```

### Version Comparison Helper

```javascript
const compareVersions = (v1, v2) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if ((parts1[i] || 0) < (parts2[i] || 0)) return -1;
    if ((parts1[i] || 0) > (parts2[i] || 0)) return 1;
  }
  return 0;
};
```

---

## 7. Code References

Key code locations for export/import functionality:

### Version Constants

```javascript
// src/Store.jsx (lines 11-12)
export const EXPORT_VERSION = '1.0.0';
export const APP_VERSION = '2.0.0';
```

### Export Payload Generation

```javascript
// src/Store.jsx - getExportPayload()
// Returns complete data with metadata for export
```

### Import Logic

```javascript
// src/Store.jsx - importData(importedData, importMode)
// Modes: 'replace' (clear and replace) or 'merge' (add/update)
```

### Schema Factories

```javascript
// src/Store.jsx
export const createUnifiedItem = (overrides = {}) => ({ ... })
export const createUnifiedTask = (overrides = {}) => ({ ... })
```

### Normalization Functions

```javascript
// src/Store.jsx
export const normalizeToUnifiedItem = (item, itemType) => ({ ... })
export const normalizeToUnifiedTask = (task, parentType) => ({ ... })
```

---

## 8. Testing Compatibility

### Pre-Release Checklist

Before major app updates:

1. ✅ Export data from the current version
2. ✅ Apply the update
3. ✅ Import the exported data
4. ✅ Verify all entities load correctly
5. ✅ Check relationships are preserved
6. ✅ Confirm costs and dates are accurate

### Regression Testing

Maintain sample export files from each major version:

```
/test-exports/
├── export-v1.0.0.json
├── export-v1.1.0.json
└── export-v2.0.0.json
```

After code changes, import each sample file and verify:

- No console errors during import
- All collections populate correctly
- Entity relationships work (e.g., song→release links)
- Calculated fields display properly

### Export Before Updates

**Recommendation:** Always export your data before updating to a new app version. This provides a recovery point if issues occur.

---

## 9. Import Modes

The `importData` function supports two modes:

### Replace Mode

```javascript
actions.importData(exportedData, 'replace')
```

- Clears all existing data
- Replaces with imported data
- Settings are merged (not replaced entirely)

### Merge Mode

```javascript
actions.importData(exportedData, 'merge')
```

- Keeps existing data
- Adds new items from import
- Updates existing items if IDs match (import values win)
- Safer for partial data recovery

---

## 10. Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Preserve IDs** | Never regenerate entity IDs during import |
| **Support dual fields** | Read both old and new field names |
| **Use defaults** | New fields must have fallback values |
| **Chain migrations** | Keep old migration code for version jumps |
| **Test imports** | Verify older exports work after changes |
| **Export before update** | Always back up data before major updates |
| **Document changes** | Update this guide when schema changes |

---

*Last updated: 2025-12-02*
