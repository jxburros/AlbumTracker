# Standardized Architecture for Album Tracker

This document outlines the architectural design for standardizing Page and Item components across the Album Tracker application. The goal is to eliminate duplicate code while maintaining flexibility for item-type-specific customizations.

---

## 1. Overview

### Problem Statement
Currently, each Page and Item type has its own implementation with duplicated code for:
- Grid/List toggle and sorting
- Filter controls
- Add new item button
- Item card/row display
- Task list display and editing
- Era/Stage/Tags pickers

### Solution
Create standardized components that can render any item type with minimal configuration, while allowing customization through a well-defined API.

---

## 2. Standardized Component Architecture

### 2.1 StandardListPage

A generic list page component that renders any item type's list view.

```jsx
/**
 * StandardListPage - Renders a list/grid view for any item type
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.title - Page title (e.g., "Songs", "Releases")
 * @param {string} config.itemType - Type identifier (e.g., "song", "release", "video")
 * @param {Array} config.items - Array of items to display
 * @param {Function} config.onSelectItem - Callback when item is selected
 * @param {Function} config.onAddItem - Callback to add new item
 * @param {Array} config.sortOptions - Available sort fields [{field, label}]
 * @param {Array} config.filterOptions - Available filter options [{field, label, options}]
 * @param {Function} config.getItemProgress - Optional function to calculate item progress
 * @param {Function} config.getItemPrimaryDate - Optional function to get item's primary date
 * @param {Function} config.getItemCost - Optional function to get item's cost
 * @param {Object} config.columns - Column configuration for list view
 * @param {Object} config.cardConfig - Configuration for grid card display
 * @param {React.Component} config.CustomFilters - Optional custom filter component
 */
export const StandardListPage = ({ config }) => {
  const { data } = useStore();
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState(config.sortOptions?.[0]?.field || 'name');
  const [sortDir, setSortDir] = useState('asc');
  const [filters, setFilters] = useState({});

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...config.items];
    
    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value && value !== 'all') {
        result = result.filter(item => item[field] === value);
      }
    });
    
    // Apply sorting
    result.sort((a, b) => {
      const valA = a[sortBy] || '';
      const valB = b[sortBy] || '';
      return sortDir === 'asc' 
        ? (valA < valB ? -1 : valA > valB ? 1 : 0)
        : (valA > valB ? -1 : valA < valB ? 1 : 0);
    });
    
    return result;
  }, [config.items, filters, sortBy, sortDir]);

  return (
    <div className="p-6 pb-24">
      {/* Header with title and controls */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={cn(THEME.punk.textStyle, "punk-accent-underline text-2xl")}>
          {config.title}
        </h2>
        <div className="flex flex-wrap gap-2">
          {/* View Toggle */}
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          
          {/* Filter Controls */}
          {config.filterOptions?.map(filter => (
            <select
              key={filter.field}
              value={filters[filter.field] || 'all'}
              onChange={e => setFilters(prev => ({ ...prev, [filter.field]: e.target.value }))}
              className={cn("px-3 py-2", THEME.punk.input)}
            >
              <option value="all">{filter.label}</option>
              {filter.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ))}
          
          {/* Custom Filters */}
          {config.CustomFilters && <config.CustomFilters filters={filters} setFilters={setFilters} />}
          
          {/* Add Button */}
          <button onClick={config.onAddItem} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>
            + Add {config.title.replace(/s$/, '')}
          </button>
        </div>
      </div>

      {/* Content - Grid or List View */}
      {viewMode === 'grid' ? (
        <StandardGridView 
          items={filteredItems}
          onSelect={config.onSelectItem}
          cardConfig={config.cardConfig}
          getProgress={config.getItemProgress}
          getCost={config.getItemCost}
        />
      ) : (
        <StandardListView
          items={filteredItems}
          onSelect={config.onSelectItem}
          columns={config.columns}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={(field) => {
            if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
            else { setSortBy(field); setSortDir('asc'); }
          }}
          getProgress={config.getItemProgress}
          getCost={config.getItemCost}
        />
      )}
    </div>
  );
};
```

