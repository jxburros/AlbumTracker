import { useState, useMemo } from 'react';
import { cn, THEME } from './utils';
import { Icon } from './Components';
import { useStore, STATUS_OPTIONS } from './Store';

// Shared card for songs, versions, videos, releases, and tasks
export const ItemCard = ({ item, onClick }) => (
  <button
      onClick={() => onClick?.(item)}
      className={cn(
        'w-full text-left p-4 flex flex-col gap-3 hover:-translate-y-0.5 transition-transform min-h-[180px] justify-between',
        THEME.punk.card,
        item.accent || ''
      )}
  >
    <div className="flex items-center justify-between gap-2">
      <div className="font-black uppercase text-sm flex-1 truncate">{item.name}</div>
      {item.primaryDate && <span className="text-[11px] font-bold px-2 py-1 border-2 border-black bg-white">{item.primaryDate}</span>}
    </div>
    {item.stage && <div className="text-[11px] font-bold uppercase text-left opacity-70">{item.stage}</div>}
    <div className="flex flex-wrap gap-2 items-center text-[11px]">
      {item.tags?.map(tag => (
        <span key={tag} className="px-2 py-1 bg-yellow-100 border-2 border-black font-bold">{tag}</span>
      ))}
      {item.progressLabel && (
        <span className="px-2 py-1 bg-green-100 border-2 border-black font-bold">{item.progressLabel}</span>
      )}
    </div>
    {item.teamMembers?.length > 0 && (
      <div className="flex flex-wrap gap-2 text-[11px]">
        {item.teamMembers.map(member => (
          <span key={member} className="px-2 py-1 bg-purple-100 border-2 border-black font-bold flex items-center gap-1">
            <Icon name="Users" size={12} /> {member}
          </span>
        ))}
      </div>
    )}
  </button>
);

// List row version of ItemCard
export const ItemRow = ({ item, onClick }) => (
  <div
    className={cn('p-3 grid grid-cols-6 gap-3 items-center border-b border-gray-200 hover:bg-yellow-50 cursor-pointer', item.accent)}
    onClick={() => onClick?.(item)}
  >
    <div className="font-black truncate">{item.name}</div>
    <div className="text-xs font-bold">{item.primaryDate || '-'}</div>
    <div className="text-xs flex flex-wrap gap-1">
      {item.tags?.map(tag => (
        <span key={tag} className="px-2 py-1 bg-gray-100 border border-black text-[10px] font-bold">{tag}</span>
      ))}
    </div>
    <div className="text-xs font-bold">{item.stage || '-'}</div>
    <div className="text-xs font-bold">{item.progressLabel || '-'}</div>
    <div className="flex flex-wrap gap-1 text-[10px]">
      {item.teamMembers?.map(member => (
        <span key={member} className="px-2 py-1 bg-purple-100 border border-black font-bold flex items-center gap-1">
          <Icon name="Users" size={12} /> {member}
        </span>
      ))}
    </div>
  </div>
);

// Timeline entry component to align date/status/progress across entity types
export const ItemTimelineEntry = ({ item, onClick }) => (
  <div
    className={cn(
      'p-3 mb-2 border-2 border-black bg-white flex flex-col gap-2 hover:-translate-y-0.5 transition-transform cursor-pointer',
      item.accent || ''
    )}
    onClick={() => onClick?.(item)}
  >
    <div className="flex items-center justify-between">
      <div className="font-black uppercase text-sm">{item.name}</div>
      <div className="text-xs font-bold px-2 py-1 bg-black text-white">{item.primaryDate || '-'}</div>
    </div>
    <div className="flex flex-wrap gap-2 text-[11px] items-center">
      <span className="px-2 py-1 bg-white border border-black font-bold">{item.source || 'Item'}</span>
      {item.stage && <span className="px-2 py-1 bg-gray-100 border border-black font-bold">{item.stage}</span>}
      {item.progressLabel && <span className="px-2 py-1 bg-green-100 border border-black font-bold">{item.progressLabel}</span>}
      {item.tags?.map(tag => (
        <span key={tag} className="px-2 py-1 bg-yellow-100 border border-black font-bold">{tag}</span>
      ))}
    </div>
    {item.notes && <div className="text-[11px] opacity-80">{item.notes}</div>}
    {item.teamMembers?.length > 0 && (
      <div className="flex flex-wrap gap-1 text-[10px]">
        {item.teamMembers.map(member => (
          <span key={member} className="px-2 py-1 bg-purple-100 border border-black font-bold flex items-center gap-1">
            <Icon name="Users" size={12} /> {member}
          </span>
        ))}
      </div>
    )}
  </div>
);

