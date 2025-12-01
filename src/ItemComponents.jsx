import { useState } from 'react';
import { cn, THEME } from './utils';
import { Icon } from './Components';

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