**Usage Example:**
```jsx
// In SpecViews.jsx
export const SongListView = ({ onSelectSong }) => {
  const { data, actions } = useStore();
  
  return (
    <StandardListPage
      config={{
        title: 'Songs',
        itemType: 'song',
        items: data.songs || [],
        onSelectItem: onSelectSong,
        onAddItem: () => actions.addSong({ title: 'New Song' }),
        sortOptions: [
          { field: 'title', label: 'Title' },
          { field: 'releaseDate', label: 'Release Date' },
          { field: 'estimatedCost', label: 'Cost' }
        ],
        filterOptions: [
          { field: 'category', label: 'All Categories', options: SONG_CATEGORIES.map(c => ({ value: c, label: c })) }
        ],
        columns: [
          { field: 'title', label: 'Title', sortable: true },
          { field: 'category', label: 'Category', sortable: true },
          { field: 'releaseDate', label: 'Release Date', sortable: true },
          { field: 'isSingle', label: 'Single?', type: 'boolean' },
          { field: 'progress', label: 'Progress', type: 'progress' },
          { field: 'estimatedCost', label: 'Est. Cost', type: 'currency', sortable: true }
        ],
        cardConfig: {
          titleField: 'title',
          dateField: 'releaseDate',
          badges: [
            { condition: (item) => item.isSingle, label: 'SINGLE', className: 'bg-pink-200 text-pink-800' },
            { condition: (item) => item.stemsNeeded, label: 'STEMS', className: 'bg-blue-200 text-blue-800' }
          ]
        },
        getItemProgress: (song) => calculateTaskProgress([...(song.deadlines || []), ...(song.customTasks || [])]).progress,
        getItemCost: (song) => song.estimatedCost || 0
      }}
    />
  );
};
```

---

### 2.2 StandardDetailPage

A generic detail/edit page component for any item type.

```jsx
/**
 * StandardDetailPage - Renders a detail/edit view for any item type
 * 
 * @param {Object} config - Configuration object
 * @param {Object} config.item - The item being edited
 * @param {string} config.itemType - Type identifier (e.g., "song", "release")
 * @param {Function} config.onBack - Callback to navigate back
 * @param {Function} config.onSave - Callback to save changes
 * @param {Function} config.onDelete - Callback to delete item
 * @param {Array} config.sections - Array of section configurations
 * @param {boolean} config.showDisplaySection - Whether to show read-only display section
 * @param {Object} config.displayFields - Fields to show in display section
 * @param {boolean} config.showTasksSection - Whether to show tasks section
 * @param {Array} config.tasks - Tasks for this item (auto-generated + custom)
 * @param {Function} config.onAddTask - Callback to add custom task
 * @param {Function} config.onUpdateTask - Callback to update task
 * @param {Function} config.onDeleteTask - Callback to delete task
 */
export const StandardDetailPage = ({ config }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...config.item });
  const [editingTask, setEditingTask] = useState(null);

  const handleFieldChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    await config.onSave(config.item.id, form);
  }, [config, form]);

  return (
    <div className="p-6 pb-24">
      {/* Header with back and delete buttons */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={config.onBack} className={cn("px-4 py-2 bg-white flex items-center gap-2", THEME.punk.btn)}>
          <Icon name="ChevronLeft" size={16} /> Back
        </button>
        <button onClick={() => config.onDelete(config.item.id)} className={cn("px-4 py-2", THEME.punk.btn, "bg-red-500 text-white")}>
          <Icon name="Trash2" size={16} />
        </button>
      </div>

      {/* Display Section (read-only) */}
      {config.showDisplaySection && (
        <DisplayInfoSection 
          item={config.item} 
          fields={config.displayFields}
          itemType={config.itemType}
        />
      )}

      {/* Editable Sections */}
      {config.sections.map((section, idx) => (
        <EditableSection
          key={idx}
          title={section.title}
          fields={section.fields}
          form={form}
          onChange={handleFieldChange}
          onBlur={handleSave}
          data={data}
          actions={actions}
        />
      ))}

      {/* Tasks Section */}
      {config.showTasksSection && (
        <StandardTaskList
          tasks={config.tasks}
          onAddTask={config.onAddTask}
          onUpdateTask={config.onUpdateTask}
          onDeleteTask={config.onDeleteTask}
          parentType={config.itemType}
          parentId={config.item.id}
        />
      )}

      {/* Task Edit Modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onSave={(task) => { config.onUpdateTask(task); setEditingTask(null); }}
          onClose={() => setEditingTask(null)}
          onDelete={() => { config.onDeleteTask(editingTask.id); setEditingTask(null); }}
        />
      )}
    </div>
  );
};
```