// Simple detail pane wrapper to provide consistent headings
export const DetailPane = ({ title, children }) => (
  <div className={cn('p-4 mb-4', THEME.punk.card)}>
    <div className="font-black uppercase border-b-4 border-black pb-2 mb-3 flex items-center gap-2">
      <Icon name="Folder" size={14} /> {title}
    </div>
    <div className="space-y-3 text-sm">{children}</div>
  </div>
);

// Universal Tags Picker with autocomplete
// Used across Songs, Versions, Videos, Releases, Events, Global Tasks, etc.
export const UniversalTagsPicker = ({ value = [], onChange, tags = [], onCreateTag, placeholder = 'Add tag...' }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const selectedTags = tags.filter(t => value.includes(t.id));
  const availableTags = tags.filter(t => !value.includes(t.id));
  
  const filteredSuggestions = inputValue.trim() 
    ? availableTags.filter(t => t.name.toLowerCase().includes(inputValue.toLowerCase()))
    : availableTags;
  
  const handleAddTag = (tagId) => {
    if (!value.includes(tagId)) {
      onChange([...value, tagId]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };
  
  const handleRemoveTag = (tagId) => {
    onChange(value.filter(id => id !== tagId));
  };
  
  const handleCreateNew = async () => {
    if (inputValue.trim() && onCreateTag) {
      try {
        const newTag = await onCreateTag({ name: inputValue.trim() });
        if (newTag) {
          onChange([...value, newTag.id]);
        }
      } catch (error) {
        console.error('Failed to create tag:', error);
      }
      setInputValue('');
      setShowSuggestions(false);
    }
  };
  
  const exactMatch = availableTags.some(t => t.name.toLowerCase() === inputValue.toLowerCase());
  
  return (
    <div className="relative">
      {/* Selected tags as pills */}
      <div className="flex flex-wrap gap-1 mb-2 min-h-[28px]">
        {selectedTags.map(tag => (
          <div key={tag.id} className="flex items-center gap-1 px-2 py-1 bg-yellow-100 border-2 border-black text-xs font-bold">
            <span style={{ color: tag.color || '#000' }}>{tag.name}</span>
            <button onClick={() => handleRemoveTag(tag.id)} className="text-gray-600 hover:text-red-600">
              <Icon name="X" size={12} />
            </button>
          </div>
        ))}
      </div>
      
      {/* Input with autocomplete */}
      <input
        type="text"
        value={inputValue}
        onChange={e => { setInputValue(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        className={cn("w-full", THEME.punk.input)}
      />
      
      {/* Suggestions dropdown */}
      {showSuggestions && (inputValue.trim() || availableTags.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-white border-4 border-black max-h-40 overflow-y-auto shadow-lg">
          {filteredSuggestions.map(tag => (
            <button
              key={tag.id}
              onClick={() => handleAddTag(tag.id)}
              className="w-full text-left px-3 py-2 hover:bg-yellow-100 text-sm font-bold flex items-center gap-2"
            >
              <span className="w-3 h-3 border border-black" style={{ backgroundColor: tag.color || '#000' }} />
              {tag.name}
            </button>
          ))}
          {inputValue.trim() && !exactMatch && onCreateTag && (
            <button
              onClick={handleCreateNew}
              className="w-full text-left px-3 py-2 hover:bg-green-100 text-sm font-bold text-green-700 border-t-2 border-black"
            >
              + Create &quot;{inputValue}&quot;
            </button>
          )}
          {filteredSuggestions.length === 0 && !inputValue.trim() && (
            <div className="px-3 py-2 text-xs text-gray-500">No tags available</div>
          )}
        </div>
      )}
    </div>
  );
};

// Universal Era Picker - single or multi-select
export const UniversalEraPicker = ({ value = [], onChange, eras = [], multiple = false, placeholder = 'Select era...' }) => {
  // Normalize value to array
  const selectedIds = Array.isArray(value) ? value : (value ? [value] : []);
  
  if (!multiple) {
    // Single select mode - simple dropdown
    return (
      <select
        value={selectedIds[0] || ''}
        onChange={e => onChange(e.target.value ? (multiple ? [e.target.value] : e.target.value) : (multiple ? [] : ''))}
        className={cn("w-full", THEME.punk.input)}
      >
        <option value="">{placeholder}</option>
        {eras.map(era => (
          <option key={era.id} value={era.id}>{era.name}</option>
        ))}
      </select>
    );
  }
  
  // Multi-select mode - checkboxes as pills
  return (
    <div className="flex flex-wrap gap-2 p-2 border-4 border-black bg-white min-h-[40px]">
      {eras.map(era => (
        <label key={era.id} className="flex items-center gap-1 text-xs font-bold cursor-pointer">
          <input
            type="checkbox"
            checked={selectedIds.includes(era.id)}
            onChange={e => {
              const newIds = e.target.checked
                ? [...selectedIds, era.id]
                : selectedIds.filter(id => id !== era.id);
              onChange(newIds);
            }}
            className="w-3 h-3"
          />
          <span style={{ color: era.color || '#000' }}>{era.name}</span>
        </label>
      ))}
      {eras.length === 0 && <span className="text-xs opacity-50">No eras available</span>}
    </div>
  );
};

// Universal Stage Picker - single or multi-select
export const UniversalStagePicker = ({ value = [], onChange, stages = [], multiple = false, placeholder = 'Select stage...' }) => {
  // Normalize value to array
  const selectedIds = Array.isArray(value) ? value : (value ? [value] : []);
  
  if (!multiple) {
    // Single select mode - simple dropdown
    return (
      <select
        value={selectedIds[0] || ''}
        onChange={e => onChange(e.target.value ? (multiple ? [e.target.value] : e.target.value) : (multiple ? [] : ''))}
        className={cn("w-full", THEME.punk.input)}
      >
        <option value="">{placeholder}</option>
        {stages.map(stage => (
          <option key={stage.id} value={stage.id}>{stage.name}</option>
        ))}
      </select>
    );
  }
  
  // Multi-select mode - checkboxes as pills
  return (
    <div className="flex flex-wrap gap-2 p-2 border-4 border-black bg-white min-h-[40px]">
      {stages.map(stage => (
        <label key={stage.id} className="flex items-center gap-1 text-xs font-bold cursor-pointer">
          <input
            type="checkbox"
            checked={selectedIds.includes(stage.id)}
            onChange={e => {
              const newIds = e.target.checked
                ? [...selectedIds, stage.id]
                : selectedIds.filter(id => id !== stage.id);
              onChange(newIds);
            }}
            className="w-3 h-3"
          />
          {stage.name}
        </label>
      ))}
      {stages.length === 0 && <span className="text-xs opacity-50">No stages available</span>}
    </div>
  );
};

// ============================================================
// STANDARDIZED COMPONENTS
// Per STANDARDIZED_ARCHITECTURE.md - Unified components for consistent UI
// ============================================================

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
    const eraIds = Array.isArray(newEraIds) ? newEraIds : (newEraIds ? [newEraIds] : []);
    onChange({ ...value, eraIds });
  };
  
  const handleStageChange = (newStageIds) => {
    const stageIds = Array.isArray(newStageIds) ? newStageIds : (newStageIds ? [newStageIds] : []);
    onChange({ ...value, stageIds });
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

/**
 * TaskEditModal - Unified task editing modal
 * 
 * @param {Object} task - Task being edited (or empty for new)
 * @param {Function} onSave - Callback with task data
 * @param {Function} onClose - Callback to close modal
 * @param {Function} onDelete - Callback to delete (null for new tasks)
 * @param {boolean} isNew - Whether this is a new task
 */
export const TaskEditModal = ({
  task,
  onSave,
  onClose,
  onDelete,
  isNew = false
}) => {
  const { data } = useStore();
  const teamMembers = data.teamMembers || [];
  const [form, setForm] = useState({ ...task });

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
      isAutoTask: form.isAutoTask ?? false
    });
  };

  const handleEraStageTagsChange = ({ eraIds, stageIds, tagIds }) => {
    setForm(prev => ({ ...prev, eraIds, stageIds, tagIds }));
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
          <button onClick={onClose} className="text-2xl font-bold hover:opacity-70">×</button>
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

          {/* Placeholder for alignment */}
          <div></div>

          {/* Era/Stage/Tags - using unified picker */}
          <div className="md:col-span-2">
            <EraStageTagsPicker
              value={{
                eraIds: form.eraIds || [],
                stageIds: form.stageIds || [],
                tagIds: form.tagIds || []
              }}
              onChange={handleEraStageTagsChange}
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

          {/* Placeholder for alignment */}
          <div></div>

          {/* Team Members */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Team Members</label>
            <div className="flex flex-wrap gap-1 p-2 border-4 border-black bg-white text-xs max-h-24 overflow-y-auto">
              {teamMembers.length === 0 && <span className="text-xs opacity-50">No team members available</span>}
              {teamMembers.map(m => (
                <label key={m.id} className="flex items-center gap-1 cursor-pointer px-2 py-1 hover:bg-gray-100">
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
          {onDelete && !isNew && (
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
  tasks = [], 
  onAddTask, 
  onUpdateTask, 
  onDeleteTask,
  parentType,
  parentId,
  showLegend = true
}) => {
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingTask, setEditingTask] = useState(null);

  // Helper to determine if a task is auto-generated
  const isAutoGeneratedTask = (task) => {
    if (task.isAutoTask === true) return true;
    if (task.isAutoTask === false) return false;
    if (task.isCustom === true) return false;
    if (task.generatedFromInstrument) return true;
    return task.type !== 'Custom';
  };

  // Combine and mark auto vs custom tasks
  const allTasks = useMemo(() => {
    return tasks.map(task => ({
      ...task,
      _isAuto: isAutoGeneratedTask(task)
    }));
  }, [tasks]);

  // Filter and sort
  const filteredTasks = useMemo(() => {
    let result = [...allTasks];
    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }
    result.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'date') {
        valA = a.date || a.dueDate || '';
        valB = b.date || b.dueDate || '';
      } else {
        valA = a[sortBy] || '';
        valB = b[sortBy] || '';
      }
      return sortDir === 'asc' 
        ? (valA < valB ? -1 : valA > valB ? 1 : 0)
        : (valA > valB ? -1 : valA < valB ? 1 : 0);
    });
    return result;
  }, [allTasks, filterStatus, sortBy, sortDir]);

  const handleTaskClick = (task) => {
    setEditingTask(task);
  };

  const handleSaveTask = (taskData) => {
    if (editingTask && editingTask._isNew) {
      onAddTask(taskData);
    } else if (editingTask) {
      onUpdateTask(editingTask.id, taskData);
    }
    setEditingTask(null);
  };

  const handleDeleteTask = () => {
    if (editingTask && !editingTask._isNew) {
      onDeleteTask(editingTask.id);
    }
    setEditingTask(null);
  };

  const handleAddNewTask = () => {
    setEditingTask({ 
      _isNew: true, 
      status: 'Not Started',
      parentType,
      parentId
    });
  };

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
            onClick={handleAddNewTask}
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
                const taskDate = task.date || task.dueDate || '';
                const isOverdue = taskDate && new Date(taskDate) < new Date() && 
                  task.status !== 'Complete' && task.status !== 'Done';
                return (
                  <tr 
                    key={task.id} 
                    className={cn(
                      "border-b border-gray-200 cursor-pointer hover:bg-gray-50",
                      isOverdue ? "bg-red-50" : task._isAuto ? "bg-yellow-50" : "bg-green-50"
                    )}
                    onClick={() => handleTaskClick(task)}
                  >
                    <td className="p-2">
                      <span className={cn(
                        "px-2 py-1 text-xs font-bold border border-black",
                        task._isAuto ? "bg-yellow-200" : "bg-green-200"
                      )}>
                        {task._isAuto ? 'Auto' : 'Custom'}
                      </span>
                    </td>
                    <td className="p-2 font-bold">{task.type || task.title || 'Untitled'}</td>
                    <td className="p-2">
                      <span className={cn("text-xs", isOverdue && "text-red-600 font-bold")}>
                        {taskDate || '-'}
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
          onSave={handleSaveTask}
          onClose={() => setEditingTask(null)}
          onDelete={editingTask._isNew ? null : handleDeleteTask}
          isNew={editingTask._isNew}
        />
      )}
    </div>
  );
};

/**
 * ViewModeToggle - Simple component for grid/list toggle
 * 
 * @param {string} viewMode - Current view mode ('list' or 'grid')
 * @param {Function} setViewMode - Callback to change view mode
 */
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
      <Icon name="Folder" size={16} />
    </button>
  </div>
);

/**
 * DisplayInfoSection - Read-only display section for item detail pages
 * 
 * @param {Object} item - The item being displayed
 * @param {Array} fields - Array of field configurations [{key, label, render?, default?, bgClass?}]
 */
export const DisplayInfoSection = ({ item, fields }) => (
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