---

### 2.3 StandardTaskList

A consistent task list component for all item types.

```jsx
/**
 * StandardTaskList - Displays and manages tasks for any parent item
 * 
 * @param {Array} tasks - Array of tasks (auto + custom)
 * @param {Function} onAddTask - Callback to add new task
 * @param {Function} onUpdateTask - Callback to update task
 * @param {Function} onDeleteTask - Callback to delete task
 * @param {string} parentType - Parent item type
 * @param {string} parentId - Parent item ID
 * @param {boolean} showLegend - Whether to show auto/custom task legend
 */
export const StandardTaskList = ({ 
  tasks, 
  onAddTask, 
  onUpdateTask, 
  onDeleteTask,
  parentType,
  parentId,
  showLegend = true
}) => {
  const { data } = useStore();
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingTask, setEditingTask] = useState(null);

  // Combine and mark auto vs custom tasks
  const allTasks = useMemo(() => {
    return tasks.map(task => ({
      ...task,
      _isAuto: task.isAutoTask ?? !task.isCustom ?? task.generatedFromInstrument != null
    }));
  }, [tasks]);

  // Filter and sort
  const filteredTasks = useMemo(() => {
    let result = [...allTasks];
    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }
    result.sort((a, b) => {
      const valA = a[sortBy] || '';
      const valB = b[sortBy] || '';
      return sortDir === 'asc' 
        ? (valA < valB ? -1 : valA > valB ? 1 : 0)
        : (valA > valB ? -1 : valA < valB ? 1 : 0);
    });
    return result;
  }, [allTasks, filterStatus, sortBy, sortDir]);

  return (
    <div className={cn("p-6 mb-6", THEME.punk.card)}>
      <div className="flex flex-wrap justify-between items-center mb-4 border-b-4 border-black pb-2 gap-2">
        <h3 className="font-black uppercase">Tasks</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)} 
            className={cn("px-2 py-1 text-xs", THEME.punk.input)}
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)} 
            className={cn("px-2 py-1 text-xs", THEME.punk.input)}
          >
            <option value="date">Sort by Date</option>
            <option value="type">Sort by Type</option>
            <option value="status">Sort by Status</option>
          </select>
          <button 
            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')} 
            className={cn("px-2 py-1 text-xs", THEME.punk.btn)}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
          <button 
            onClick={() => setEditingTask({ _isNew: true, status: 'Not Started' })}
            className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-green-600 text-white")}
          >
            + Add Task
          </button>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-2 mb-3 text-[10px] font-bold">
          <span className="px-2 py-1 bg-yellow-100 border-2 border-black">Auto Task</span>
          <span className="px-2 py-1 bg-green-100 border-2 border-black">Custom Task</span>
        </div>
      )}

      {/* Task Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black">
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Task</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-4 text-center opacity-50">
                  No tasks yet. Add a custom task.
                </td>
              </tr>
            ) : (
              filteredTasks.map(task => {
                const isOverdue = task.date && new Date(task.date) < new Date() && 
                  task.status !== 'Complete' && task.status !== 'Done';
                return (
                  <tr 
                    key={task.id} 
                    className={cn(
                      "border-b border-gray-200 cursor-pointer hover:bg-gray-50",
                      isOverdue ? "bg-red-50" : task._isAuto ? "bg-yellow-50" : "bg-green-50"
                    )}
                    onClick={() => setEditingTask(task)}
                  >
                    <td className="p-2">
                      <span className={cn(
                        "px-2 py-1 text-xs font-bold border border-black",
                        task._isAuto ? "bg-yellow-200" : "bg-green-200"
                      )}>
                        {task._isAuto ? 'Auto' : 'Custom'}
                      </span>
                    </td>
                    <td className="p-2 font-bold">{task.type || task.title}</td>
                    <td className="p-2">
                      <span className={cn("text-xs", isOverdue && "text-red-600 font-bold")}>
                        {task.date || '-'}
                      </span>
                      {isOverdue && (
                        <span className="ml-2 px-1 py-0.5 bg-red-200 border border-red-500 text-red-800 text-[10px] font-bold">
                          OVERDUE
                        </span>
                      )}
                    </td>
                    <td className="p-2" onClick={e => e.stopPropagation()}>
                      <select 
                        value={task.status || 'Not Started'} 
                        onChange={e => onUpdateTask(task.id, { status: e.target.value })}
                        className="border-2 border-black p-1 text-xs"
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Task Edit Modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onSave={(taskData) => {
            if (editingTask._isNew) {
              onAddTask(taskData);
            } else {
              onUpdateTask(editingTask.id, taskData);
            }
            setEditingTask(null);
          }}
          onClose={() => setEditingTask(null)}
          onDelete={editingTask._isNew ? null : () => {
            onDeleteTask(editingTask.id);
            setEditingTask(null);
          }}
          teamMembers={data.teamMembers || []}
          eras={data.eras || []}
          stages={data.stages || []}
          tags={data.tags || []}
        />
      )}
    </div>
  );
};
```

---

### 2.4 EraStageTagsPicker

A unified component combining Era, Stage, and Tags pickers.

```jsx
/**
 * EraStageTagsPicker - Unified component for Era, Stage, and Tags selection
 * 
 * @param {Object} value - Current values { eraIds, stageIds, tagIds }
 * @param {Function} onChange - Callback with { eraIds, stageIds, tagIds }
 * @param {boolean} multipleEras - Allow multiple era selection
 * @param {boolean} multipleStages - Allow multiple stage selection
 * @param {string} layout - 'horizontal' | 'vertical' | 'grid'
 * @param {boolean} showPropagateButton - Show button to propagate to children
 * @param {Function} onPropagate - Callback when propagate is clicked
 * @param {boolean} compact - Use compact styling
 */
export const EraStageTagsPicker = ({
  value = {},
  onChange,
  multipleEras = false,
  multipleStages = false,
  layout = 'grid',
  showPropagateButton = false,
  onPropagate,
  compact = false
}) => {
  const { data, actions } = useStore();
  
  const handleEraChange = (newEraIds) => {
    onChange({ ...value, eraIds: newEraIds });
  };
  
  const handleStageChange = (newStageIds) => {
    onChange({ ...value, stageIds: newStageIds });
  };
  
  const handleTagsChange = (newTagIds) => {
    onChange({ ...value, tagIds: newTagIds });
  };

  const containerClass = layout === 'horizontal' 
    ? 'flex flex-wrap gap-4 items-start'
    : layout === 'vertical' 
      ? 'space-y-4' 
      : 'grid md:grid-cols-3 gap-4';

  return (
    <div className={containerClass}>
      {/* Era Picker */}
      <div className={compact ? '' : 'flex-1 min-w-[200px]'}>
        <label className="block text-xs font-bold uppercase mb-1">Era</label>
        <div className={showPropagateButton ? 'flex gap-2' : ''}>
          <div className="flex-1">
            <UniversalEraPicker
              value={value.eraIds || []}
              onChange={handleEraChange}
              eras={data.eras || []}
              multiple={multipleEras}
              placeholder="No Era"
            />
          </div>
          {showPropagateButton && onPropagate && (
            <button 
              onClick={() => onPropagate('era', value.eraIds)}
              className={cn("px-3 py-2 text-xs", THEME.punk.btn, "bg-purple-500 text-white")}
              title="Apply to all child tasks"
            >
              Propagate
            </button>
          )}
        </div>
      </div>

      {/* Stage Picker */}
      <div className={compact ? '' : 'flex-1 min-w-[200px]'}>
        <label className="block text-xs font-bold uppercase mb-1">Stage</label>
        <UniversalStagePicker
          value={value.stageIds || []}
          onChange={handleStageChange}
          stages={data.stages || []}
          multiple={multipleStages}
          placeholder="No Stage"
        />
      </div>

      {/* Tags Picker */}
      <div className={compact ? '' : 'flex-1 min-w-[200px]'}>
        <label className="block text-xs font-bold uppercase mb-1">Tags</label>
        <UniversalTagsPicker
          value={value.tagIds || []}
          onChange={handleTagsChange}
          tags={data.tags || []}
          onCreateTag={actions.addTag}
          placeholder="Add tag..."
        />
      </div>
    </div>
  );
};
```

---

### 2.5 TaskEditModal

A consistent modal for editing tasks across all contexts.

```jsx
/**
 * TaskEditModal - Unified task editing modal
 * 
 * @param {Object} task - Task being edited (or empty for new)
 * @param {Function} onSave - Callback with task data
 * @param {Function} onClose - Callback to close modal
 * @param {Function} onDelete - Callback to delete (null for new tasks)
 * @param {Array} teamMembers - Available team members
 * @param {Array} eras - Available eras
 * @param {Array} stages - Available stages
 * @param {Array} tags - Available tags
 */
export const TaskEditModal = ({
  task,
  onSave,
  onClose,
  onDelete,
  teamMembers = [],
  eras = [],
  stages = [],
  tags = []
}) => {
  const [form, setForm] = useState({ ...task });
  const isNew = task._isNew;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave({
      ...form,
      title: form.title || form.type || 'New Task',
      type: form.type || form.title || 'Custom',
      date: form.date || form.dueDate || '',
      dueDate: form.date || form.dueDate || '',
      status: form.status || 'Not Started',
      isAutoTask: false
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
      onClick={onClose}
    >
      <div 
        className={cn("bg-white p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto", THEME.punk.card)} 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">
            {isNew ? 'Add Task' : 'Edit Task'}
          </h3>
          <button onClick={onClose} className="text-2xl font-bold">×</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Task Name */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Task Name</label>
            <input 
              value={form.title || form.type || ''} 
              onChange={e => handleChange('title', e.target.value)}
              className={cn("w-full", THEME.punk.input)}
              disabled={form._isAuto && !isNew}
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Due Date</label>
            <input 
              type="date" 
              value={form.date || form.dueDate || ''} 
              onChange={e => handleChange('date', e.target.value)}
              className={cn("w-full", THEME.punk.input)}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Status</label>
            <select 
              value={form.status || 'Not Started'} 
              onChange={e => handleChange('status', e.target.value)}
              className={cn("w-full", THEME.punk.input)}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Era/Stage/Tags - using unified picker */}
          <div className="md:col-span-2">
            <EraStageTagsPicker
              value={{
                eraIds: form.eraIds || [],
                stageIds: form.stageIds || [],
                tagIds: form.tagIds || []
              }}
              onChange={({ eraIds, stageIds, tagIds }) => {
                setForm(prev => ({ ...prev, eraIds, stageIds, tagIds }));
              }}
              compact
            />
          </div>

          {/* Cost Fields */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Estimated Cost</label>
            <input 
              type="number" 
              value={form.estimatedCost || 0} 
              onChange={e => handleChange('estimatedCost', parseFloat(e.target.value) || 0)}
              className={cn("w-full", THEME.punk.input)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Quoted Cost</label>
            <input 
              type="number" 
              value={form.quotedCost || 0} 
              onChange={e => handleChange('quotedCost', parseFloat(e.target.value) || 0)}
              className={cn("w-full", THEME.punk.input)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Paid Cost</label>
            <input 
              type="number" 
              value={form.paidCost || 0} 
              onChange={e => handleChange('paidCost', parseFloat(e.target.value) || 0)}
              className={cn("w-full", THEME.punk.input)}
            />
          </div>

          {/* Team Members */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Team Members</label>
            <div className="flex flex-wrap gap-1 p-1 border-4 border-black bg-white text-xs max-h-20 overflow-y-auto">
              {teamMembers.map(m => (
                <label key={m.id} className="flex items-center gap-1 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={(form.teamMemberIds || []).includes(m.id)}
                    onChange={e => {
                      const ids = e.target.checked 
                        ? [...(form.teamMemberIds || []), m.id]
                        : (form.teamMemberIds || []).filter(id => id !== m.id);
                      handleChange('teamMemberIds', ids);
                    }}
                    className="w-3 h-3"
                  />
                  {m.name}
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
            <textarea 
              value={form.notes || form.description || ''} 
              onChange={e => handleChange('notes', e.target.value)}
              className={cn("w-full h-24", THEME.punk.input)}
              placeholder="Task notes..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t-2 border-gray-200">
          <button onClick={onClose} className={cn("px-4 py-2", THEME.punk.btn)}>
            Cancel
          </button>
          {onDelete && (
            <button onClick={onDelete} className={cn("px-4 py-2", THEME.punk.btn, "bg-red-500 text-white")}>
              Delete
            </button>
          )}
          <button onClick={handleSave} className={cn("px-4 py-2", THEME.punk.btn, "bg-green-600 text-white")}>
            {isNew ? 'Add Task' : 'Save Task'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 3. Helper Components

### 3.1 ViewModeToggle
```jsx
export const ViewModeToggle = ({ viewMode, setViewMode }) => (
  <div className="flex border-4 border-black">
    <button 
      onClick={() => setViewMode('list')} 
      className={cn("px-3 py-2 font-bold text-xs", viewMode === 'list' ? "bg-black text-white" : "bg-white")}
      title="List View"
    >
      <Icon name="List" size={16} />
    </button>
    <button 
      onClick={() => setViewMode('grid')} 
      className={cn("px-3 py-2 font-bold text-xs border-l-4 border-black", viewMode === 'grid' ? "bg-black text-white" : "bg-white")}
      title="Grid View"
    >
      <Icon name="Grid" size={16} />
    </button>
  </div>
);
```

### 3.2 DisplayInfoSection
```jsx
export const DisplayInfoSection = ({ item, fields, itemType }) => (
  <div className={cn("p-6 mb-6 bg-gray-50", THEME.punk.card)}>
    <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Display Information</h3>
    <div className="text-2xl font-black mb-4 pb-2 border-b-2 border-gray-300">
      {item.name || item.title || 'Untitled'}
    </div>
    <div className="grid md:grid-cols-4 gap-4">
      {fields.map(field => (
        <div key={field.key}>
          <label className="block text-xs font-bold uppercase mb-2">{field.label}</label>
          <div className={cn("px-3 py-2 border-2 border-black text-sm font-bold", field.bgClass || "bg-gray-100")}>
            {field.render ? field.render(item) : (item[field.key] || field.default || '-')}
          </div>
        </div>
      ))}
    </div>
  </div>
);
```

---

## 4. Integration with Store.jsx

The standardized components work seamlessly with the existing Store.jsx patterns:

### 4.1 Item Type Configuration
```javascript
// Define in Store.jsx or a separate config file
export const ITEM_TYPE_CONFIG = {
  song: {
    collection: 'songs',
    nameField: 'title',
    dateField: 'releaseDate',
    taskCollections: ['deadlines', 'customTasks'],
    addAction: 'addSong',
    updateAction: 'updateSong',
    deleteAction: 'deleteSong'
  },
  release: {
    collection: 'releases',
    nameField: 'name',
    dateField: 'releaseDate',
    taskCollections: ['tasks', 'customTasks'],
    addAction: 'addRelease',
    updateAction: 'updateRelease',
    deleteAction: 'deleteRelease'
  },
  video: {
    collection: 'standaloneVideos',
    nameField: 'title',
    dateField: 'releaseDate',
    taskCollections: ['tasks', 'customTasks'],
    addAction: 'addStandaloneVideo',
    updateAction: 'updateStandaloneVideo',
    deleteAction: 'deleteStandaloneVideo'
  },
  event: {
    collection: 'events',
    nameField: 'title',
    dateField: 'date',
    taskCollections: ['tasks', 'customTasks'],
    addAction: 'addEvent',
    updateAction: 'updateEvent',
    deleteAction: 'deleteEvent'
  },
  globalTask: {
    collection: 'globalTasks',
    nameField: 'taskName',
    dateField: 'date',
    taskCollections: [],
    addAction: 'addGlobalTask',
    updateAction: 'updateGlobalTask',
    deleteAction: 'deleteGlobalTask'
  },
  expense: {
    collection: 'expenses',
    nameField: 'name',
    dateField: 'date',
    taskCollections: [],
    addAction: 'addExpense',
    updateAction: 'updateExpense',
    deleteAction: 'deleteExpense'
  }
};
```

### 4.2 Helper Functions
```javascript
// In Store.jsx
export const getItemTasks = (item, itemType) => {
  const config = ITEM_TYPE_CONFIG[itemType];
  if (!config) return [];
  
  return config.taskCollections.flatMap(collection => item[collection] || []);
};

export const getItemProgress = (item, itemType) => {
  const tasks = getItemTasks(item, itemType);
  return calculateTaskProgress(tasks);
};
```

---

## 5. Migration Path

### Phase 1: Create New Components (Non-Breaking)
1. Add `StandardListPage`, `StandardDetailPage`, `StandardTaskList` to ItemComponents.jsx
2. Add `EraStageTagsPicker`, `TaskEditModal` to ItemComponents.jsx
3. Add helper components (`ViewModeToggle`, `DisplayInfoSection`)

### Phase 2: Migrate One View (Pilot)
1. Start with `ExpensesListView` and `ExpenseDetailView` (simplest)
2. Validate the pattern works
3. Gather feedback and refine

### Phase 3: Migrate Remaining Views
1. GlobalTasksListView / GlobalTaskDetailView
2. EventsListView / EventDetailView
3. VideosListView / VideoDetailView
4. ReleasesListView / ReleaseDetailView
5. SongListView / SongDetailView (most complex, last)

### Phase 4: Remove Deprecated Code
1. Remove duplicate implementations once all views use standard components
2. Update documentation

---

## 6. Benefits

1. **Consistency**: All pages look and behave identically
2. **Maintainability**: Fix bugs and add features in one place
3. **Reduced Code**: ~60% reduction in view-related code
4. **Type Safety**: Centralized configuration prevents errors
5. **Testing**: Test once, covers all item types
6. **Extensibility**: Add new item types with minimal code

---

## 7. File Organization

```
src/
├── ItemComponents.jsx
│   ├── StandardListPage
│   ├── StandardDetailPage
│   ├── StandardTaskList
│   ├── EraStageTagsPicker
│   ├── TaskEditModal
│   ├── ViewModeToggle
│   ├── DisplayInfoSection
│   ├── StandardGridView
│   ├── StandardListView
│   ├── ItemCard (existing)
│   ├── ItemRow (existing)
│   ├── UniversalTagsPicker (existing)
│   ├── UniversalEraPicker (existing)
│   └── UniversalStagePicker (existing)
├── SpecViews.jsx
│   ├── SongListView (uses StandardListPage)
│   ├── SongDetailView (uses StandardDetailPage)
│   ├── ReleaseListView (uses StandardListPage)
│   └── ... etc
└── Store.jsx
    ├── ITEM_TYPE_CONFIG
    ├── getItemTasks()
    └── getItemProgress()
```

---

## 8. Example: Complete Implementation

See the companion file `STANDARDIZED_COMPONENTS_IMPL.md` for full component implementations ready for copy-paste into the codebase.

---

*Last Updated: 2025-12-01*
