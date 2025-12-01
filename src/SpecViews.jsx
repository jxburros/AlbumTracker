import { useState, useMemo, useCallback } from 'react';
import { useStore, STATUS_OPTIONS, SONG_CATEGORIES, RELEASE_TYPES, getEffectiveCost, calculateTaskProgress, resolveCostPrecedence, getPrimaryDate, getTaskDueDate, generateEventTasks } from './Store';
import { THEME, formatMoney, cn } from './utils';
import { Icon } from './Components';
import { DetailPane, UniversalTagsPicker, UniversalEraPicker, UniversalStagePicker, EraStageTagsPicker, ViewModeToggle } from './ItemComponents';

// Song List View (Spec 2.1) - Section 2: Enhanced with Grid/List Toggle
export const SongListView = ({ onSelectSong }) => {
  const { data, actions } = useStore();
  const [sortBy, setSortBy] = useState('releaseDate');
  const [sortDir, setSortDir] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSingles, setFilterSingles] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid' - Tier 1.1: Grid/List Toggle

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => (
    <span>{sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
  );

  const songProgress = (song) => {
    const versionTasks = (song.versions || []).flatMap(v => [...(v.tasks || []), ...(v.customTasks || [])]);
    const tasks = [...(song.deadlines || []), ...(song.customTasks || []), ...versionTasks];
    return calculateTaskProgress(tasks).progress;
  };

  const songs = useMemo(() => {
    let filtered = [...(data.songs || [])];
    if (filterCategory !== 'all') {
      filtered = filtered.filter(s => s.category === filterCategory);
    }
    if (filterSingles) {
      filtered = filtered.filter(s => s.isSingle);
    }
    filtered.sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (sortBy === 'estimatedCost') { valA = valA || 0; valB = valB || 0; }
      if (sortDir === 'asc') { return valA < valB ? -1 : valA > valB ? 1 : 0; }
      else { return valA > valB ? -1 : valA < valB ? 1 : 0; }
    });
    return filtered;
  }, [data.songs, sortBy, sortDir, filterCategory, filterSingles]);

  const handleAddSong = async () => {
    const newSong = await actions.addSong({ title: 'New Song', category: 'Album', releaseDate: '', isSingle: false });
    if (onSelectSong) onSelectSong(newSong);
  };

  return (
    <div className="p-6 pb-24">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <h2 className={cn(THEME.punk.textStyle, "punk-accent-underline text-2xl")}>Songs</h2>
        <div className="flex flex-wrap gap-2">
          {/* Tier 1.1: Grid/List View Toggle */}
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
            <option value="all">All Categories</option>
            {SONG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 border-4 border-black bg-white font-bold">
            <input type="checkbox" checked={filterSingles} onChange={e => setFilterSingles(e.target.checked)} className="w-4 h-4" />
            Singles Only
          </label>
          <button onClick={handleAddSong} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Song</button>
        </div>
      </div>
      
      {/* Tier 1.1: Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {songs.length === 0 ? (
            <div className={cn("col-span-full p-10 text-center opacity-50", THEME.punk.card)}>No songs yet. Click Add Song to create one.</div>
          ) : (
            songs.map(song => (
              <div 
                key={song.id} 
                onClick={() => onSelectSong && onSelectSong(song)} 
                className={cn("p-4 cursor-pointer hover:bg-yellow-50", THEME.punk.card)}
              >
                <div className="font-bold text-lg mb-2">{song.title}</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="opacity-60">Category:</span>
                    <span className="font-bold">{song.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Release:</span>
                    <span className="font-bold">{song.releaseDate || 'TBD'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Progress:</span>
                    <span className="font-bold">{songProgress(song)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Est. Cost:</span>
                    <span className="font-bold">{formatMoney(song.estimatedCost || 0)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {song.isSingle && <span className="px-2 py-1 bg-pink-200 text-pink-800 text-[10px] font-bold border border-pink-500">SINGLE</span>}
                  {song.exclusiveType && song.exclusiveType !== 'None' && <span className="px-2 py-1 bg-purple-200 text-purple-800 text-[10px] font-bold border border-purple-500">{song.exclusiveType}</span>}
                  {song.stemsNeeded && <span className="px-2 py-1 bg-blue-200 text-blue-800 text-[10px] font-bold border border-blue-500">STEMS</span>}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* List View (Original) */
        <div className={cn("overflow-x-auto", THEME.punk.card)}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white">
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('title')}>Title <SortIcon field="title" /></th>
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('category')}>Category <SortIcon field="category" /></th>
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('releaseDate')}>Release Date <SortIcon field="releaseDate" /></th>
                <th className="p-3 text-center">Single?</th>
                <th className="p-3 text-left">Exclusive</th>
                <th className="p-3 text-center">Stems?</th>
                <th className="p-3 text-right">Progress</th>
                <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('estimatedCost')}>Est. Cost <SortIcon field="estimatedCost" /></th>
              </tr>
            </thead>
            <tbody>
              {songs.length === 0 ? (
                <tr><td colSpan="8" className="p-10 text-center opacity-50">No songs yet. Click Add Song to create one.</td></tr>
              ) : (
                songs.map(song => (
                  <tr key={song.id} onClick={() => onSelectSong && onSelectSong(song)} className="border-b border-gray-200 hover:bg-yellow-50 cursor-pointer">
                    <td className="p-3 font-bold">{song.title}</td>
                    <td className="p-3">{song.category}</td>
                    <td className="p-3">{song.releaseDate || '-'}</td>
                    <td className="p-3 text-center">{song.isSingle ? 'Yes' : 'No'}</td>
                    <td className="p-3">{song.exclusiveType && song.exclusiveType !== 'None' ? song.exclusiveType : '-'}</td>
                    <td className="p-3 text-center">{song.stemsNeeded ? 'Yes' : 'No'}</td>
                    <td className="p-3 text-right">{songProgress(song)}%</td>
                    <td className="p-3 text-right">{formatMoney(song.estimatedCost || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Song Detail View (Spec 2.2) - Enhanced per Song EditMore Info Pages Description.txt
export const SongDetailView = ({ song, onBack }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...song });
  const [newVersionMusicians, setNewVersionMusicians] = useState({});
  const [newAssignments, setNewAssignments] = useState({});
  // Section 3: Task sorting/filtering state
  const [taskSortBy, setTaskSortBy] = useState('date');
  const [taskSortDir, setTaskSortDir] = useState('asc');
  const [taskFilterStatus, setTaskFilterStatus] = useState('all');
  // Version expand/collapse state
  const [expandedVersions, setExpandedVersions] = useState({});
  // Selected task for editing modal - Song Task More/Edit Info Page
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskContext, setEditingTaskContext] = useState(null); // { type: 'song'|'version'|'custom', versionId?: string }
  // Instrument state - unified with Version's simpler system (Issue #2)
  const [newSongMusician, setNewSongMusician] = useState({ memberId: '', instruments: '' });

  const teamMembers = useMemo(() => data.teamMembers || [], [data.teamMembers]);

  const taskBudget = (task = {}) => {
    if (task.paidCost !== undefined) return task.paidCost || 0;
    if (task.actualCost !== undefined) return task.actualCost || 0;
    if (task.quotedCost !== undefined) return task.quotedCost || 0;
    return task.estimatedCost || 0;
  };

  // Helper function to determine if a task is auto-generated
  // Uses explicit isAutoTask field when available, falls back to heuristics
  const isTaskAutoGenerated = (task, contextType) => {
    // Explicit field takes precedence
    if (task.isAutoTask === true) return true;
    if (task.isAutoTask === false) return false;
    // Internal marker from task list rendering
    if (task._isAuto !== undefined) return task._isAuto;
    // New custom tasks are never auto-generated
    if (contextType === 'new-custom' || contextType === 'custom') return false;
    // Default: tasks without explicit custom markers are considered auto
    return true;
  };

  // Assignment function for tasks (used in version task editing)
  // eslint-disable-next-line no-unused-vars
  const addAssignment = (taskKey, taskObj, updater) => {
    const entry = newAssignments[taskKey] || { memberId: '', cost: 0, instrument: '' };
    const budget = taskBudget(taskObj);
    const current = (taskObj.assignedMembers || []).reduce((s, m) => s + (parseFloat(m.cost) || 0), 0);
    const nextTotal = current + (parseFloat(entry.cost) || 0);
    if (budget > 0 && nextTotal > budget) return; // prevent over-allocation
    const updatedMembers = [...(taskObj.assignedMembers || []), { memberId: entry.memberId, cost: parseFloat(entry.cost) || 0, instrument: entry.instrument || '' }];
    updater(updatedMembers);
    setNewAssignments(prev => ({ ...prev, [taskKey]: { memberId: '', cost: 0, instrument: '' } }));
  };

  const handleSave = useCallback(async () => { 
    await actions.updateSong(song.id, form); 
  }, [actions, song.id, form]);
  
  const handleFieldChange = useCallback((field, value) => { 
    setForm(prev => ({ ...prev, [field]: value })); 
  }, []);

  // Toggle version expansion
  const toggleVersionExpand = (versionId) => {
    setExpandedVersions(prev => ({ ...prev, [versionId]: !prev[versionId] }));
  };

  const handleRecalculateDeadlines = async () => {
    await actions.recalculateSongDeadlines(song.id);
    const updatedSong = data.songs.find(s => s.id === song.id);
    if (updatedSong) setForm({ ...updatedSong });
  };

  const handleDeadlineChange = async (deadlineId, field, value) => {
    await actions.updateSongDeadline(song.id, deadlineId, { [field]: value });
  };

  // Handler for deleting custom tasks (used in task management UI)
  // eslint-disable-next-line no-unused-vars
  const handleDeleteCustomTask = async (taskId) => {
    if (confirm('Delete this task?')) { await actions.deleteSongCustomTask(song.id, taskId); }
  };

  const handleDeleteSong = async () => {
    if (confirm('Delete this song?')) { await actions.deleteSong(song.id); onBack(); }
  };

  // Handle Core Releases multiple selection - per specification section B.1
  const handleCoreReleasesChange = useCallback((releaseId, checked) => {
    const currentIds = form.coreReleaseIds || (form.coreReleaseId ? [form.coreReleaseId] : []);
    let newIds;
    if (checked) {
      newIds = [...currentIds, releaseId];
    } else {
      newIds = currentIds.filter(id => id !== releaseId);
    }
    handleFieldChange('coreReleaseIds', newIds);
    // Auto-fill release date from earliest attached release if not overridden
    if (!form.releaseDateOverride && newIds.length > 0) {
      const dates = newIds.map(id => data.releases.find(r => r.id === id)?.releaseDate).filter(Boolean).sort();
      if (dates.length > 0 && dates[0] !== form.releaseDate) {
        handleFieldChange('releaseDate', dates[0]);
      }
    }
    setTimeout(handleSave, 0);
  }, [form.coreReleaseIds, form.coreReleaseId, form.releaseDateOverride, form.releaseDate, data.releases, handleFieldChange, handleSave]);

  const currentSong = useMemo(() => data.songs.find(s => s.id === song.id) || song, [data.songs, song]);
  
  // Helper function to check if a video type exists in currentSong.videos (Issue #1)
  // This ensures checkbox state reflects actual video items, not just form state
  // Phase 1.1: Supports both new videoType field and legacy types object
  const hasVideoOfType = useCallback((typeKey) => {
    return (currentSong.videos || []).some(v => 
      (!v.versionId || v.versionId === 'core') && (v.types?.[typeKey] || v.videoType === typeKey)
    );
  }, [currentSong.videos]);
  
  const songTasks = useMemo(() => currentSong.deadlines || [], [currentSong.deadlines]);
  const songCustomTasks = useMemo(() => currentSong.customTasks || [], [currentSong.customTasks]);
  const allSongTasks = useMemo(() => [
    ...songTasks,
    ...songCustomTasks,
    ...(currentSong.versions || []).flatMap(v => [...(v.tasks || []), ...(v.customTasks || [])])
  ], [songTasks, songCustomTasks, currentSong.versions]);
  const { progress: songProgressValue } = calculateTaskProgress(allSongTasks);
  // Cost is calculated from all tasks (per specification - no manual cost on Songs)
  const tasksCost = songTasks.reduce((sum, d) => sum + getEffectiveCost(d), 0);
  const customTasksCost = songCustomTasks.reduce((sum, t) => sum + getEffectiveCost(t), 0);
  const versionsCost = (currentSong.versions || []).reduce((sum, v) => {
    const vTasksCost = (v.tasks || []).reduce((s, t) => s + getEffectiveCost(t), 0);
    const vCustomTasksCost = (v.customTasks || []).reduce((s, t) => s + getEffectiveCost(t), 0);
    return sum + vTasksCost + vCustomTasksCost;
  }, 0);
  // Total cost is sum of all task costs (per specification B.2 - Cost is calculated, not editable)
  const totalCost = tasksCost + customTasksCost + versionsCost;

  // Handle video type checkbox toggle for Song Information section - creates/deletes Video Item per spec B.4
  // This works at the Song level for the Core Version, creating the core version if needed
  // Phase 1.1: Each type creates a separate Video with single type (isAutogenerated = true)
  const handleSongVideoTypeToggle = useCallback(async (typeKey, checked) => {
    // Video type labels per spec B.4
    const videoTypeLabels = {
      music: 'Music Video',
      lyric: 'Lyric Video',
      enhancedLyric: 'Enhanced Lyric Video',
      loop: 'Loop Video',
      visualizer: 'Visualizer',
      live: 'Live Video',
      custom: 'Custom Video'
    };
    
    // If video type checked, auto-create Video Item for the Song (Phase 1.1: single type per video)
    if (checked) {
      const existingVideo = (currentSong.videos || []).find(v => 
        (!v.versionId || v.versionId === 'core') && (v.types?.[typeKey] || v.videoType === typeKey)
      );
      if (!existingVideo) {
        await actions.addSongVideo(song.id, {
          title: `${currentSong.title} - ${videoTypeLabels[typeKey] || typeKey}`,
          versionId: 'core',
          videoType: typeKey, // Phase 1.1: Single video type
          types: { [typeKey]: true },
          isAutogenerated: true, // Phase 1.1: Type is display-only after creation
          releaseDate: currentSong.releaseDate || ''
        });
      }
    } else {
      // If unchecked, prompt user to delete the Video Item per spec
      const existingVideo = (currentSong.videos || []).find(v => 
        (!v.versionId || v.versionId === 'core') && (v.types?.[typeKey] || v.videoType === typeKey)
      );
      if (existingVideo && confirm(`Delete the ${videoTypeLabels[typeKey] || typeKey}? This will remove the associated Video Item.`)) {
        await actions.deleteSongVideo(song.id, existingVideo.id);
      }
    }
  }, [currentSong, song.id, actions]);

  // Handle video type checkbox toggle for Versions - creates/deletes Video Item per spec B.4
  // Phase 1.1: Each type creates a separate Video with single type (isAutogenerated = true)
  const handleVideoTypeToggle = useCallback(async (versionId, typeKey, checked) => {
    const version = currentSong.versions?.find(v => v.id === versionId);
    if (!version) return;
    
    const newVideoTypes = { ...(version.videoTypes || {}), [typeKey]: checked };
    await actions.updateSongVersion(song.id, versionId, { videoTypes: newVideoTypes });
    
    // Video type labels per spec B.4: Music Video, Lyric Video, Enhanced Lyric Video, Loop Video, Visualizer, Live Video, Custom Video
    const videoTypeLabels = {
      music: 'Music Video',
      lyric: 'Lyric Video',
      enhancedLyric: 'Enhanced Lyric Video',
      loop: 'Loop Video',
      visualizer: 'Visualizer',
      live: 'Live Video',
      custom: 'Custom Video'
    };
    
    // If video type checked, auto-create Video Item for the Song (Phase 1.1: single type per video)
    if (checked) {
      const existingVideo = (currentSong.videos || []).find(v => 
        v.versionId === versionId && (v.types?.[typeKey] || v.videoType === typeKey)
      );
      if (!existingVideo) {
        await actions.addSongVideo(song.id, {
          title: `${currentSong.title} - ${videoTypeLabels[typeKey] || typeKey}`,
          versionId: versionId,
          videoType: typeKey, // Phase 1.1: Single video type
          types: { [typeKey]: true },
          isAutogenerated: true, // Phase 1.1: Type is display-only after creation
          releaseDate: version.releaseDate || currentSong.releaseDate || ''
        });
      }
    } else {
      // If unchecked, prompt user to delete the Video Item per spec
      const existingVideo = (currentSong.videos || []).find(v => 
        v.versionId === versionId && (v.types?.[typeKey] || v.videoType === typeKey)
      );
      if (existingVideo && confirm(`Delete the ${videoTypeLabels[typeKey] || typeKey} for this version?`)) {
        await actions.deleteSongVideo(song.id, existingVideo.id);
      }
    }
  }, [currentSong, song.id, actions]);

  // Handle opening the Song Task Edit Modal
  const handleOpenTaskEdit = (task, context) => {
    setEditingTask({ ...task });
    setEditingTaskContext(context);
  };

  // Handle saving task from the Song Task Edit Modal
  const handleSaveTaskEdit = async () => {
    if (!editingTask || !editingTaskContext) return;
    
    if (editingTaskContext.type === 'new-custom') {
      // Issue #7, #9: Creating a new custom task using unified task system
      await actions.addSongCustomTask(song.id, {
        title: editingTask.type || editingTask.title || 'New Task',
        type: editingTask.type || editingTask.title || 'Custom',
        date: editingTask.date || editingTask.dueDate || '',
        dueDate: editingTask.date || editingTask.dueDate || '',
        status: editingTask.status || 'Not Started',
        estimatedCost: editingTask.estimatedCost || 0,
        quotedCost: editingTask.quotedCost || 0,
        paidCost: editingTask.paidCost || 0,
        notes: editingTask.notes || editingTask.description || '',
        description: editingTask.description || editingTask.notes || '',
        assignedMembers: editingTask.assignedMembers || [],
        tags: editingTask.tags || [],
        isAutoTask: false
      });
    } else if (editingTaskContext.type === 'song') {
      await actions.updateSongDeadline(song.id, editingTask.id, editingTask);
    } else if (editingTaskContext.type === 'version') {
      await actions.updateVersionTask(song.id, editingTaskContext.versionId, editingTask.id, editingTask);
    } else if (editingTaskContext.type === 'custom') {
      await actions.updateSongCustomTask(song.id, editingTask.id, editingTask);
    }
    
    setEditingTask(null);
    setEditingTaskContext(null);
  };

  // Handle adding copy version (duplicates Core Version attributes)
  // Issue #6: Copy Version must duplicate all data from Core Version including:
  // Instruments, Musicians, Video selections, Exclusivity info, Flags, Tags, Era, Stage, Notes
  const handleAddCopyVersion = async () => {
    const coreVersion = currentSong.versions?.find(v => v.id === 'core');
    const newVersion = await actions.addSongVersion(song.id, {
      name: `${currentSong.title} (Copy)`,
      releaseDate: currentSong.releaseDate,
      // Copy instruments (both legacy and new format)
      instruments: [...(coreVersion?.instruments || currentSong.instruments || [])],
      instrumentData: [...(coreVersion?.instrumentData || currentSong.instrumentData || [])],
      // Copy musicians
      musicians: [...(coreVersion?.musicians || [])],
      // Copy video type selections
      videoTypes: { ...(coreVersion?.videoTypes || currentSong.videoTypes || {}) },
      // Copy exclusivity info
      hasExclusivity: coreVersion?.hasExclusivity || currentSong.hasExclusivity || false,
      exclusiveType: coreVersion?.exclusiveType || currentSong.exclusiveType || 'None',
      exclusiveStartDate: coreVersion?.exclusiveStartDate || currentSong.exclusiveStartDate || '',
      exclusiveEndDate: coreVersion?.exclusiveEndDate || currentSong.exclusiveEndDate || '',
      exclusiveNotes: coreVersion?.exclusiveNotes || currentSong.exclusiveNotes || '',
      // Copy flags
      stemsNeeded: coreVersion?.stemsNeeded || currentSong.stemsNeeded || false,
      isSingle: coreVersion?.isSingle || currentSong.isSingle || false,
      // Copy metadata (Era, Stage, Tags)
      eraIds: [...(coreVersion?.eraIds || currentSong.eraIds || [])],
      stageIds: [...(coreVersion?.stageIds || currentSong.stageIds || [])],
      tagIds: [...(coreVersion?.tagIds || currentSong.tagIds || [])],
      tags: [...(coreVersion?.tags || currentSong.tags || [])],
      // Copy notes
      notes: coreVersion?.notes || currentSong.notes || '',
      basedOnCore: true
    });
    if (newVersion) {
      setExpandedVersions(prev => ({ ...prev, [newVersion.id]: true }));
    }
  };

  // Handle adding blank version
  const handleAddBlankVersion = async () => {
    const newVersion = await actions.addSongVersion(song.id, {
      name: 'New Version',
      releaseDate: '',
      instruments: [],
      musicians: [],
      videoTypes: {},
      basedOnCore: false
    });
    if (newVersion) {
      setExpandedVersions(prev => ({ ...prev, [newVersion.id]: true }));
    }
  };

  // Section 3: Filtered and sorted tasks
  const filteredSongTasks = useMemo(() => {
    let tasks = [...songTasks];
    if (taskFilterStatus !== 'all') {
      tasks = tasks.filter(t => t.status === taskFilterStatus);
    }
    // Issue #12: Removed category filter
    tasks.sort((a, b) => {
      const valA = a[taskSortBy] || '';
      const valB = b[taskSortBy] || '';
      return taskSortDir === 'asc' 
        ? (valA < valB ? -1 : valA > valB ? 1 : 0)
        : (valA > valB ? -1 : valA < valB ? 1 : 0);
    });
    return tasks;
  }, [songTasks, taskFilterStatus, taskSortBy, taskSortDir]);

  // Get core release IDs (supports both new array and legacy single)
  const coreReleaseIds = useMemo(() => {
    const ids = [...(currentSong.coreReleaseIds || [])];
    if (currentSong.coreReleaseId && !ids.includes(currentSong.coreReleaseId)) {
      ids.push(currentSong.coreReleaseId);
    }
    return ids;
  }, [currentSong.coreReleaseIds, currentSong.coreReleaseId]);

  // Set for O(1) lookup of core release IDs
  const coreReleaseIdSet = useMemo(() => new Set(coreReleaseIds), [coreReleaseIds]);

  // Calculate earliest release date from attached releases
  const earliestReleaseDate = useMemo(() => {
    const dates = coreReleaseIds
      .map(id => data.releases.find(r => r.id === id)?.releaseDate)
      .filter(Boolean)
      .sort();
    return dates.length > 0 ? dates[0] : '';
  }, [coreReleaseIds, data.releases]);

  // Get assigned team members for Display Information
  const assignedTeamMembers = useMemo(() => {
    const memberIds = new Set();
    // From song musicians
    (currentSong.musicians || []).forEach(m => memberIds.add(m.memberId));
    // From version musicians
    (currentSong.versions || []).forEach(v => {
      (v.musicians || []).forEach(m => memberIds.add(m.memberId));
    });
    // From task assignments
    allSongTasks.forEach(task => {
      (task.assignedMembers || []).forEach(m => memberIds.add(m.memberId));
    });
    return teamMembers.filter(m => memberIds.has(m.id));
  }, [currentSong, allSongTasks, teamMembers]);

  // Get unique task categories for filter dropdown (reserved for future use)
  // eslint-disable-next-line no-unused-vars
  const taskCategories = useMemo(() => {
    const categories = new Set();
    songTasks.forEach(t => t.category && categories.add(t.category));
    return Array.from(categories);
  }, [songTasks]);

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className={cn("px-4 py-2 bg-white flex items-center gap-2", THEME.punk.btn)}>
          <Icon name="ChevronLeft" size={16} /> Back to Songs
        </button>
        <button onClick={handleDeleteSong} className={cn("px-4 py-2", THEME.punk.btn, "bg-red-500 text-white")}>
          <Icon name="Trash2" size={16} />
        </button>
      </div>

      {/* SECTION A: Display-Only Section (per spec order: Song Title, Task Progress, Core Version Release Date, 
           Number of Versions, Number of Open Tasks, Number of Videos, Overdue Task Indicator, Cost Paid, 
           Estimated Total Cost, Team Members) */}
      <div className={cn("p-6 mb-6 bg-gray-50", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Display Information</h3>
        
        {/* Song Title - prominent at top */}
        <div className="text-2xl font-black mb-4 pb-2 border-b-2 border-gray-300">{currentSong.title || 'Untitled Song'}</div>
        
        <div className="grid md:grid-cols-4 gap-4">
          {/* Task Progress */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Task Progress</label>
            <div className="px-3 py-2 bg-yellow-100 border-2 border-black text-lg font-black">{songProgressValue}%</div>
          </div>
          
          {/* Core Version Release Date */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Release Date</label>
            <div className="px-3 py-2 bg-blue-100 border-2 border-black text-sm font-bold">
              {earliestReleaseDate || form.releaseDate || 'Not Set'}
            </div>
          </div>
          
          {/* Number of Versions */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Versions</label>
            <div className="px-3 py-2 bg-gray-100 border-2 border-black text-lg font-black">
              {(currentSong.versions || []).filter(v => v.id !== 'core').length}
            </div>
          </div>
          
          {/* Number of Open Tasks */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Open Tasks</label>
            <div className="px-3 py-2 bg-gray-100 border-2 border-black text-lg font-black">
              {allSongTasks.filter(t => t.status !== 'Complete' && t.status !== 'Done').length}
            </div>
          </div>
          
          {/* Number of Videos */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Videos</label>
            <div className="px-3 py-2 bg-gray-100 border-2 border-black text-lg font-black">
              {(currentSong.videos || []).length}
            </div>
          </div>
          
          {/* Overdue Task Indicator */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Overdue Tasks</label>
            <div className={cn("px-3 py-2 border-2 border-black text-lg font-black", 
              allSongTasks.filter(t => t.date && new Date(t.date) < new Date() && t.status !== 'Complete' && t.status !== 'Done').length > 0 
                ? "bg-red-200" : "bg-green-100"
            )}>
              {allSongTasks.filter(t => t.date && new Date(t.date) < new Date() && t.status !== 'Complete' && t.status !== 'Done').length}
            </div>
          </div>
          
          {/* Cost Paid */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Cost Paid</label>
            <div className="px-3 py-2 bg-green-100 border-2 border-black text-sm font-bold">
              {formatMoney(allSongTasks.reduce((sum, t) => sum + (t.paidCost || 0), 0))}
            </div>
          </div>
          
          {/* Estimated Total Cost */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Estimated Cost</label>
            <div className="px-3 py-2 bg-yellow-100 border-2 border-black text-sm font-bold">
              {formatMoney(totalCost)}
            </div>
          </div>
          
          {/* Team Members */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold uppercase mb-2">Team Members on Tasks</label>
            <div className="flex flex-wrap gap-2">
              {assignedTeamMembers.length === 0 ? (
                <span className="text-xs opacity-50">No team members assigned</span>
              ) : assignedTeamMembers.map(m => (
                <div key={m.id} className="px-2 py-1 bg-purple-100 border-2 border-black text-xs font-bold">
                  {m.name} {m.isMusician && '🎵'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: Song Information - Per spec order:
           1. Basic Song Fields (Title, Writers, Composers)
           2. Releases (Attached Releases, Release Date)  
           3. Flags (Is Single?, Stems Needed?)
           4. Videos (Core Version Video Options)
           5. Exclusivity
           6. Instruments
           7. Metadata (Era, Stage, Tags, Notes) */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Song Information</h3>
        
        {/* B.1 Basic Song Fields: Title, Writers, Composers */}
        <div className="mb-6 pb-4 border-b-2 border-gray-200">
          <h4 className="text-xs font-black uppercase mb-3 text-gray-600">Basic Song Fields</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Song Title</label>
              <input value={form.title || ''} onChange={e => handleFieldChange('title', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Writers</label>
              <input value={(form.writers || []).join(', ')} onChange={e => handleFieldChange('writers', e.target.value.split(',').map(w => w.trim()).filter(Boolean))} onBlur={handleSave} placeholder="comma-separated" className={cn("w-full", THEME.punk.input)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Composers</label>
              <input value={(form.composers || []).join(', ')} onChange={e => handleFieldChange('composers', e.target.value.split(',').map(c => c.trim()).filter(Boolean))} onBlur={handleSave} placeholder="comma-separated" className={cn("w-full", THEME.punk.input)} />
            </div>
          </div>
        </div>
        
        {/* B.2 Releases: Attached Releases (Core Version), Release Date */}
        <div className="mb-6 pb-4 border-b-2 border-gray-200">
          <h4 className="text-xs font-black uppercase mb-3 text-gray-600">Releases</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Attached Releases (Core Version)</label>
              <div className="flex flex-wrap gap-2 p-2 border-4 border-black bg-white max-h-32 overflow-y-auto">
                {(data.releases || []).length === 0 ? (
                  <span className="text-xs opacity-50">No releases available</span>
                ) : (data.releases || []).map(r => (
                  <label key={r.id} className="flex items-center gap-1 text-xs font-bold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={coreReleaseIdSet.has(r.id)} 
                      onChange={e => handleCoreReleasesChange(r.id, e.target.checked)}
                      className="w-4 h-4" 
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Release Date</label>
              <div className="flex gap-2 items-center">
                {/* Issue #3: Release Date is only editable when:
                    1. Song has no Releases attached (coreReleaseIds.length === 0), OR
                    2. User has explicitly selected Override Release Date (releaseDateOverride) */}
                <input 
                  type="date" 
                  value={form.releaseDateOverride ? form.releaseDate : (earliestReleaseDate || form.releaseDate || '')} 
                  onChange={e => handleFieldChange('releaseDate', e.target.value)} 
                  onBlur={handleSave} 
                  disabled={!form.releaseDateOverride && coreReleaseIds.length > 0}
                  className={cn("flex-1", THEME.punk.input, !form.releaseDateOverride && coreReleaseIds.length > 0 && "opacity-60")} 
                />
                <label className="flex items-center gap-1 text-xs font-bold whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    checked={form.releaseDateOverride || false} 
                    onChange={e => { 
                      handleFieldChange('releaseDateOverride', e.target.checked); 
                      setTimeout(handleSave, 0); 
                    }}
                    className="w-4 h-4" 
                  />
                  Override
                </label>
              </div>
              {!form.releaseDateOverride && earliestReleaseDate && (
                <div className="text-[10px] text-gray-500 mt-1">Auto-filled from earliest attached release</div>
              )}
              {coreReleaseIds.length === 0 && !form.releaseDate && (
                <div className="text-[10px] text-gray-500 mt-1">Editable - no releases attached</div>
              )}
            </div>
          </div>
        </div>
        
        {/* B.3 Flags: Is Single?, Stems Needed? */}
        <div className="mb-6 pb-4 border-b-2 border-gray-200">
          <h4 className="text-xs font-black uppercase mb-3 text-gray-600">Flags</h4>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" checked={form.isSingle || false} onChange={e => { handleFieldChange('isSingle', e.target.checked); setTimeout(handleSave, 0); }} className="w-5 h-5" />
              Is Single?
            </label>
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" checked={form.stemsNeeded || false} onChange={e => { handleFieldChange('stemsNeeded', e.target.checked); setTimeout(handleSave, 0); }} className="w-5 h-5" />
              Stems Needed?
            </label>
          </div>
          {form.isSingle && (
            <div className="mt-2 text-xs text-blue-600 font-bold">💡 Tip: Attach a Single/Double Single Release</div>
          )}
          {form.stemsNeeded && (
            <div className="mt-2 text-xs text-blue-600 font-bold">💡 Auto-tasks created: Receive Stems, Release Stems</div>
          )}
        </div>
        
        {/* B.4 Videos: Core Version Video Options - Issue #1 Fix: Video checkboxes now work at Song level */}
        <div className="mb-6 pb-4 border-b-2 border-gray-200">
          <h4 className="text-xs font-black uppercase mb-3 text-gray-600">Videos (Core Version)</h4>
          <div className="p-3 bg-gray-50 border-2 border-black">
            <div className="flex flex-wrap gap-4 text-sm">
              {[
                { key: 'music', label: 'Music Video' },
                { key: 'lyric', label: 'Lyric Video' },
                { key: 'enhancedLyric', label: 'Enhanced Lyric Video' },
                { key: 'loop', label: 'Loop Video' },
                { key: 'visualizer', label: 'Visualizer' },
                { key: 'live', label: 'Live Video' },
                { key: 'custom', label: 'Custom Video' }
              ].map(type => (
                <label key={type.key} className="flex items-center gap-2 cursor-pointer font-bold">
                  <input 
                    type="checkbox" 
                    checked={hasVideoOfType(type.key)} 
                    onChange={e => handleSongVideoTypeToggle(type.key, e.target.checked)} 
                    className="w-4 h-4"
                  />
                  {type.label}
                </label>
              ))}
            </div>
            <div className="text-[10px] text-gray-500 mt-2">Checking creates a Video Item; unchecking prompts to delete it</div>
          </div>
        </div>
        
        {/* B.5 Exclusivity */}
        <div className="mb-6 pb-4 border-b-2 border-gray-200">
          <h4 className="text-xs font-black uppercase mb-3 text-gray-600">Exclusivity</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-bold">
              <input 
                type="checkbox" 
                checked={form.hasExclusivity || false} 
                onChange={e => { handleFieldChange('hasExclusivity', e.target.checked); setTimeout(handleSave, 0); }} 
                className="w-5 h-5" 
              />
              Has Exclusivity
            </label>
            {form.hasExclusivity && (
              <div className="grid md:grid-cols-3 gap-4 pl-7">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Exclusivity Start Date</label>
                  <input type="date" value={form.exclusiveStartDate || ''} onChange={e => handleFieldChange('exclusiveStartDate', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Exclusivity End Date</label>
                  <input type="date" value={form.exclusiveEndDate || ''} onChange={e => handleFieldChange('exclusiveEndDate', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Exclusivity Notes</label>
                  <input value={form.exclusiveNotes || ''} onChange={e => handleFieldChange('exclusiveNotes', e.target.value)} onBlur={handleSave} placeholder="Platform, terms..." className={cn("w-full", THEME.punk.input)} />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* B.6 Instruments & Musicians - Unified with Version's simpler system (Issue #2) */}
        <div className="mb-6 pb-4 border-b-2 border-gray-200">
          <h4 className="text-xs font-black uppercase mb-3 text-gray-600">Instruments &amp; Musicians</h4>
          
          {/* Instruments - same pattern as Versions */}
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase mb-1">Instruments</label>
            <input 
              value={(form.instruments || []).join(', ')} 
              onChange={e => {
                handleFieldChange('instruments', e.target.value.split(',').map(i => i.trim()).filter(Boolean));
                setTimeout(handleSave, 0);
              }} 
              className={cn("w-full", THEME.punk.input)} 
              placeholder="guitar, synth, drums" 
            />
          </div>

          {/* Musicians - same pattern as Versions */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase mb-2">Musicians</div>
            <div className="flex flex-wrap gap-2 mb-2">
              <select value={newSongMusician?.memberId || ''} onChange={e => setNewSongMusician(prev => ({ ...(prev || {}), memberId: e.target.value }))} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
                <option value="">Select Member</option>
                {teamMembers.filter(m => m.isMusician).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input value={newSongMusician?.instruments || ''} onChange={e => setNewSongMusician(prev => ({ ...(prev || {}), instruments: e.target.value }))} placeholder="instruments" className={cn("px-2 py-1 text-xs flex-1", THEME.punk.input)} />
              <button onClick={() => {
                if (!newSongMusician?.memberId) return;
                const newMusician = { 
                  id: crypto.randomUUID(), 
                  memberId: newSongMusician.memberId, 
                  instruments: (newSongMusician.instruments || '').split(',').map(i => i.trim()).filter(Boolean) 
                };
                handleFieldChange('musicians', [...(form.musicians || []), newMusician]);
                setNewSongMusician({ memberId: '', instruments: '' });
                setTimeout(handleSave, 0);
              }} className={cn("px-2 py-1 text-xs", THEME.punk.btn, "bg-black text-white")}>Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(form.musicians || []).map(m => {
                const member = teamMembers.find(tm => tm.id === m.memberId);
                return (
                  <span key={m.id} className="px-2 py-1 border-2 border-black bg-blue-100 text-xs font-bold flex items-center gap-2">
                    {member?.name || 'Member'} — {(m.instruments || []).join(', ')}
                    <button onClick={() => {
                      handleFieldChange('musicians', (form.musicians || []).filter(mu => mu.id !== m.id));
                      setTimeout(handleSave, 0);
                    }} className="text-red-600">×</button>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* B.7 Metadata: Era, Stage, Tags, Notes */}
        <div>
          <h4 className="text-xs font-black uppercase mb-3 text-gray-600">Metadata</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Era</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <UniversalEraPicker
                    value={(form.eraIds || [])[0] || ''}
                    onChange={value => {
                      handleFieldChange('eraIds', value ? [value] : []);
                      setTimeout(handleSave, 0);
                    }}
                    eras={data.eras || []}
                    placeholder="No Era"
                  />
                </div>
                <button 
                  onClick={() => {
                    if (confirm('Propagate this Era to all tasks in this song (including versions and videos)?')) {
                      actions.propagateEraToChildren('song', song.id, form.eraIds || []);
                    }
                  }}
                  className={cn("px-3 py-2 text-xs", THEME.punk.btn, "bg-purple-500 text-white")}
                  title="Apply era to all child tasks"
                >
                  Propagate
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Stage</label>
              <UniversalStagePicker
                value={(form.stageIds || [])[0] || ''}
                onChange={value => {
                  handleFieldChange('stageIds', value ? [value] : []);
                  setTimeout(handleSave, 0);
                }}
                stages={data.stages || []}
                placeholder="No Stage"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Tags</label>
              <UniversalTagsPicker
                value={form.tagIds || []}
                onChange={newTagIds => {
                  handleFieldChange('tagIds', newTagIds);
                  setTimeout(handleSave, 0);
                }}
                tags={data.tags || []}
                onCreateTag={actions.addTag}
                placeholder="Add tag..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Notes</label>
              <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-20", THEME.punk.input)} placeholder="Additional notes..." />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION C: Versions Module - Collapsible list per spec */}
      {/* Issue #3: Display-Only Core Version at top of Versions list */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex flex-wrap justify-between items-center mb-4 border-b-4 border-black pb-2 gap-2">
          <h3 className="font-black uppercase">Versions</h3>
          <div className="flex gap-2">
            {/* Per spec: Add Copy Version (duplicate from Core) and Add Blank Version buttons */}
            <button onClick={handleAddCopyVersion} className={cn("px-3 py-2 text-xs", THEME.punk.btn, "bg-blue-600 text-white")}>+ Add Copy Version</button>
            <button onClick={handleAddBlankVersion} className={cn("px-3 py-2 text-xs", THEME.punk.btn, "bg-black text-white")}>+ Add Blank Version</button>
          </div>
        </div>
        
        <div className="space-y-2">
          {/* Issue #3: Always show Core Version at the top as display-only */}
          <div className="border-2 border-black bg-yellow-50">
            {/* Core Version Header */}
            <div 
              className="p-3 flex items-center justify-between cursor-pointer hover:bg-yellow-100"
              onClick={() => toggleVersionExpand('core-display')}
            >
              <div className="flex items-center gap-3">
                <Icon name={expandedVersions['core-display'] ? "ChevronDown" : "ChevronRight"} size={16} />
                <span className="font-bold">Core Version</span>
                <span className="px-2 py-1 bg-yellow-200 text-xs font-bold border border-black">DISPLAY ONLY</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="px-2 py-1 bg-gray-100 border border-black">{songTasks.length} tasks</span>
                <span className="px-2 py-1 bg-green-100 border border-black">{songProgressValue}%</span>
              </div>
            </div>
            
            {/* Core Version Expanded Content - All values from Song Information */}
            {expandedVersions['core-display'] && (
              <div className="p-4 border-t-2 border-black">
                <div className="p-3 bg-yellow-100 border-2 border-yellow-400 text-xs font-bold mb-3">
                  ⓘ Core Version displays Song Information values. Edit the Song Information section above to update.
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1 opacity-60">Song Title</label>
                    <div className="px-3 py-2 bg-gray-100 border-2 border-gray-300 text-sm">{form.title || 'Untitled'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1 opacity-60">Release Date</label>
                    <div className="px-3 py-2 bg-gray-100 border-2 border-gray-300 text-sm">{earliestReleaseDate || form.releaseDate || 'Not Set'}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-bold uppercase mb-1 opacity-60">Video Types</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(form.videoTypes || {}).filter(([, enabled]) => enabled).map(([key]) => (
                      <span key={key} className="px-2 py-1 bg-gray-200 border border-gray-400 text-xs font-bold capitalize">{key}</span>
                    ))}
                    {(!form.videoTypes || Object.values(form.videoTypes).every(val => !val)) && <span className="text-xs opacity-50">None selected</span>}
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-bold uppercase mb-1 opacity-60">Instruments</label>
                  <div className="flex flex-wrap gap-2">
                    {(form.instrumentData || (form.instruments || []).map(name => ({ name }))).map((inst, idx) => (
                      <span key={`${inst.name}-${idx}`} className="px-2 py-1 bg-gray-200 border border-gray-400 text-xs font-bold">{inst.name}</span>
                    ))}
                    {(form.instruments || []).length === 0 && (!form.instrumentData || form.instrumentData.length === 0) && <span className="text-xs opacity-50">None</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Other Versions (non-core) */}
          {(currentSong.versions || []).filter(v => v.id !== 'core').map(v => {
            const versionTaskCount = (v.tasks || []).length + (v.customTasks || []).length;
            const versionProgress = calculateTaskProgress([...(v.tasks || []), ...(v.customTasks || [])]).progress;
            const isExpanded = expandedVersions[v.id];
            
            return (
              <div key={v.id} className="border-2 border-black bg-white">
                {/* Collapsed header - Version Name and task count */}
                <div 
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleVersionExpand(v.id)}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={isExpanded ? "ChevronDown" : "ChevronRight"} size={16} />
                    <span className="font-bold">{v.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-2 py-1 bg-gray-100 border border-black">{versionTaskCount} tasks</span>
                    <span className="px-2 py-1 bg-green-100 border border-black">{versionProgress}%</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete this version?')) actions.deleteSongVersion(song.id, v.id); }} 
                      className="p-1 text-red-500 hover:bg-red-100"
                    >
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Expanded content for non-core versions */}
                {isExpanded && (
                  <div className="p-4 border-t-2 border-black">
                    
                    {/* Is Single? flag per spec */}
                    <div className="mb-4">
                      <label className="flex items-center gap-2 font-bold text-sm">
                        <input 
                          type="checkbox" 
                          checked={v.isSingle || false} 
                          onChange={e => actions.updateSongVersion(song.id, v.id, { isSingle: e.target.checked })} 
                          className="w-4 h-4"
                        />
                        Is Single?
                      </label>
                    </div>
                    
                    {/* Video Checkboxes - all video types per spec B.4 */}
                    <div className="mb-4 p-3 bg-gray-50 border border-black">
                      <div className="text-xs font-bold uppercase mb-2">Video Types (check to create Video Item)</div>
                      <div className="flex flex-wrap gap-4 text-xs">
                        {[
                          { key: 'music', label: 'Music Video' },
                          { key: 'lyric', label: 'Lyric Video' },
                          { key: 'enhancedLyric', label: 'Enhanced Lyric' },
                          { key: 'loop', label: 'Loop Video' },
                          { key: 'visualizer', label: 'Visualizer' },
                          { key: 'live', label: 'Live Video' },
                          { key: 'custom', label: 'Custom' }
                        ].map(type => (
                          <label key={type.key} className="flex items-center gap-1 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={v.videoTypes?.[type.key] || false} 
                              onChange={e => handleVideoTypeToggle(v.id, type.key, e.target.checked)} 
                              className="w-4 h-4"
                            />
                            {type.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {/* Exclusivity per spec */}
                    <div className="mb-4">
                      <label className="flex items-center gap-2 font-bold text-sm mb-2">
                        <input 
                          type="checkbox" 
                          checked={v.hasExclusivity || false} 
                          onChange={e => actions.updateSongVersion(song.id, v.id, { hasExclusivity: e.target.checked })} 
                          className="w-4 h-4"
                        />
                        Has Exclusivity
                      </label>
                      {v.hasExclusivity && (
                        <div className="grid md:grid-cols-3 gap-2 pl-6">
                          <div>
                            <label className="block text-xs font-bold uppercase mb-1">Start Date</label>
                            <input type="date" value={v.exclusiveStartDate || ''} onChange={e => actions.updateSongVersion(song.id, v.id, { exclusiveStartDate: e.target.value })} className={cn("w-full text-xs", THEME.punk.input)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase mb-1">End Date</label>
                            <input type="date" value={v.exclusiveEndDate || ''} onChange={e => actions.updateSongVersion(song.id, v.id, { exclusiveEndDate: e.target.value })} className={cn("w-full text-xs", THEME.punk.input)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
                            <input value={v.exclusiveNotes || ''} onChange={e => actions.updateSongVersion(song.id, v.id, { exclusiveNotes: e.target.value })} placeholder="Platform, terms..." className={cn("w-full text-xs", THEME.punk.input)} />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Instruments */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold uppercase mb-1">Instruments</label>
                      <input value={(v.instruments || []).join(', ')} onChange={e => actions.updateSongVersion(song.id, v.id, { instruments: e.target.value.split(',').map(i => i.trim()).filter(Boolean) })} className={cn("w-full", THEME.punk.input)} placeholder="guitar, synth, drums" />
                    </div>
                    
                    {/* Musicians */}
                    <div className="mb-4">
                      <div className="text-xs font-bold uppercase mb-2">Musicians</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <select value={newVersionMusicians[v.id]?.memberId || ''} onChange={e => setNewVersionMusicians(prev => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), memberId: e.target.value } }))} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
                          <option value="">Select Member</option>
                          {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <input value={newVersionMusicians[v.id]?.instruments || ''} onChange={e => setNewVersionMusicians(prev => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), instruments: e.target.value } }))} placeholder="instruments" className={cn("px-2 py-1 text-xs", THEME.punk.input)} />
                        <button onClick={() => {
                          const entry = newVersionMusicians[v.id];
                          if (!entry?.memberId) return;
                          actions.addVersionMusician(song.id, v.id, { id: crypto.randomUUID(), memberId: entry.memberId, instruments: (entry.instruments || '').split(',').map(i => i.trim()).filter(Boolean) });
                          setNewVersionMusicians(prev => ({ ...prev, [v.id]: { memberId: '', instruments: '' } }));
                        }} className={cn("px-2 py-1 text-xs", THEME.punk.btn, "bg-black text-white")}>Add</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(v.musicians || []).map(m => {
                          const member = teamMembers.find(tm => tm.id === m.memberId);
                          return (
                            <span key={m.id} className="px-2 py-1 border-2 border-black bg-blue-100 text-xs font-bold flex items-center gap-2">
                              {member?.name || 'Member'} — {(m.instruments || []).join(', ')}
                              <button onClick={() => actions.removeVersionMusician(song.id, v.id, m.id)} className="text-red-600">×</button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Attached Releases */}
                    <div className="mb-4">
                      <div className="text-xs font-bold uppercase mb-2">Attached Releases</div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <select onChange={e => actions.attachVersionToRelease(song.id, v.id, e.target.value, data.releases.find(r => r.id === e.target.value)?.releaseDate)} className={cn("px-2 py-1 text-xs", THEME.punk.input)} value="">
                          <option value="">Attach to release...</option>
                          {(data.releases || []).filter(r => !(v.releaseIds || []).includes(r.id)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        {(v.releaseIds || []).map(rid => {
                          const rel = data.releases.find(r => r.id === rid);
                          return (
                            <span key={rid} className="px-2 py-1 border-2 border-black bg-yellow-100 text-xs font-bold flex items-center gap-1">
                              {rel?.name || 'Release'} — {rel?.releaseDate || 'TBD'}
                              <button onClick={() => actions.detachVersionFromRelease(song.id, v.id, rid)} className="text-red-600 ml-1">×</button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Era per spec Section C */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold uppercase mb-1">Era</label>
                      <select 
                        value={(v.eraIds || [])[0] || ''} 
                        onChange={e => actions.updateSongVersion(song.id, v.id, { eraIds: e.target.value ? [e.target.value] : [] })}
                        className={cn("w-full", THEME.punk.input)}
                      >
                        <option value="">No Era</option>
                        {(data.eras || []).map(era => <option key={era.id} value={era.id}>{era.name}</option>)}
                      </select>
                    </div>
                    
                    {/* Stage per spec Section C */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold uppercase mb-1">Stage</label>
                      <select 
                        value={(v.stageIds || [])[0] || ''} 
                        onChange={e => actions.updateSongVersion(song.id, v.id, { stageIds: e.target.value ? [e.target.value] : [] })}
                        className={cn("w-full", THEME.punk.input)}
                      >
                        <option value="">No Stage</option>
                        {(data.stages || []).map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                      </select>
                    </div>
                    
                    {/* Tags per spec Section C */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold uppercase mb-1">Tags</label>
                      <input 
                        value={(v.tags || []).join(', ')} 
                        onChange={e => actions.updateSongVersion(song.id, v.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} 
                        placeholder="comma-separated tags" 
                        className={cn("w-full", THEME.punk.input)} 
                      />
                    </div>
                    
                    {/* Notes per spec Section C */}
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Notes</label>
                      <textarea value={v.notes || ''} onChange={e => actions.updateSongVersion(song.id, v.id, { notes: e.target.value })} className={cn("w-full h-16", THEME.punk.input)} placeholder="Mix differences, edits, era..." />
                    </div>
                    {/* Version name and release date */}
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">Version Name</label>
                        <input value={v.name} onChange={e => actions.updateSongVersion(song.id, v.id, { name: e.target.value })} className={cn("w-full", THEME.punk.input)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">Release Date</label>
                        <input type="date" value={v.releaseDate || ''} onChange={e => actions.updateSongVersion(song.id, v.id, { releaseDate: e.target.value })} className={cn("w-full", THEME.punk.input)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION D: Tasks Module - All tasks from song and versions per spec */}
      {/* Issues #7, #8, #9, #10, #11, #12, #13, #14: Unified task system with proper behavior */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex flex-wrap justify-between items-center mb-4 border-b-4 border-black pb-2 gap-2">
          <h3 className="font-black uppercase">Tasks</h3>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Task Filters - Issue #12: Remove Category filter */}
            <select value={taskFilterStatus} onChange={e => setTaskFilterStatus(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Task Sorting */}
            <select value={taskSortBy} onChange={e => setTaskSortBy(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="date">Sort by Date</option>
              <option value="type">Sort by Type</option>
              <option value="status">Sort by Status</option>
            </select>
            <button onClick={() => setTaskSortDir(taskSortDir === 'asc' ? 'desc' : 'asc')} className={cn("px-2 py-1 text-xs", THEME.punk.btn)}>
              {taskSortDir === 'asc' ? '↑' : '↓'}
            </button>
            <button onClick={handleRecalculateDeadlines} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-blue-500 text-white")}>Recalculate</button>
            {/* Issue #7: Custom Task Button - integrated into main task list */}
            <button 
              onClick={() => {
                // Create a new custom task using the unified task system (Issue #9)
                const newCustomTask = {
                  title: 'New Task',
                  date: '',
                  description: '',
                  estimatedCost: 0,
                  status: 'Not Started',
                  notes: '',
                  isAutoTask: false
                };
                handleOpenTaskEdit(newCustomTask, { type: 'new-custom' });
              }} 
              className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-green-600 text-white")}
            >
              + Add Task
            </button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-3 text-[10px] font-bold">
          <span className="px-2 py-1 bg-yellow-100 border-2 border-black">Core Song</span>
          <span className="px-2 py-1 bg-green-100 border-2 border-black">Custom Task</span>
          {(currentSong.versions || []).filter(v => v.id !== 'core').map(v => (
            <span key={v.id} className="px-2 py-1 bg-blue-100 border-2 border-black">{v.name}</span>
          ))}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {/* Issue #10, #12, #13: Simplified columns - removed Category, duplicate date, and Assigned column */}
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left">Version</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('type'); setTaskSortDir(taskSortBy === 'type' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Task {taskSortBy === 'type' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('date'); setTaskSortDir(taskSortBy === 'date' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Due Date {taskSortBy === 'date' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('status'); setTaskSortDir(taskSortBy === 'status' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Status {taskSortBy === 'status' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
              </tr>
            </thead>
            <tbody>
              {/* All tasks (song tasks + custom tasks + version tasks) - Issues #8, #9: Unified display */}
              {(() => {
                // Combine all tasks into one unified list
                const allTasks = [
                  // Core song tasks (auto-generated)
                  ...filteredSongTasks.map(task => ({ ...task, _source: 'core', _isAuto: true })),
                  // Custom tasks - now integrated into main list (Issue #8)
                  ...songCustomTasks.map(task => ({ ...task, _source: 'custom', _isAuto: false })),
                  // Version tasks
                  ...(currentSong.versions || []).filter(v => v.id !== 'core').flatMap(v => 
                    [...(v.tasks || []), ...(v.customTasks || [])].map(task => ({ ...task, _source: 'version', _versionId: v.id, _versionName: v.name, _isAuto: !task.title?.includes('Custom') }))
                  )
                ];
                
                // Sort tasks
                allTasks.sort((a, b) => {
                  const valA = a[taskSortBy] || '';
                  const valB = b[taskSortBy] || '';
                  return taskSortDir === 'asc' 
                    ? (valA < valB ? -1 : valA > valB ? 1 : 0)
                    : (valA > valB ? -1 : valA < valB ? 1 : 0);
                });
                
                if (allTasks.length === 0) {
                  return <tr><td colSpan="4" className="p-4 text-center opacity-50">No tasks yet. Set a release date and click Recalculate, or add a custom task.</td></tr>;
                }
                
                return allTasks.map(task => {
                  const isOverdue = task.date && new Date(task.date) < new Date() && task.status !== 'Complete' && task.status !== 'Done';
                  const isDueSoon = task.date && !isOverdue && new Date(task.date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && task.status !== 'Complete' && task.status !== 'Done';
                  const isAutoTask = task._isAuto;
                  
                  const getSourceLabel = () => {
                    if (task._source === 'core') return { bg: 'bg-yellow-200', text: 'Core' };
                    if (task._source === 'custom') return { bg: 'bg-green-200', text: 'Custom' };
                    if (task._source === 'version') return { bg: 'bg-blue-200', text: task._versionName || 'Version' };
                    return { bg: 'bg-gray-200', text: 'Unknown' };
                  };
                  const sourceLabel = getSourceLabel();
                  
                  return (
                    // Issue #10: Entire row is clickable to open Task Edit/More Info Page
                    <tr 
                      key={`${task._source}-${task.id}`} 
                      className={cn(
                        "border-b border-gray-200 cursor-pointer hover:bg-gray-100",
                        isOverdue ? "bg-red-50" : task._source === 'core' ? "bg-yellow-50" : task._source === 'custom' ? "bg-green-50" : "bg-blue-50"
                      )}
                      onClick={() => handleOpenTaskEdit(task, { 
                        type: task._source === 'core' ? 'song' : task._source === 'custom' ? 'custom' : 'version', 
                        versionId: task._versionId 
                      })}
                    >
                      <td className="p-2">
                        <span className={cn("px-2 py-1 text-xs font-bold border border-black", sourceLabel.bg)}>
                          {sourceLabel.text}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{task.type || task.title}</span>
                          {isAutoTask && <span className="text-[10px] text-blue-500">(auto)</span>}
                          {task.isOverridden && <span className="text-[10px] text-orange-500">(edited)</span>}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs", isOverdue && "text-red-600 font-bold", isDueSoon && "text-yellow-600 font-bold")}>
                            {task.date || '-'}
                          </span>
                          {isOverdue && <span className="px-1 py-0.5 bg-red-200 border border-red-500 text-red-800 text-[10px] font-bold">OVERDUE</span>}
                          {isDueSoon && <span className="px-1 py-0.5 bg-yellow-200 border border-yellow-500 text-yellow-800 text-[10px] font-bold">SOON</span>}
                        </div>
                      </td>
                      <td className="p-2" onClick={e => e.stopPropagation()}>
                        {/* Issue #14: Status is the ONLY inline-editable field */}
                        <select 
                          value={task.status || 'Not Started'} 
                          onChange={e => {
                            if (task._source === 'core') {
                              handleDeadlineChange(task.id, 'status', e.target.value);
                            } else if (task._source === 'custom') {
                              actions.updateSongCustomTask(song.id, task.id, { status: e.target.value });
                            } else if (task._source === 'version') {
                              actions.updateVersionTask(song.id, task._versionId, task.id, { status: e.target.value });
                            }
                          }} 
                          className="border-2 border-black p-1 text-xs"
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      {/* Issue #10: Removed Assigned column - assignments are shown in Task Edit modal */}
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue #15: Cost Summary module REMOVED - costs are displayed in the Song Information section above */}

      {/* Song Task More/Edit Info Page Modal - Per spec Section 3 */}
      {/* Issue #11: AutoTasks have locked Name/Due Date fields with override option */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => { setEditingTask(null); setEditingTaskContext(null); }}>
          <div className={cn("w-full max-w-lg p-6 bg-white max-h-[90vh] overflow-y-auto", THEME.punk.card)} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
              <h3 className="font-black uppercase">
                {editingTaskContext?.type === 'new-custom' ? 'Add Custom Task' : 'Edit Task'}
              </h3>
              <button onClick={() => { setEditingTask(null); setEditingTaskContext(null); }} className="p-1 hover:bg-gray-200"><Icon name="X" size={16} /></button>
            </div>

            <div className="space-y-4">
              {/* Issue #9, #11: AutoTask indicator with locked fields and override warning */}
              {(() => {
                // Use helper function for consistent auto-task detection
                const isAutoTask = isTaskAutoGenerated(editingTask, editingTaskContext?.type);
                const canEditLockedFields = editingTask.isOverridden || !isAutoTask;
                
                return (
                  <>
                    {isAutoTask && (
                      <div className="p-3 bg-blue-50 border-2 border-blue-300 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold">AutoTask</span>
                            <span className="ml-2 opacity-75">Name and Due Date are locked. Override to edit.</span>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={editingTask.isOverridden || false}
                              onChange={e => {
                                if (e.target.checked && !editingTask.isOverridden) {
                                  // Issue #9: Show warning when enabling override
                                  if (!confirm('Warning: If you override these fields, this Task will no longer be treated as an AutoTask and will not auto-update when dates change. Continue?')) {
                                    return;
                                  }
                                  // Convert to non-AutoTask
                                  setEditingTask(prev => ({ ...prev, isOverridden: true, isAutoTask: false }));
                                } else {
                                  setEditingTask(prev => ({ ...prev, isOverridden: e.target.checked }));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className="font-bold">Override</span>
                          </label>
                        </div>
                        {editingTask.isOverridden && (
                          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-800 font-bold">
                            ⚠️ This task is now overridden and will not auto-update.
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Task Name */}
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">
                        Task Name {!canEditLockedFields && <span className="text-blue-500">(locked)</span>}
                      </label>
                      <input 
                        value={editingTask.type || editingTask.title || ''} 
                        onChange={e => setEditingTask(prev => ({ ...prev, type: e.target.value, title: e.target.value }))} 
                        className={cn("w-full", THEME.punk.input, !canEditLockedFields && "bg-gray-100 cursor-not-allowed")}
                        disabled={!canEditLockedFields}
                      />
                    </div>

                    {/* Task Due Date */}
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">
                        Due Date {!canEditLockedFields && <span className="text-blue-500">(locked)</span>}
                      </label>
                      <input 
                        type="date" 
                        value={editingTask.date || editingTask.dueDate || ''} 
                        onChange={e => setEditingTask(prev => ({ ...prev, date: e.target.value, dueDate: e.target.value }))} 
                        className={cn("w-full", THEME.punk.input, !canEditLockedFields && "bg-gray-100 cursor-not-allowed")}
                        disabled={!canEditLockedFields}
                      />
                    </div>
                  </>
                );
              })()}

              {/* Team Member Assignment */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Team Members</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(editingTask.assignedMembers || []).map((m, idx) => {
                    const member = teamMembers.find(tm => tm.id === m.memberId);
                    return (
                      <span key={idx} className="px-2 py-1 border-2 border-black bg-purple-100 text-xs font-bold flex items-center gap-2">
                        {member?.name || 'Member'} {m.instrument ? `• ${m.instrument}` : ''} ({formatMoney(m.cost)})
                        <button onClick={() => setEditingTask(prev => ({
                          ...prev,
                          assignedMembers: prev.assignedMembers.filter((_, i) => i !== idx)
                        }))} className="text-red-600">×</button>
                      </span>
                    );
                  })}
                </div>
                <div className="flex gap-2 items-center">
                  <select 
                    value={newAssignments.modal?.memberId || ''} 
                    onChange={e => setNewAssignments(prev => ({ ...prev, modal: { ...(prev.modal || {}), memberId: e.target.value } }))} 
                    className={cn("flex-1 text-xs", THEME.punk.input)}
                  >
                    <option value="">Select member...</option>
                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input
                    type="number"
                    value={newAssignments.modal?.cost || ''}
                    onChange={e => setNewAssignments(prev => ({ ...prev, modal: { ...(prev.modal || {}), cost: e.target.value } }))} 
                    placeholder="Cost" 
                    className={cn("w-20 text-xs", THEME.punk.input)}
                  />
                  <button 
                    onClick={() => {
                      const entry = newAssignments.modal;
                      if (!entry?.memberId) return;
                      setEditingTask(prev => ({
                        ...prev,
                        assignedMembers: [...(prev.assignedMembers || []), { 
                          memberId: entry.memberId, 
                          cost: parseFloat(entry.cost) || 0, 
                          instrument: entry.instrument || '' 
                        }]
                      }));
                      setNewAssignments(prev => ({ ...prev, modal: { memberId: '', cost: 0, instrument: '' } }));
                    }} 
                    className={cn("px-3 py-2 text-xs", THEME.punk.btn, "bg-purple-600 text-white")}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Cost Fields - Estimated, Quoted, Paid */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Estimated</label>
                  <input 
                    type="number" 
                    value={editingTask.estimatedCost || 0} 
                    onChange={e => setEditingTask(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))} 
                    className={cn("w-full text-sm", THEME.punk.input)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Quoted</label>
                  <input 
                    type="number" 
                    value={editingTask.quotedCost || 0} 
                    onChange={e => setEditingTask(prev => ({ ...prev, quotedCost: parseFloat(e.target.value) || 0 }))} 
                    className={cn("w-full text-sm", THEME.punk.input)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Paid</label>
                  <input 
                    type="number" 
                    value={editingTask.paidCost || 0} 
                    onChange={e => setEditingTask(prev => ({ ...prev, paidCost: parseFloat(e.target.value) || 0 }))} 
                    className={cn("w-full text-sm", THEME.punk.input)} 
                  />
                </div>
              </div>

              {/* Partial Payment checkbox */}
              <div>
                <label className="flex items-center gap-2 font-bold text-sm">
                  <input 
                    type="checkbox" 
                    checked={editingTask.partiallyPaid || false} 
                    onChange={e => setEditingTask(prev => ({ ...prev, partiallyPaid: e.target.checked }))} 
                    className="w-4 h-4"
                  />
                  Partial Payment
                </label>
              </div>

              {/* Task Status */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Status *</label>
                <select
                  value={editingTask.status || 'Not Started'}
                  onChange={e => setEditingTask(prev => ({ ...prev, status: e.target.value }))}
                  className={cn("w-full", THEME.punk.input)}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Issue #7: Era and Stage for Song Tasks */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Era</label>
                  <select
                    value={(editingTask.eraIds || [])[0] || ''}
                    onChange={e => setEditingTask(prev => ({ ...prev, eraIds: e.target.value ? [e.target.value] : [] }))}
                    className={cn("w-full", THEME.punk.input)}
                  >
                    <option value="">No Era</option>
                    {(data.eras || []).map(era => <option key={era.id} value={era.id}>{era.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Stage</label>
                  <select
                    value={(editingTask.stageIds || [])[0] || ''}
                    onChange={e => setEditingTask(prev => ({ ...prev, stageIds: e.target.value ? [e.target.value] : [] }))}
                    className={cn("w-full", THEME.punk.input)}
                  >
                    <option value="">No Stage</option>
                    {(data.stages || []).map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Tags</label>
                <input 
                  value={(editingTask.tags || []).join(', ')} 
                  onChange={e => setEditingTask(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} 
                  placeholder="comma-separated tags" 
                  className={cn("w-full", THEME.punk.input)} 
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Notes</label>
                <textarea 
                  value={editingTask.notes || editingTask.description || ''} 
                  onChange={e => setEditingTask(prev => ({ ...prev, notes: e.target.value, description: e.target.value }))} 
                  className={cn("w-full h-20", THEME.punk.input)} 
                  placeholder="Additional details..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-6 pt-4 border-t-4 border-black">
              <button onClick={handleSaveTaskEdit} className={cn("flex-1 px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>
                Save Changes
              </button>
              <button onClick={() => { setEditingTask(null); setEditingTaskContext(null); }} className={cn("px-4 py-2", THEME.punk.btn, "bg-gray-500 text-white")}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Global Tasks View (Spec 2.3) - Phase 4: Enhanced with archived/done filtering
// Per APP ARCHITECTURE.txt Section 1.2: Task Categories as Items
export const GlobalTasksView = () => {
  const { data, actions } = useStore();
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArchived, setFilterArchived] = useState('active'); // 'all', 'active', 'archived', 'done'
  const [searchText, setSearchText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({ taskName: '', category: 'Other', date: '', description: '', assignedTo: '', status: 'Not Started', estimatedCost: 0, notes: '' });
  const [newAssignments, setNewAssignments] = useState({});
  const [newCategory, setNewCategory] = useState({ name: '', color: '#000000', description: '' });

  const teamMembers = data.teamMembers || [];
  
  // Phase 5.1: Categories are user-created Items only - no prefilled categories
  const allCategories = useMemo(() => {
    return (data.taskCategories || []).map(c => ({ ...c, isLegacy: false }));
  }, [data.taskCategories]);

  const taskBudget = (task = {}) => {
    if (task.paidCost !== undefined) return task.paidCost || 0;
    if (task.actualCost !== undefined) return task.actualCost || 0;
    if (task.quotedCost !== undefined) return task.quotedCost || 0;
    return task.estimatedCost || 0;
  };

  const addAssignment = (taskKey, taskObj, updater) => {
    const entry = newAssignments[taskKey] || { memberId: '', cost: 0, instrument: '' };
    const budget = taskBudget(taskObj);
    const current = (taskObj.assignedMembers || []).reduce((s, m) => s + (parseFloat(m.cost) || 0), 0);
    const nextTotal = current + (parseFloat(entry.cost) || 0);
    if (budget > 0 && nextTotal > budget) return;
    const updatedMembers = [...(taskObj.assignedMembers || []), { memberId: entry.memberId, cost: parseFloat(entry.cost) || 0, instrument: entry.instrument || '' }];
    updater(updatedMembers);
    setNewAssignments(prev => ({ ...prev, [taskKey]: { memberId: '', cost: 0, instrument: '' } }));
  };

  const tasks = useMemo(() => {
    let filtered = [...(data.globalTasks || [])];
    
    // Phase 4: Archived/done filtering
    if (filterArchived === 'active') {
      filtered = filtered.filter(t => !t.isArchived && t.status !== 'Done');
    } else if (filterArchived === 'archived') {
      filtered = filtered.filter(t => t.isArchived);
    } else if (filterArchived === 'done') {
      filtered = filtered.filter(t => t.status === 'Done');
    }
    // 'all' shows everything
    
    if (filterCategory !== 'all') {
      // Match by category name (dropdown uses category names as values)
      filtered = filtered.filter(t => t.category === filterCategory);
    }
    if (filterStatus !== 'all') filtered = filtered.filter(t => t.status === filterStatus);
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(t => (t.taskName || '').toLowerCase().includes(search) || (t.description || '').toLowerCase().includes(search));
    }
    filtered.sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      return sortDir === 'asc' ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    });
    return filtered;
  }, [data.globalTasks, sortBy, sortDir, filterCategory, filterStatus, filterArchived, searchText]);

  const handleAddTask = async () => {
    await actions.addGlobalTask(newTask);
    setNewTask({ taskName: '', category: 'Other', date: '', description: '', assignedTo: '', status: 'Not Started', estimatedCost: 0, notes: '' });
    setShowAddForm(false);
  };

  const handleUpdateTask = async () => {
    if (editingTask) { await actions.updateGlobalTask(editingTask.id, editingTask); setEditingTask(null); }
  };

  const handleDeleteTask = async (taskId) => {
    if (confirm('Delete this task?')) await actions.deleteGlobalTask(taskId);
  };

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };
  
  // Category management handlers
  const handleAddCategory = async () => {
    if (!newCategory.name) return;
    await actions.addTaskCategory(newCategory);
    setNewCategory({ name: '', color: '#000000', description: '' });
  };

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Global Tasks</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowCategoryManager(!showCategoryManager)} className={cn("px-4 py-2", THEME.punk.btn, showCategoryManager ? "bg-purple-500 text-white" : "bg-white")}>
            <Icon name="Folder" size={16} /> Categories
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>{showAddForm ? 'Cancel' : '+ Add Task'}</button>
        </div>
      </div>

      {/* Task Category Manager - Per APP ARCHITECTURE.txt Section 1.2 */}
      {showCategoryManager && (
        <div className={cn("p-6 mb-6", THEME.punk.card, "bg-purple-50")}>
          <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Task Categories</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <input 
              value={newCategory.name} 
              onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} 
              placeholder="Category Name" 
              className={cn("w-full", THEME.punk.input)} 
            />
            <input 
              type="color" 
              value={newCategory.color} 
              onChange={e => setNewCategory({ ...newCategory, color: e.target.value })} 
              className="w-full h-12 border-4 border-black" 
            />
            <button onClick={handleAddCategory} className={cn("px-4 py-2", THEME.punk.btn, "bg-purple-600 text-white")}>
              + Add Category
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allCategories.map(cat => (
              <div 
                key={cat.id} 
                className={cn("p-4 flex items-center justify-between", THEME.punk.card, cat.isLegacy ? "bg-gray-100" : "bg-white")}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 border-2 border-black" 
                    style={{ backgroundColor: cat.color || '#000' }} 
                  />
                  <div>
                    <div className="font-bold">{cat.name}</div>
                    <div className="text-xs opacity-60">
                      {cat.isLegacy ? 'Default Category' : 'Custom Category'}
                      {' • '}
                      {(data.globalTasks || []).filter(t => t.category === cat.name || t.categoryId === cat.id).length} tasks
                    </div>
                  </div>
                </div>
                {!cat.isLegacy && (
                  <button 
                    onClick={() => { if (confirm('Delete this category?')) actions.deleteTaskCategory(cat.id); }} 
                    className="p-2 text-red-500 hover:bg-red-50"
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search tasks..." className={cn("px-3 py-2 flex-1 min-w-[200px]", THEME.punk.input)} />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
          <option value="all">All Categories</option>
          {allCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {/* Phase 4: Archived/Done filter */}
        <select value={filterArchived} onChange={e => setFilterArchived(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
          <option value="active">Active Tasks</option>
          <option value="done">Done</option>
          <option value="archived">Archived</option>
          <option value="all">All Tasks</option>
        </select>
      </div>

      {showAddForm && (
        <div className={cn("p-6 mb-6 bg-gray-50", THEME.punk.card)}>
          <h3 className="font-black uppercase mb-4">New Task</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <input value={newTask.taskName} onChange={e => setNewTask({ ...newTask, taskName: e.target.value })} placeholder="Task Name" className={cn("w-full", THEME.punk.input)} />
            <select value={newTask.category} onChange={e => setNewTask({ ...newTask, category: e.target.value })} className={cn("w-full", THEME.punk.input)}>
              {allCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <input type="date" value={newTask.date} onChange={e => setNewTask({ ...newTask, date: e.target.value })} className={cn("w-full", THEME.punk.input)} />
            <input value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })} placeholder="Assigned To" className={cn("w-full", THEME.punk.input)} />
            <input type="number" value={newTask.estimatedCost} onChange={e => setNewTask({ ...newTask, estimatedCost: parseFloat(e.target.value) || 0 })} placeholder="Estimated Cost" className={cn("w-full", THEME.punk.input)} />
            <select value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })} className={cn("w-full", THEME.punk.input)}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <input value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Description" className={cn("w-full md:col-span-2", THEME.punk.input)} />
            <button onClick={handleAddTask} className={cn("px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>Add Task</button>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={cn("w-full max-w-lg p-6 bg-white", THEME.punk.card)}>
            <h3 className="font-black uppercase mb-4">Edit Task</h3>
            <div className="grid gap-4">
              <input value={editingTask.taskName} onChange={e => setEditingTask({ ...editingTask, taskName: e.target.value })} placeholder="Task Name" className={cn("w-full", THEME.punk.input)} />
              <select value={editingTask.category} onChange={e => setEditingTask({ ...editingTask, category: e.target.value })} className={cn("w-full", THEME.punk.input)}>
                {allCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input type="date" value={editingTask.date} onChange={e => setEditingTask({ ...editingTask, date: e.target.value })} className={cn("w-full", THEME.punk.input)} />
              <input value={editingTask.assignedTo} onChange={e => setEditingTask({ ...editingTask, assignedTo: e.target.value })} placeholder="Assigned To" className={cn("w-full", THEME.punk.input)} />
              <input type="number" value={editingTask.estimatedCost} onChange={e => setEditingTask({ ...editingTask, estimatedCost: parseFloat(e.target.value) || 0 })} className={cn("w-full", THEME.punk.input)} />
              <select value={editingTask.status} onChange={e => setEditingTask({ ...editingTask, status: e.target.value })} className={cn("w-full", THEME.punk.input)}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <input value={editingTask.description} onChange={e => setEditingTask({ ...editingTask, description: e.target.value })} placeholder="Description" className={cn("w-full", THEME.punk.input)} />
              <div className="flex gap-2">
                <button onClick={handleUpdateTask} className={cn("flex-1 px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>Save</button>
                <button onClick={() => setEditingTask(null)} className={cn("flex-1 px-4 py-2 bg-gray-300", THEME.punk.btn)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={cn("overflow-x-auto", THEME.punk.card)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('date')}>Date</th>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('taskName')}>Task Name</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Assigned To</th>
              <th className="p-3 text-right">Est. Cost</th>
              <th className="p-3 text-left">Team Assignments</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan="9" className="p-10 text-center opacity-50">No global tasks yet.</td></tr>
            ) : tasks.map(task => (
              <tr key={task.id} className="border-b border-gray-200 hover:bg-yellow-50">
                <td className="p-3">{task.date || '-'}</td>
                <td className="p-3 font-bold">{task.taskName}</td>
                <td className="p-3">{task.category}</td>
                <td className="p-3 max-w-xs truncate">{task.description}</td>
                <td className="p-3">{task.assignedTo || '-'}</td>
                <td className="p-3 text-right">{formatMoney(task.estimatedCost || 0)}</td>
                <td className="p-3 text-xs space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {(task.assignedMembers || []).map(m => {
                      const member = teamMembers.find(tm => tm.id === m.memberId);
                      return <span key={m.memberId + m.cost + (m.instrument || '')} className="px-2 py-1 border-2 border-black bg-purple-100 font-bold text-xs">{member?.name || 'Member'} {m.instrument ? `• ${m.instrument}` : ''} ({formatMoney(m.cost)})</span>;
                    })}
                  </div>
                  <div className="flex gap-1 items-center">
                    <select value={newAssignments[task.id]?.memberId || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), memberId: e.target.value } }))} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
                      <option value="">Assign member</option>
                      {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input type="number" value={newAssignments[task.id]?.cost || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), cost: e.target.value } }))} placeholder="Cost" className={cn("px-2 py-1 text-xs w-20", THEME.punk.input)} />
                    <input value={newAssignments[task.id]?.instrument || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), instrument: e.target.value } }))} placeholder="Instrument" className={cn("px-2 py-1 text-xs w-28", THEME.punk.input)} />
                    <button onClick={() => addAssignment(task.id, task, (assignedMembers) => actions.updateGlobalTask(task.id, { assignedMembers }))} className={cn("px-2 py-1 text-xs", THEME.punk.btn, "bg-pink-600 text-white")}>Add</button>
                    {taskBudget(task) > 0 && <span className="text-[10px] font-bold">Remaining: {formatMoney(taskBudget(task) - (task.assignedMembers || []).reduce((s, m) => s + (m.cost || 0), 0))}</span>}
                  </div>
                </td>
                <td className="p-3"><span className={cn(
                  "px-2 py-1 text-xs font-bold",
                  task.status === 'Done'
                    ? 'bg-green-200'
                    : task.status === 'In Progress'
                      ? 'bg-blue-200'
                      : task.status === 'Delayed'
                        ? 'bg-red-200'
                        : 'bg-gray-200'
                )}>{task.status}</span></td>
                <td className="p-3 text-center">
                  <button onClick={() => setEditingTask({ ...task })} className="p-1 hover:bg-blue-100 text-blue-500 mr-1" title="Edit"><Icon name="Settings" size={14} /></button>
                  <button onClick={() => actions.updateGlobalTask(task.id, { isArchived: !task.isArchived })} className={cn("p-1 mr-1", task.isArchived ? "hover:bg-green-100 text-green-500" : "hover:bg-yellow-100 text-yellow-600")} title={task.isArchived ? "Restore" : "Archive"}><Icon name="Archive" size={14} /></button>
                  <button onClick={() => handleDeleteTask(task.id)} className="p-1 hover:bg-red-100 text-red-500" title="Delete"><Icon name="Trash2" size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Releases List View (Spec 2.4) - Section 2: Enhanced with Grid/List Toggle
// Phase 3: Enhanced Display Information (Number of Tracks, Tracks Completed, Track Progress %, Has Physical)
export const ReleasesListView = ({ onSelectRelease }) => {
  const { data, actions } = useStore();
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid' - Tier 1.1: Grid/List Toggle

  const handleAddRelease = async () => {
    const newRelease = await actions.addRelease({ name: 'New Release', type: 'Album', releaseDate: '', estimatedCost: 0, notes: '' });
    if (onSelectRelease) onSelectRelease(newRelease);
  };

  const releases = data.releases || [];
  
  // Calculate progress for each release
  const releaseProgress = (release) => {
    const tasks = [...(release.tasks || []), ...(release.customTasks || [])];
    return calculateTaskProgress(tasks).progress;
  };
  
  // Phase 3.1: Calculate track statistics
  const getTrackStats = (release) => {
    const tracks = release.tracks || [];
    const totalTracks = tracks.length;
    
    if (totalTracks === 0) {
      return { total: 0, completed: 0, remaining: 0, progress: 0 };
    }
    
    let completedTracks = 0;
    
    tracks.forEach(track => {
      if (track.isExternal) {
        // External tracks count as complete
        completedTracks++;
      } else if (track.songId) {
        const song = (data.songs || []).find(s => s.id === track.songId);
        if (song) {
          // Check if all selected versions are complete
          const versionIds = track.versionIds || [];
          if (versionIds.length === 0) {
            // If no versions specified, check core version (song deadlines)
            const songTasks = [...(song.deadlines || []), ...(song.customTasks || [])];
            const songProgress = calculateTaskProgress(songTasks).progress;
            if (songProgress >= 100) completedTracks++;
          } else {
            // Check if all specified versions are complete
            let allVersionsComplete = true;
            versionIds.forEach(vId => {
              const version = (song.versions || []).find(v => v.id === vId);
              if (version) {
                const versionTasks = [...(version.tasks || []), ...(version.customTasks || [])];
                const vProgress = calculateTaskProgress(versionTasks).progress;
                if (vProgress < 100) allVersionsComplete = false;
              }
            });
            if (allVersionsComplete) completedTracks++;
          }
        }
      }
    });
    
    const remaining = totalTracks - completedTracks;
    const progress = totalTracks > 0 ? Math.round((completedTracks / totalTracks) * 100) : 0;
    
    return { total: totalTracks, completed: completedTracks, remaining, progress };
  };

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Releases</h2>
        <div className="flex gap-2">
          {/* Tier 1.1: Grid/List View Toggle */}
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          <button onClick={handleAddRelease} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Release</button>
        </div>
      </div>
      
      {/* Tier 1.1: Grid View - Phase 3 Enhanced */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {releases.length === 0 ? (
            <div className={cn("col-span-full p-10 text-center opacity-50", THEME.punk.card)}>No releases yet. Click Add Release to create one.</div>
          ) : (
            releases.map(release => {
              const trackStats = getTrackStats(release);
              return (
                <div 
                  key={release.id} 
                  onClick={() => onSelectRelease && onSelectRelease(release)} 
                  className={cn("p-4 cursor-pointer hover:bg-yellow-50", THEME.punk.card)}
                >
                  <div className="font-bold text-lg mb-2">{release.name}</div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="opacity-60">Type:</span>
                      <span className="font-bold">{release.type}{release.type === 'Other' && release.typeDetails ? ` (${release.typeDetails})` : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Release Date:</span>
                      <span className="font-bold">{release.releaseDate || 'TBD'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Task Progress:</span>
                      <span className="font-bold">{releaseProgress(release)}%</span>
                    </div>
                    {/* Phase 3.1: Track Info */}
                    <div className="flex justify-between">
                      <span className="opacity-60">Tracks:</span>
                      <span className="font-bold">{trackStats.completed}/{trackStats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Track Progress:</span>
                      <span className="font-bold">{trackStats.progress}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Has Physical:</span>
                      <span className={cn("font-bold", release.hasPhysicalCopies ? "text-green-600" : "text-gray-400")}>{release.hasPhysicalCopies ? 'YES' : 'NO'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {release.hasPhysicalCopies && <span className="px-2 py-1 bg-blue-200 text-blue-800 text-[10px] font-bold border border-blue-500">PHYSICAL</span>}
                    {release.hasExclusivity && <span className="px-2 py-1 bg-purple-200 text-purple-800 text-[10px] font-bold border border-purple-500">EXCLUSIVE</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* List View - Phase 3 Enhanced */
        <div className={cn("overflow-x-auto", THEME.punk.card)}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white">
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Release Date</th>
                <th className="p-3 text-center">Tracks</th>
                <th className="p-3 text-center">Track Progress</th>
                <th className="p-3 text-center">Physical</th>
                <th className="p-3 text-right">Task Progress</th>
                <th className="p-3 text-right">Estimated Cost</th>
              </tr>
            </thead>
            <tbody>
              {releases.length === 0 ? (
                <tr><td colSpan="8" className="p-10 text-center opacity-50">No releases yet. Click Add Release to create one.</td></tr>
              ) : releases.map(release => {
                const trackStats = getTrackStats(release);
                return (
                  <tr key={release.id} onClick={() => onSelectRelease && onSelectRelease(release)} className="border-b border-gray-200 hover:bg-yellow-50 cursor-pointer">
                    <td className="p-3 font-bold">{release.name}</td>
                    <td className="p-3">{release.type}{release.type === 'Other' && release.typeDetails ? ` (${release.typeDetails})` : ''}</td>
                    <td className="p-3">{release.releaseDate || '-'}</td>
                    <td className="p-3 text-center">{trackStats.completed}/{trackStats.total}</td>
                    <td className="p-3 text-center">{trackStats.progress}%</td>
                    <td className="p-3 text-center">{release.hasPhysicalCopies ? <span className="text-green-600 font-bold">YES</span> : <span className="text-gray-400">NO</span>}</td>
                    <td className="p-3 text-right">{releaseProgress(release)}%</td>
                    <td className="p-3 text-right">{formatMoney(release.estimatedCost || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Release Detail View (Spec 2.5) - Phase 3: Releases System Overhaul
// Includes: Enhanced Display Info, Exclusive YES/NO, Release Types with Other, Stage/Era/Tags, Tracks Module
export const ReleaseDetailView = ({ release, onBack, onSelectSong }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...release });
  // Phase 3.5: Tracks module state (replaces Required Recordings)
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [newTrack, setNewTrack] = useState({ songId: '', versionIds: [], isExternal: false, externalArtist: '', externalTitle: '' });
  const [selectedSongForTrack, setSelectedSongForTrack] = useState(null);
  // Task sorting/filtering state
  const [taskSortBy, setTaskSortBy] = useState('date');
  const [taskSortDir, setTaskSortDir] = useState('asc');
  const [taskFilterStatus, setTaskFilterStatus] = useState('all');
  // Task editing modal state - Unified Task Handling Architecture
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskContext, setEditingTaskContext] = useState(null); // { type: 'auto'|'custom'|'new-custom' }

  const teamMembers = useMemo(() => data.teamMembers || [], [data.teamMembers]);

  const currentRelease = data.releases.find(r => r.id === release.id) || release;

  const handleSave = async () => { await actions.updateRelease(release.id, form); };
  const handleFieldChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

  const handleDeleteRelease = async () => {
    if (confirm('Delete this release?')) { await actions.deleteRelease(release.id); onBack(); }
  };

  // Handle opening the Task Edit Modal - Unified Task Handling Architecture
  const handleOpenTaskEdit = (task, context) => {
    setEditingTask({ ...task });
    setEditingTaskContext(context);
  };

  // Handle saving task from the Task Edit Modal - Unified Task Handling Architecture
  const handleSaveTaskEdit = async () => {
    if (!editingTask || !editingTaskContext) return;
    
    if (editingTaskContext.type === 'new-custom') {
      // Creating a new custom task
      await actions.addReleaseCustomTask(release.id, {
        title: editingTask.type || editingTask.title || 'New Task',
        type: editingTask.type || editingTask.title || 'Custom',
        date: editingTask.date || editingTask.dueDate || '',
        dueDate: editingTask.date || editingTask.dueDate || '',
        status: editingTask.status || 'Not Started',
        estimatedCost: editingTask.estimatedCost || 0,
        quotedCost: editingTask.quotedCost || 0,
        paidCost: editingTask.paidCost || 0,
        notes: editingTask.notes || editingTask.description || '',
        description: editingTask.description || editingTask.notes || '',
        assignedMembers: editingTask.assignedMembers || [],
        eraIds: editingTask.eraIds || [],
        stageIds: editingTask.stageIds || [],
        tagIds: editingTask.tagIds || [],
        isAutoTask: false
      });
    } else if (editingTaskContext.type === 'auto') {
      await actions.updateReleaseTask(release.id, editingTask.id, editingTask);
    } else if (editingTaskContext.type === 'custom') {
      await actions.updateReleaseCustomTask(release.id, editingTask.id, editingTask);
    }
    
    setEditingTask(null);
    setEditingTaskContext(null);
  };

  // Phase 3.5: Handle adding track
  const handleAddTrack = async () => {
    if (newTrack.isExternal) {
      if (!newTrack.externalTitle) return;
      await actions.addReleaseTrack(release.id, {
        isExternal: true,
        externalArtist: newTrack.externalArtist,
        externalTitle: newTrack.externalTitle
      });
    } else {
      if (!newTrack.songId) return;
      await actions.addReleaseTrack(release.id, {
        songId: newTrack.songId,
        versionIds: newTrack.versionIds
      });
    }
    setNewTrack({ songId: '', versionIds: [], isExternal: false, externalArtist: '', externalTitle: '' });
    setSelectedSongForTrack(null);
    setShowAddTrack(false);
  };

  // Phase 3.5: Handle track click to navigate to song
  const handleTrackClick = (track) => {
    if (track.isExternal) return;
    if (track.songId && onSelectSong) {
      const song = (data.songs || []).find(s => s.id === track.songId);
      if (song) onSelectSong(song);
    }
  };

  const getSongTitle = (songId) => {
    const song = data.songs.find(s => s.id === songId);
    return song ? song.title : '(Unknown Song)';
  };
  
  // Phase 3.5: Get track statistics
  const getTrackStats = useMemo(() => {
    const tracks = currentRelease.tracks || [];
    const totalTracks = tracks.length;
    
    if (totalTracks === 0) {
      return { total: 0, completed: 0, remaining: 0, progress: 0 };
    }
    
    let completedTracks = 0;
    
    tracks.forEach(track => {
      if (track.isExternal) {
        completedTracks++;
      } else if (track.songId) {
        const song = (data.songs || []).find(s => s.id === track.songId);
        if (song) {
          const versionIds = track.versionIds || [];
          if (versionIds.length === 0) {
            const songTasks = [...(song.deadlines || []), ...(song.customTasks || [])];
            const songProgress = calculateTaskProgress(songTasks).progress;
            if (songProgress >= 100) completedTracks++;
          } else {
            let allVersionsComplete = true;
            versionIds.forEach(vId => {
              const version = (song.versions || []).find(v => v.id === vId);
              if (version) {
                const versionTasks = [...(version.tasks || []), ...(version.customTasks || [])];
                const vProgress = calculateTaskProgress(versionTasks).progress;
                if (vProgress < 100) allVersionsComplete = false;
              }
            });
            if (allVersionsComplete) completedTracks++;
          }
        }
      }
    });
    
    const remaining = totalTracks - completedTracks;
    const progress = totalTracks > 0 ? Math.round((completedTracks / totalTracks) * 100) : 0;
    
    return { total: totalTracks, completed: completedTracks, remaining, progress };
  }, [currentRelease.tracks, data.songs]);
  
  // Get assigned team members for Display Information
  const assignedTeamMembers = useMemo(() => {
    const memberIds = new Set();
    const allTasks = [...(currentRelease.tasks || []), ...(currentRelease.customTasks || [])];
    allTasks.forEach(task => {
      (task.assignedMembers || []).forEach(m => memberIds.add(m.memberId));
    });
    return teamMembers.filter(m => memberIds.has(m.id));
  }, [currentRelease, teamMembers]);
  
  // Calculate progress and summary stats
  const allReleaseTasks = useMemo(() => [...(currentRelease.tasks || []), ...(currentRelease.customTasks || [])], [currentRelease]);
  const { progress: releaseProgressValue } = calculateTaskProgress(allReleaseTasks);
  
  // Calculate costs
  const costPaid = useMemo(() => allReleaseTasks.reduce((sum, t) => sum + (t.paidCost || 0), 0), [allReleaseTasks]);
  const estimatedCost = useMemo(() => allReleaseTasks.reduce((sum, t) => sum + getEffectiveCost(t), 0) + getEffectiveCost(currentRelease), [allReleaseTasks, currentRelease]);
  
  // Calculate overdue tasks
  const overdueTasks = useMemo(() => allReleaseTasks.filter(t => t.date && new Date(t.date) < new Date() && t.status !== 'Complete' && t.status !== 'Done'), [allReleaseTasks]);
  const openTasks = useMemo(() => allReleaseTasks.filter(t => t.status !== 'Complete' && t.status !== 'Done'), [allReleaseTasks]);
  
  // Unified filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    const combined = [
      ...(currentRelease.tasks || []).map(t => ({ ...t, _isAuto: true })),
      ...(currentRelease.customTasks || []).map(t => ({ ...t, _isAuto: false }))
    ];
    let filtered = [...combined];
    if (taskFilterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === taskFilterStatus);
    }
    filtered.sort((a, b) => {
      const valA = a[taskSortBy] || '';
      const valB = b[taskSortBy] || '';
      return taskSortDir === 'asc' 
        ? (valA < valB ? -1 : valA > valB ? 1 : 0)
        : (valA > valB ? -1 : valA < valB ? 1 : 0);
    });
    return filtered;
  }, [currentRelease.tasks, currentRelease.customTasks, taskFilterStatus, taskSortBy, taskSortDir]);

  // Phase 3.5: Get version info for a track
  const getVersionInfo = (track) => {
    if (track.isExternal) return null;
    const song = (data.songs || []).find(s => s.id === track.songId);
    if (!song) return null;
    
    const versionIds = track.versionIds || [];
    if (versionIds.length === 0) {
      // Core version
      const songTasks = [...(song.deadlines || []), ...(song.customTasks || [])];
      return { 
        name: 'Core Version', 
        progress: calculateTaskProgress(songTasks).progress,
        isComplete: calculateTaskProgress(songTasks).progress >= 100
      };
    }
    
    return versionIds.map(vId => {
      const version = (song.versions || []).find(v => v.id === vId);
      if (!version) return null;
      const versionTasks = [...(version.tasks || []), ...(version.customTasks || [])];
      const progress = calculateTaskProgress(versionTasks).progress;
      return {
        id: vId,
        name: version.name || 'Version',
        progress,
        isComplete: progress >= 100
      };
    }).filter(Boolean);
  };

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className={cn("px-4 py-2 bg-white flex items-center gap-2", THEME.punk.btn)}><Icon name="ChevronLeft" size={16} /> Back to Releases</button>
        <button onClick={handleDeleteRelease} className={cn("px-4 py-2", THEME.punk.btn, "bg-red-500 text-white")}><Icon name="Trash2" size={16} /></button>
      </div>

      {/* SECTION A: Display Information - Phase 3.1 Enhanced with Track Stats */}
      <div className={cn("p-6 mb-6 bg-gray-50", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Display Information</h3>
        
        {/* Release Title - prominent at top */}
        <div className="text-2xl font-black mb-4 pb-2 border-b-2 border-gray-300">{currentRelease.name || 'Untitled Release'}</div>
        
        <div className="grid md:grid-cols-4 gap-4">
          {/* Phase 3.1: Number of Tracks */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Number of Tracks</label>
            <div className="px-3 py-2 bg-blue-100 border-2 border-black text-lg font-black">{getTrackStats.total}</div>
          </div>
          
          {/* Phase 3.1: Number of Tracks Completed */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Tracks Completed</label>
            <div className="px-3 py-2 bg-green-100 border-2 border-black text-lg font-black">{getTrackStats.completed}</div>
          </div>
          
          {/* Phase 3.1: Number of Tracks Remaining */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Tracks Remaining</label>
            <div className="px-3 py-2 bg-orange-100 border-2 border-black text-lg font-black">{getTrackStats.remaining}</div>
          </div>
          
          {/* Phase 3.1: Track Progress % */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Track Progress</label>
            <div className="px-3 py-2 bg-purple-100 border-2 border-black text-lg font-black">{getTrackStats.progress}%</div>
          </div>
          
          {/* Phase 3.1: Has Physical Copies YES/NO */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Has Physical Copies?</label>
            <div className={cn("px-3 py-2 border-2 border-black text-lg font-black", currentRelease.hasPhysicalCopies ? "bg-green-200" : "bg-gray-100")}>
              {currentRelease.hasPhysicalCopies ? 'YES' : 'NO'}
            </div>
          </div>
          
          {/* Task Progress */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Task Progress</label>
            <div className="px-3 py-2 bg-yellow-100 border-2 border-black text-lg font-black">{releaseProgressValue}%</div>
          </div>
          
          {/* Release Date */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Release Date</label>
            <div className="px-3 py-2 bg-blue-100 border-2 border-black text-sm font-bold">
              {currentRelease.releaseDate || 'Not Set'}
            </div>
          </div>
          
          {/* Number of Open Tasks */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Open Tasks</label>
            <div className="px-3 py-2 bg-gray-100 border-2 border-black text-lg font-black">
              {openTasks.length}
            </div>
          </div>
          
          {/* Overdue Task Indicator */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Overdue Tasks</label>
            <div className={cn("px-3 py-2 border-2 border-black text-lg font-black", 
              overdueTasks.length > 0 ? "bg-red-200" : "bg-green-100"
            )}>
              {overdueTasks.length}
            </div>
          </div>
          
          {/* Cost Paid */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Cost Paid</label>
            <div className="px-3 py-2 bg-green-100 border-2 border-black text-sm font-bold">
              {formatMoney(costPaid)}
            </div>
          </div>
          
          {/* Estimated Total Cost */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Estimated Cost</label>
            <div className="px-3 py-2 bg-yellow-100 border-2 border-black text-sm font-bold">
              {formatMoney(estimatedCost)}
            </div>
          </div>
          
          {/* Release Type */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Release Type</label>
            <div className="px-3 py-2 bg-purple-100 border-2 border-black text-sm font-bold">
              {currentRelease.type || 'Album'}
            </div>
          </div>
          
          {/* Team Members */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold uppercase mb-2">Team Members on Tasks</label>
            <div className="flex flex-wrap gap-2">
              {assignedTeamMembers.length === 0 ? (
                <span className="text-xs opacity-50">No team members assigned</span>
              ) : assignedTeamMembers.map(m => (
                <div key={m.id} className="px-2 py-1 bg-purple-100 border-2 border-black text-xs font-bold">
                  {m.name} {m.isMusician && '🎵'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: Release Information (editable) - Phase 3 Enhanced */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Release Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Name</label>
            <input value={form.name || ''} onChange={e => handleFieldChange('name', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          {/* Phase 3.3: Release Type with expanded options */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Type</label>
            <select value={form.type || 'Album'} onChange={e => { handleFieldChange('type', e.target.value); setTimeout(handleSave, 0); }} className={cn("w-full", THEME.punk.input)}>
              {RELEASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {/* Phase 3.3: If type is 'Other', show details field */}
          {form.type === 'Other' && (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase mb-1">Type Details (for &apos;Other&apos;)</label>
              <input value={form.typeDetails || ''} onChange={e => handleFieldChange('typeDetails', e.target.value)} onBlur={handleSave} placeholder="Describe the release type" className={cn("w-full", THEME.punk.input)} />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Release Date</label>
            <input type="date" value={form.releaseDate || ''} onChange={e => handleFieldChange('releaseDate', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          {/* Phase 3.2: Exclusive YES/NO toggle pattern (like Songs/Versions/Videos) */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 font-bold mb-2">
              <input 
                type="checkbox" 
                checked={form.hasExclusivity || false} 
                onChange={e => { handleFieldChange('hasExclusivity', e.target.checked); setTimeout(handleSave, 0); }} 
                className="w-5 h-5" 
              />
              Exclusive Availability?
            </label>
            {form.hasExclusivity && (
              <div className="grid md:grid-cols-3 gap-4 pl-7 mt-2">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Exclusive Start Date</label>
                  <input type="date" value={form.exclusiveStartDate || ''} onChange={e => handleFieldChange('exclusiveStartDate', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Exclusive End Date</label>
                  <input type="date" value={form.exclusiveEndDate || ''} onChange={e => handleFieldChange('exclusiveEndDate', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Exclusive Notes</label>
                  <input value={form.exclusiveNotes || ''} onChange={e => handleFieldChange('exclusiveNotes', e.target.value)} onBlur={handleSave} placeholder="Platform, terms..." className={cn("w-full", THEME.punk.input)} />
                </div>
              </div>
            )}
          </div>
          {/* Has Physical Copies checkbox (Phase 3.1 & 3.6) */}
          <div className="flex items-center gap-2 font-bold">
            <input type="checkbox" checked={form.hasPhysicalCopies || false} onChange={e => { handleFieldChange('hasPhysicalCopies', e.target.checked); setTimeout(handleSave, 0); }} className="w-5 h-5" />
            Has Physical Copies?
          </div>
          {form.hasPhysicalCopies && (
            <div className="text-xs text-blue-600 font-bold">💡 Physical copy tasks will be auto-generated</div>
          )}
          {/* Phase 3.4: Stage/Era/Tags */}
          <div className="md:col-span-2">
            <EraStageTagsPicker
              value={{
                eraIds: form.eraIds || [],
                stageIds: form.stageIds || [],
                tagIds: form.tagIds || []
              }}
              onChange={({ eraIds, stageIds, tagIds }) => {
                handleFieldChange('eraIds', eraIds);
                handleFieldChange('stageIds', stageIds);
                handleFieldChange('tagIds', tagIds);
                setTimeout(handleSave, 0);
              }}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} />
          </div>
        </div>
      </div>

      <DetailPane title="Release Detail Pane">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Distribution Platforms</label>
            <input value={(form.platforms || []).join(', ')} onChange={e => handleFieldChange('platforms', e.target.value.split(',').map(v => v.trim()).filter(Boolean))} onBlur={handleSave} placeholder="Spotify, Vinyl, D2C" className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Additional Costs / Notes</label>
            <textarea value={form.detailNotes || form.notes || ''} onChange={e => handleFieldChange('detailNotes', e.target.value)} onBlur={handleSave} className={cn("w-full h-20", THEME.punk.input)} placeholder="Physical production, marketing earmarks" />
          </div>
        </div>
      </DetailPane>

      {/* Phase 3.5: Tracks Module (replaces Required Recordings) */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Tracks</h3>
          <button onClick={() => setShowAddTrack(!showAddTrack)} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-black text-white")}>{showAddTrack ? 'Cancel' : '+ Add Track'}</button>
        </div>

        {showAddTrack && (
          <div className="bg-gray-50 p-4 mb-4 border-2 border-black">
            <div className="mb-3">
              <label className="flex items-center gap-2 font-bold">
                <input 
                  type="checkbox" 
                  checked={newTrack.isExternal} 
                  onChange={e => setNewTrack({ ...newTrack, isExternal: e.target.checked, songId: '', versionIds: [] })}
                  className="w-5 h-5" 
                />
                Track from Different Artist (External)
              </label>
            </div>
            
            {newTrack.isExternal ? (
              /* External track form */
              <div className="grid md:grid-cols-3 gap-3">
                <input 
                  value={newTrack.externalArtist} 
                  onChange={e => setNewTrack({ ...newTrack, externalArtist: e.target.value })} 
                  placeholder="Artist Name" 
                  className={cn("w-full", THEME.punk.input)} 
                />
                <input 
                  value={newTrack.externalTitle} 
                  onChange={e => setNewTrack({ ...newTrack, externalTitle: e.target.value })} 
                  placeholder="Track Title" 
                  className={cn("w-full", THEME.punk.input)} 
                />
                <button onClick={handleAddTrack} className={cn("px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>Add External Track</button>
              </div>
            ) : (
              /* Internal track form - Song + Version selection */
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Select Song</label>
                    <select 
                      value={newTrack.songId} 
                      onChange={e => {
                        setNewTrack({ ...newTrack, songId: e.target.value, versionIds: [] });
                        setSelectedSongForTrack(e.target.value ? (data.songs || []).find(s => s.id === e.target.value) : null);
                      }} 
                      className={cn("w-full", THEME.punk.input)}
                    >
                      <option value="">Select Song...</option>
                      {(data.songs || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  </div>
                  <button onClick={handleAddTrack} disabled={!newTrack.songId} className={cn("px-4 py-2 self-end", THEME.punk.btn, newTrack.songId ? "bg-green-500 text-white" : "bg-gray-300")}>Add Track</button>
                </div>
                
                {/* Version selection for selected song */}
                {selectedSongForTrack && (
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Select Version(s) - leave empty for Core Version</label>
                    <div className="flex flex-wrap gap-2 p-2 border-2 border-black bg-white">
                      {(selectedSongForTrack.versions || []).filter(v => v.id !== 'core').map(v => (
                        <label key={v.id} className="flex items-center gap-1 text-xs font-bold cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={newTrack.versionIds.includes(v.id)} 
                            onChange={e => {
                              const newVersionIds = e.target.checked 
                                ? [...newTrack.versionIds, v.id]
                                : newTrack.versionIds.filter(id => id !== v.id);
                              setNewTrack({ ...newTrack, versionIds: newVersionIds });
                            }}
                            className="w-3 h-3" 
                          />
                          {v.name}
                        </label>
                      ))}
                      {((selectedSongForTrack.versions || []).filter(v => v.id !== 'core').length === 0) && (
                        <span className="text-xs opacity-50">No versions available (will use Core Version)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Phase 3.5: Tracks Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Track</th>
                <th className="p-2 text-left">Version(s)</th>
                <th className="p-2 text-center">Progress</th>
                <th className="p-2 text-center">Complete?</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(currentRelease.tracks || []).length === 0 ? (
                <tr><td colSpan="6" className="p-4 text-center opacity-50">No tracks yet. Add tracks to this release.</td></tr>
              ) : (currentRelease.tracks || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map((track, idx) => {
                const versionInfo = getVersionInfo(track);
                const isComplete = track.isExternal ? true : (Array.isArray(versionInfo) ? versionInfo.every(v => v.isComplete) : versionInfo?.isComplete);
                const trackProgress = track.isExternal ? 100 : (Array.isArray(versionInfo) ? Math.round(versionInfo.reduce((sum, v) => sum + v.progress, 0) / versionInfo.length) : versionInfo?.progress || 0);
                
                return (
                  <tr 
                    key={track.id} 
                    className={cn(
                      "border-b border-gray-200",
                      isComplete ? "bg-green-50" : "hover:bg-yellow-50",
                      !track.isExternal && "cursor-pointer"
                    )}
                    onClick={() => handleTrackClick(track)}
                  >
                    <td className="p-2 text-center font-bold">{idx + 1}</td>
                    <td className="p-2">
                      {track.isExternal ? (
                        <div>
                          <div className="font-bold">{track.externalTitle}</div>
                          <div className="text-xs text-gray-500">by {track.externalArtist} <span className="px-1 py-0.5 bg-orange-100 border border-orange-500 text-orange-800 text-[10px]">EXTERNAL</span></div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-blue-600 hover:underline">{getSongTitle(track.songId)}</div>
                          <div className="text-[10px] text-gray-500">Click to open Song</div>
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-xs">
                      {track.isExternal ? (
                        <span className="text-gray-400">N/A</span>
                      ) : Array.isArray(versionInfo) ? (
                        <div className="flex flex-wrap gap-1">
                          {versionInfo.map(v => (
                            <span key={v.id} className={cn("px-1 py-0.5 border text-[10px] font-bold", v.isComplete ? "bg-green-100 border-green-500" : "bg-gray-100 border-gray-400")}>
                              {v.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="px-1 py-0.5 bg-blue-100 border border-blue-500 text-[10px] font-bold">{versionInfo?.name || 'Core Version'}</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <div className={cn(
                        "px-2 py-1 text-xs font-bold",
                        trackProgress >= 100 ? "bg-green-200" : trackProgress >= 50 ? "bg-yellow-200" : "bg-gray-200"
                      )}>
                        {trackProgress}%
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      {isComplete ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : (
                        <span className="text-gray-400">○</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); actions.removeReleaseTrack(release.id, track.id); }} 
                        className="p-1 hover:bg-red-100 text-red-500"
                        title="Remove Track"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Track Summary */}
        {(currentRelease.tracks || []).length > 0 && (
          <div className="mt-3 p-3 bg-gray-100 border-2 border-black flex gap-4 text-xs font-bold">
            <span>Total: {getTrackStats.total}</span>
            <span className="text-green-600">Complete: {getTrackStats.completed}</span>
            <span className="text-orange-600">Remaining: {getTrackStats.remaining}</span>
            <span className="text-purple-600">Progress: {getTrackStats.progress}%</span>
          </div>
        )}
      </div>

      {/* Unified Tasks Module - combines auto-generated and custom tasks */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex flex-wrap justify-between items-center mb-4 border-b-4 border-black pb-2 gap-2">
          <h3 className="font-black uppercase">Tasks</h3>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Task Filters */}
            <select value={taskFilterStatus} onChange={e => setTaskFilterStatus(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Task Sorting */}
            <select value={taskSortBy} onChange={e => setTaskSortBy(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="date">Sort by Date</option>
              <option value="type">Sort by Type</option>
              <option value="status">Sort by Status</option>
            </select>
            <button onClick={() => setTaskSortDir(taskSortDir === 'asc' ? 'desc' : 'asc')} className={cn("px-2 py-1 text-xs", THEME.punk.btn)}>
              {taskSortDir === 'asc' ? '↑' : '↓'}
            </button>
            <button onClick={() => actions.recalculateReleaseTasksAction(release.id)} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-blue-500 text-white")}>Recalculate</button>
            <button 
              onClick={() => {
                // Unified Task Handling: Open modal with new blank task
                const newCustomTask = {
                  title: 'New Task',
                  date: '',
                  description: '',
                  estimatedCost: 0,
                  status: 'Not Started',
                  notes: '',
                  isAutoTask: false
                };
                handleOpenTaskEdit(newCustomTask, { type: 'new-custom' });
              }} 
              className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-green-600 text-white")}
            >
              + Add Task
            </button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-3 text-[10px] font-bold">
          <span className="px-2 py-1 bg-yellow-100 border-2 border-black">Auto Task</span>
          <span className="px-2 py-1 bg-green-100 border-2 border-black">Custom Task</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('type'); setTaskSortDir(taskSortBy === 'type' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Task {taskSortBy === 'type' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('date'); setTaskSortDir(taskSortBy === 'date' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Date {taskSortBy === 'date' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('status'); setTaskSortDir(taskSortBy === 'status' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Status {taskSortBy === 'status' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center opacity-50">No tasks yet. Set a release date and click Recalculate, or add a custom task.</td></tr>
              ) : filteredTasks.map(task => {
                const isOverdue = task.date && new Date(task.date) < new Date() && task.status !== 'Complete' && task.status !== 'Done';
                return (
                  <tr 
                    key={task.id} 
                    className={cn(
                      "border-b border-gray-200 cursor-pointer hover:bg-gray-100",
                      isOverdue ? "bg-red-50" : task._isAuto ? "bg-yellow-50" : "bg-green-50"
                    )}
                    onClick={() => handleOpenTaskEdit(task, { type: task._isAuto ? 'auto' : 'custom' })}
                  >
                    <td className="p-2">
                      <span className={cn("px-2 py-1 text-xs font-bold border border-black", task._isAuto ? "bg-yellow-200" : "bg-green-200")}>
                        {task._isAuto ? 'Auto' : 'Custom'}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="font-bold">{task.type || task.title}</div>
                      {task.isOverridden && <span className="text-xs text-orange-500">(edited)</span>}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs", isOverdue && "text-red-600 font-bold")}>
                          {task.date || '-'}
                        </span>
                        {isOverdue && <span className="px-1 py-0.5 bg-red-200 border border-red-500 text-red-800 text-[10px] font-bold">OVERDUE</span>}
                      </div>
                    </td>
                    <td className="p-2" onClick={e => e.stopPropagation()}>
                      <select 
                        value={task.status || 'Not Started'} 
                        onChange={e => {
                          if (task._isAuto) {
                            actions.updateReleaseTask(release.id, task.id, { status: e.target.value });
                          } else {
                            actions.updateReleaseCustomTask(release.id, task.id, { status: e.target.value });
                          }
                        }} 
                        className="border-2 border-black p-1 text-xs"
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                      {!task._isAuto && (
                        <button onClick={() => actions.deleteReleaseCustomTask(release.id, task.id)} className="p-1 text-red-500 hover:bg-red-100"><Icon name="Trash2" size={14} /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Release Task More/Edit Info Page Modal - Unified Task Handling Architecture */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => { setEditingTask(null); setEditingTaskContext(null); }}>
          <div className={cn("w-full max-w-lg p-6 bg-white max-h-[90vh] overflow-y-auto", THEME.punk.card)} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
              <h3 className="font-black uppercase">
                {editingTaskContext?.type === 'new-custom' ? 'Add Task' : 'Edit Task'}
              </h3>
              <button onClick={() => { setEditingTask(null); setEditingTaskContext(null); }} className="p-1 hover:bg-gray-200"><Icon name="X" size={16} /></button>
            </div>

            <div className="space-y-4">
              {/* Task Name */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Task Name</label>
                <input 
                  value={editingTask.type || editingTask.title || ''} 
                  onChange={e => setEditingTask(prev => ({ ...prev, type: e.target.value, title: e.target.value }))} 
                  className={cn("w-full", THEME.punk.input)}
                />
              </div>

              {/* Task Due Date */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Due Date</label>
                <input 
                  type="date" 
                  value={editingTask.date || editingTask.dueDate || ''} 
                  onChange={e => setEditingTask(prev => ({ ...prev, date: e.target.value, dueDate: e.target.value }))} 
                  className={cn("w-full", THEME.punk.input)}
                />
              </div>

              {/* Task Status */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Status</label>
                <select
                  value={editingTask.status || 'Not Started'}
                  onChange={e => setEditingTask(prev => ({ ...prev, status: e.target.value }))}
                  className={cn("w-full", THEME.punk.input)}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Era and Stage */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Era</label>
                  <select
                    value={(editingTask.eraIds || [])[0] || ''}
                    onChange={e => setEditingTask(prev => ({ ...prev, eraIds: e.target.value ? [e.target.value] : [] }))}
                    className={cn("w-full", THEME.punk.input)}
                  >
                    <option value="">No Era</option>
                    {(data.eras || []).map(era => <option key={era.id} value={era.id}>{era.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Stage</label>
                  <select
                    value={(editingTask.stageIds || [])[0] || ''}
                    onChange={e => setEditingTask(prev => ({ ...prev, stageIds: e.target.value ? [e.target.value] : [] }))}
                    className={cn("w-full", THEME.punk.input)}
                  >
                    <option value="">No Stage</option>
                    {(data.stages || []).map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Cost Fields */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Estimated</label>
                  <input 
                    type="number" 
                    value={editingTask.estimatedCost || 0} 
                    onChange={e => setEditingTask(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))} 
                    className={cn("w-full text-sm", THEME.punk.input)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Quoted</label>
                  <input 
                    type="number" 
                    value={editingTask.quotedCost || 0} 
                    onChange={e => setEditingTask(prev => ({ ...prev, quotedCost: parseFloat(e.target.value) || 0 }))} 
                    className={cn("w-full text-sm", THEME.punk.input)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Paid</label>
                  <input 
                    type="number" 
                    value={editingTask.paidCost || 0} 
                    onChange={e => setEditingTask(prev => ({ ...prev, paidCost: parseFloat(e.target.value) || 0 }))} 
                    className={cn("w-full text-sm", THEME.punk.input)} 
                  />
                </div>
              </div>

              {/* Team Members */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Team Members</label>
                <div className="flex flex-wrap gap-1 p-2 border-4 border-black bg-white text-xs max-h-24 overflow-y-auto">
                  {teamMembers.map(m => (
                    <label key={m.id} className="flex items-center gap-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={(editingTask.assignedMembers || []).some(am => am.memberId === m.id)} 
                        onChange={e => {
                          const members = editingTask.assignedMembers || [];
                          if (e.target.checked) {
                            setEditingTask(prev => ({ ...prev, assignedMembers: [...members, { memberId: m.id, cost: 0 }] }));
                          } else {
                            setEditingTask(prev => ({ ...prev, assignedMembers: members.filter(am => am.memberId !== m.id) }));
                          }
                        }}
                        className="w-3 h-3" 
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Notes</label>
                <textarea 
                  value={editingTask.notes || editingTask.description || ''} 
                  onChange={e => setEditingTask(prev => ({ ...prev, notes: e.target.value, description: e.target.value }))} 
                  className={cn("w-full h-20", THEME.punk.input)} 
                  placeholder="Additional details..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-6 pt-4 border-t-4 border-black">
              <button onClick={handleSaveTaskEdit} className={cn("flex-1 px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>
                Save Changes
              </button>
              <button onClick={() => { setEditingTask(null); setEditingTaskContext(null); }} className={cn("px-4 py-2", THEME.punk.btn, "bg-gray-500 text-white")}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Combined Timeline View (Spec 2.6) - Phase 6: Enhanced with events, videos, exclusivity windows, and clickable entries
export const CombinedTimelineView = () => {
  const { data } = useStore();
  const [filterSource, setFilterSource] = useState('all');
  const [filterSong, setFilterSong] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list', 'week', 'month'
  const [selectedItem, setSelectedItem] = useState(null);

  const timelineItems = useMemo(() => {
    const items = [];
    const resolvePrimary = (entity, extraReleaseIds = []) => getPrimaryDate(entity, data.releases || [], extraReleaseIds);
    const resolveDue = (task) => getTaskDueDate(task);
    const linkedReleaseIdsForSong = (songId) => {
      const directLinks = (data.releases || []).filter(r => (r.attachedSongIds || []).includes(songId)).map(r => r.id);
      const versionLinks = (data.releases || []).filter(r => (r.attachedVersions || []).some(v => v.songId === songId)).map(r => r.id);
      const coreLink = data.songs.find(s => s.id === songId)?.coreReleaseId;
      return Array.from(new Set([...(coreLink ? [coreLink] : []), ...directLinks, ...versionLinks]));
    };
    const linkedReleaseIdsForVersion = (songId, versionId) => {
      const versionLinks = (data.releases || []).filter(r => (r.attachedVersions || []).some(v => v.songId === songId && v.versionId === versionId)).map(r => r.id);
      return Array.from(new Set([...linkedReleaseIdsForSong(songId), ...versionLinks]));
    };
    const linkedReleaseIdsForVideo = (songId, videoId) => {
      const videoLinks = (data.releases || []).filter(r => (r.attachedVideoIds || []).includes(videoId)).map(r => r.id);
      return Array.from(new Set([...linkedReleaseIdsForSong(songId), ...videoLinks]));
    };
    const linkedReleaseIdsForStandaloneVideo = (videoId) => (data.releases || []).filter(r => (r.attachedStandaloneVideoIds || []).includes(videoId)).map(r => r.id);

    // Song Tasks (formerly deadlines)
    (data.songs || []).forEach(song => {
      const primarySongDate = resolvePrimary(song, linkedReleaseIdsForSong(song.id));
      const songTasks = song.deadlines || [];
      songTasks.forEach(task => {
        items.push({
          id: 'song-task-' + task.id,
          date: resolveDue(task) || primarySongDate,
          sourceType: 'Song Task',
          label: task.type,
          name: song.title,
          category: task.category || song.category,
          status: task.status,
          estimatedCost: task.estimatedCost,
          notes: task.notes,
          songId: song.id,
          clickable: true
        });
      });
      
      // Song Custom Tasks
      const customTasks = song.customTasks || [];
      customTasks.forEach(task => {
        items.push({
          id: 'custom-' + task.id,
          date: resolveDue(task) || primarySongDate,
          sourceType: 'Song Custom',
          label: task.title || 'Custom task',
          name: song.title,
          category: song.category,
          status: task.status,
          estimatedCost: task.estimatedCost,
          notes: task.description || task.notes,
          songId: song.id,
          clickable: true
        });
      });
      
      // Version tasks
      (song.versions || []).filter(v => v.id !== 'core').forEach(version => {
        const versionPrimaryDate = resolvePrimary(version, linkedReleaseIdsForVersion(song.id, version.id));
        (version.tasks || []).forEach(task => {
          items.push({
            id: 'version-task-' + song.id + '-' + version.id + '-' + task.id,
            date: resolveDue(task) || versionPrimaryDate,
            sourceType: 'Version Task',
            label: task.type,
            name: `${version.name} (${song.title})`,
            category: task.category || 'Version',
            status: task.status,
            estimatedCost: task.estimatedCost,
            notes: task.notes,
            songId: song.id,
            clickable: true
          });
        });
      });
      
      // Video tasks
      (song.videos || []).forEach(video => {
        const videoReleaseIds = linkedReleaseIdsForVideo(song.id, video.id);
        const videoPrimaryDate = resolvePrimary(video, videoReleaseIds);
        (video.tasks || []).forEach(task => {
          items.push({
            id: 'video-task-' + song.id + '-' + video.id + '-' + task.id,
            date: resolveDue(task) || videoPrimaryDate,
            sourceType: 'Video Task',
            label: task.type,
            name: `${video.title} (${song.title})`,
            category: 'Video',
            status: task.status,
            estimatedCost: task.estimatedCost,
            notes: task.notes,
            songId: song.id,
            clickable: true
          });
        });

        // Video release date
        const videoDate = videoPrimaryDate;
        if (videoDate) {
          items.push({
            id: 'video-release-' + song.id + '-' + video.id,
            date: videoDate,
            sourceType: 'Video',
            label: 'Video Release',
            name: video.title,
            category: 'Video',
            status: null,
            estimatedCost: video.estimatedCost,
            notes: null,
            songId: song.id,
            clickable: true
          });
        }
      });
      
      // Exclusivity windows (start)
      if (song.exclusiveType && song.exclusiveType !== 'None' && song.exclusiveStartDate) {
        items.push({
          id: 'excl-start-' + song.id,
          date: song.exclusiveStartDate,
          sourceType: 'Exclusivity',
          label: `${song.exclusiveType} Start`,
          name: song.title,
          category: 'Exclusive',
          status: null,
          estimatedCost: 0,
          notes: song.exclusiveNotes,
          songId: song.id,
          isExclusivityStart: true,
          exclusiveEndDate: song.exclusiveEndDate,
          clickable: true
        });
      }
      
      // Exclusivity windows (end)
      if (song.exclusiveType && song.exclusiveType !== 'None' && song.exclusiveEndDate) {
        items.push({
          id: 'excl-end-' + song.id,
          date: song.exclusiveEndDate,
          sourceType: 'Exclusivity',
          label: `${song.exclusiveType} End`,
          name: song.title,
          category: 'Exclusive',
          status: null,
          estimatedCost: 0,
          notes: song.exclusiveNotes,
          songId: song.id,
          isExclusivityEnd: true,
          clickable: true
        });
      }
    });

    // Standalone videos
    (data.standaloneVideos || []).forEach(video => {
      const videoReleaseIds = linkedReleaseIdsForStandaloneVideo(video.id);
      const videoDate = resolvePrimary(video, videoReleaseIds);
      (video.tasks || []).forEach(task => {
        const taskDate = resolveDue(task) || videoDate;
        items.push({
          id: 'standalone-video-task-' + video.id + '-' + task.id,
          date: taskDate,
          sourceType: 'Video Task',
          label: task.type,
          name: `${video.title} (Standalone)`,
          category: 'Video',
          status: task.status,
          estimatedCost: task.estimatedCost,
          notes: task.notes,
          songId: null,
          clickable: true
        });
      });

      if (videoDate) {
        items.push({
          id: 'standalone-video-release-' + video.id,
          date: videoDate,
          sourceType: 'Video',
          label: 'Video Release',
          name: `${video.title} (Standalone)`,
          category: 'Video',
          status: null,
          estimatedCost: video.estimatedCost,
          notes: video.notes,
          songId: null,
          clickable: true
        });
      }
    });

    // Events - Phase 2: Events derive cost from tasks only
    (data.events || []).forEach(event => {
      const eventDate = resolvePrimary(event);
      // Calculate cost from tasks
      const eventTasks = [...(event.tasks || []), ...(event.customTasks || [])];
      const taskCost = eventTasks.reduce((sum, t) => sum + getEffectiveCost(t), 0);
      if (eventDate) {
        items.push({
          id: 'event-' + event.id,
          date: eventDate,
          sourceType: 'Event',
          label: event.type || 'Event',
          name: event.title,
          category: 'Event',
          status: null,
          estimatedCost: taskCost,
          notes: event.description,
          songId: null,
          clickable: true
        });
      }
      
      // Event auto-tasks
      (event.tasks || []).forEach(task => {
        const taskDate = resolveDue(task) || eventDate;
        if (taskDate) {
          items.push({
            id: 'event-auto-task-' + event.id + '-' + task.id,
            date: taskDate,
            sourceType: 'Event Task',
            label: task.type || task.title,
            name: event.title,
            category: 'Event',
            status: task.status,
            estimatedCost: task.estimatedCost || 0,
            notes: task.notes || task.description,
            songId: null,
            clickable: true
          });
        }
      });
      
      // Event custom tasks
      (event.customTasks || []).forEach(task => {
        const taskDate = resolveDue(task) || eventDate;
        if (taskDate) {
          items.push({
            id: 'event-task-' + event.id + '-' + task.id,
            date: taskDate,
            sourceType: 'Event Task',
            label: task.title,
            name: event.title,
            category: 'Event',
            status: task.status,
            estimatedCost: task.estimatedCost || 0,
            notes: task.notes || task.description,
            songId: null,
            clickable: true
          });
        }
      });
    });

    // Global Tasks
    (data.globalTasks || []).filter(t => !t.isArchived).forEach(task => {
      const taskDate = resolveDue(task);
      items.push({
        id: 'global-' + task.id,
        date: taskDate,
        sourceType: 'Global',
        label: 'Task',
        name: task.taskName,
        category: task.category,
        status: task.status,
        estimatedCost: task.estimatedCost,
        notes: task.description,
        songId: null,
        clickable: true
      });
    });

    // Releases and their tasks
    (data.releases || []).forEach(release => {
      // Release date itself
      const releaseDate = resolvePrimary(release);
      items.push({
        id: 'release-' + release.id,
        date: releaseDate,
        sourceType: 'Release',
        label: 'Release',
        name: release.name,
        category: release.type, 
        status: null, 
        estimatedCost: release.estimatedCost, 
        notes: release.notes, 
        songId: null,
        clickable: true 
      });
      
      // Release tasks
      (release.tasks || []).forEach(task => {
        const taskDate = resolveDue(task) || releaseDate;
        items.push({
          id: 'release-task-' + task.id,
          date: taskDate,
          sourceType: 'Release Task',
          label: task.type,
          name: release.name,
          category: task.category, 
          status: task.status, 
          estimatedCost: task.estimatedCost, 
          notes: task.notes, 
          songId: null,
          clickable: true 
        });
      });
      
      // Release exclusivity
      if (release.exclusiveType && release.exclusiveType !== 'None' && release.exclusiveStartDate) {
        items.push({
          id: 'release-excl-start-' + release.id,
          date: release.exclusiveStartDate,
          sourceType: 'Exclusivity',
          label: `${release.exclusiveType} Start`,
          name: release.name,
          category: 'Release Exclusive',
          status: null,
          estimatedCost: 0,
          notes: release.exclusiveNotes,
          songId: null,
          isExclusivityStart: true,
          exclusiveEndDate: release.exclusiveEndDate,
          clickable: true
        });
      }
    });

    // Filter
    let filtered = items;
    if (filterSource !== 'all') filtered = filtered.filter(i => i.sourceType === filterSource);
    if (filterSong !== 'all') filtered = filtered.filter(i => i.songId === filterSong);
    if (filterStatus !== 'all') filtered = filtered.filter(i => i.status === filterStatus);
    if (dateFrom) filtered = filtered.filter(i => i.date >= dateFrom);
    if (dateTo) filtered = filtered.filter(i => i.date <= dateTo);

    // Sort by date ascending
    filtered.sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1);

    return filtered;
  }, [data.songs, data.globalTasks, data.releases, data.events, data.standaloneVideos, filterSource, filterSong, filterStatus, dateFrom, dateTo]);

  const getSourceColor = (sourceType) => {
    switch (sourceType) {
      case 'Song Task': return 'bg-blue-100 border-l-4 border-l-blue-500';
      case 'Song Custom': return 'bg-purple-100 border-l-4 border-l-purple-500';
      case 'Version Task': return 'bg-indigo-100 border-l-4 border-l-indigo-500';
      case 'Video Task': return 'bg-orange-100 border-l-4 border-l-orange-500';
      case 'Video': return 'bg-orange-200 border-l-4 border-l-orange-600';
      case 'Global': return 'bg-yellow-100 border-l-4 border-l-yellow-500';
      case 'Release Task': return 'bg-teal-100 border-l-4 border-l-teal-500';
      case 'Release': return 'bg-green-100 border-l-4 border-l-green-500';
      case 'Event': return 'bg-pink-100 border-l-4 border-l-pink-500';
      case 'Event Task': return 'bg-pink-200 border-l-4 border-l-pink-600';
      case 'Exclusivity': return 'bg-red-100 border-l-4 border-l-red-500';
      default: return 'bg-gray-100';
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  // Unique source types for filter
  const sourceTypes = ['Song Task', 'Song Custom', 'Version Task', 'Video Task', 'Video', 'Global', 'Release', 'Release Task', 'Event', 'Event Task', 'Exclusivity'];

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Combined Timeline</h2>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('list')} className={cn("px-3 py-1 text-xs font-bold", THEME.punk.btn, viewMode === 'list' ? 'bg-black text-white' : 'bg-white')}>List</button>
          <button onClick={() => setViewMode('week')} className={cn("px-3 py-1 text-xs font-bold", THEME.punk.btn, viewMode === 'week' ? 'bg-black text-white' : 'bg-white')}>Week</button>
          <button onClick={() => setViewMode('month')} className={cn("px-3 py-1 text-xs font-bold", THEME.punk.btn, viewMode === 'month' ? 'bg-black text-white' : 'bg-white')}>Month</button>
        </div>
      </div>

      <div className={cn("p-4 mb-6 bg-gray-50", THEME.punk.card)}>
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Source</label>
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Sources</option>
              {sourceTypes.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Song</label>
            <select value={filterSong} onChange={e => setFilterSong(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Songs</option>
              {(data.songs || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={cn("w-full", THEME.punk.input)} />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4 text-[10px] font-bold">
        <span className="px-2 py-1 bg-blue-100 border-l-4 border-l-blue-500 border border-black">Song Task</span>
        <span className="px-2 py-1 bg-purple-100 border-l-4 border-l-purple-500 border border-black">Custom</span>
        <span className="px-2 py-1 bg-indigo-100 border-l-4 border-l-indigo-500 border border-black">Version</span>
        <span className="px-2 py-1 bg-orange-100 border-l-4 border-l-orange-500 border border-black">Video</span>
        <span className="px-2 py-1 bg-yellow-100 border-l-4 border-l-yellow-500 border border-black">Global</span>
        <span className="px-2 py-1 bg-green-100 border-l-4 border-l-green-500 border border-black">Release</span>
        <span className="px-2 py-1 bg-pink-100 border-l-4 border-l-pink-500 border border-black">Event</span>
        <span className="px-2 py-1 bg-red-100 border-l-4 border-l-red-500 border border-black">Exclusivity</span>
      </div>

      <div className={cn("overflow-x-auto", THEME.punk.card)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Label</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Est. Cost</th>
              <th className="p-3 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {timelineItems.length === 0 ? (
              <tr><td colSpan="8" className="p-10 text-center opacity-50">No timeline items found.</td></tr>
            ) : timelineItems.map(item => (
              <tr 
                key={item.id} 
                onClick={() => handleItemClick(item)}
                className={cn(
                  "border-b border-gray-200 cursor-pointer hover:opacity-80", 
                  getSourceColor(item.sourceType),
                  item.isExclusivityStart && "border-l-4 border-l-red-500 bg-red-50",
                  item.isExclusivityEnd && "border-l-4 border-l-gray-500 bg-gray-50"
                )}
              >
                <td className="p-3 font-bold">{item.date || '-'}</td>
                <td className="p-3"><span className="px-2 py-1 text-xs font-bold bg-white border border-black">{item.sourceType}</span></td>
                <td className="p-3">{item.label}</td>
                <td className="p-3 font-bold">{item.name}</td>
                <td className="p-3">{item.category}</td>
                <td className="p-3">{item.status && <span className={cn(
                  "px-2 py-1 text-xs font-bold",
                  item.status === 'Done'
                    ? 'bg-green-200'
                    : item.status === 'In Progress'
                      ? 'bg-blue-200'
                      : item.status === 'Delayed'
                        ? 'bg-red-200'
                        : 'bg-gray-200'
                )}>{item.status}</span>}</td>
                <td className="p-3 text-right">{formatMoney(item.estimatedCost || 0)}</td>
                <td className="p-3 max-w-xs truncate">{item.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className={cn("w-full max-w-md p-6 bg-white", THEME.punk.card)} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-black uppercase">{selectedItem.name}</h3>
              <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-gray-200" aria-label="Close"><Icon name="X" size={16} /></button>
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="font-bold">Type:</span> {selectedItem.sourceType}</div>
              <div><span className="font-bold">Label:</span> {selectedItem.label}</div>
              <div><span className="font-bold">Date:</span> {selectedItem.date || '-'}</div>
              <div><span className="font-bold">Category:</span> {selectedItem.category}</div>
              {selectedItem.status && <div><span className="font-bold">Status:</span> {selectedItem.status}</div>}
              {selectedItem.estimatedCost > 0 && <div><span className="font-bold">Est. Cost:</span> {formatMoney(selectedItem.estimatedCost)}</div>}
              {selectedItem.notes && <div><span className="font-bold">Notes:</span> {selectedItem.notes}</div>}
              {selectedItem.exclusiveEndDate && <div><span className="font-bold">Exclusivity Ends:</span> {selectedItem.exclusiveEndDate}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Dedicated Videos workspace - Phase 2: Enhanced with auto-tasks and standalone videos
export const VideosView = ({ onSelectSong }) => {
  const { data, actions } = useStore();
  const [drafts, setDrafts] = useState({});
  const [showStandaloneForm, setShowStandaloneForm] = useState(false);
  const [standaloneVideo, setStandaloneVideo] = useState({
    title: 'New Standalone Video',
    releaseDate: '',
    types: { lyric: false, enhancedLyric: false, music: false, visualizer: false, custom: false, customLabel: '' }
  });
  // Phase 8: Musicians for videos
  const [newVideoMusicians, setNewVideoMusicians] = useState({});
  const teamMembers = data.teamMembers || [];

  const songVersions = (song) => song.versions || [];

  const videoTypes = [
    { key: 'lyric', label: 'Lyric video' },
    { key: 'enhancedLyric', label: 'Enhanced lyric video' },
    { key: 'music', label: 'Music video' },
    { key: 'visualizer', label: 'Visualizer' },
    { key: 'custom', label: 'Custom' }
  ];

  const handleAddStandaloneVideo = async () => {
    await actions.addStandaloneVideo(standaloneVideo);
    setStandaloneVideo({
      title: 'New Standalone Video',
      releaseDate: '',
      types: { lyric: false, enhancedLyric: false, music: false, visualizer: false, custom: false, customLabel: '' }
    });
    setShowStandaloneForm(false);
  };

  return (
    <div className="p-6 pb-24 space-y-6">
      <div className="flex flex-wrap items-center justify-between border-b-4 border-black pb-3 gap-3">
        <h2 className={THEME.punk.textStyle}>Videos</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowStandaloneForm(!showStandaloneForm)} className={cn("px-4 py-2 text-xs", THEME.punk.btn, "bg-purple-600 text-white")}>
            {showStandaloneForm ? 'Cancel' : '+ Standalone Video'}
          </button>
        </div>
      </div>

      {/* Standalone Video Form */}
      {showStandaloneForm && (
        <div className={cn("p-4 bg-purple-50", THEME.punk.card)}>
          <h3 className="font-black uppercase mb-3">New Standalone Video</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Title</label>
              <input value={standaloneVideo.title} onChange={e => setStandaloneVideo(prev => ({ ...prev, title: e.target.value }))} className={cn("w-full", THEME.punk.input)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Release Date</label>
              <input type="date" value={standaloneVideo.releaseDate} onChange={e => setStandaloneVideo(prev => ({ ...prev, releaseDate: e.target.value }))} className={cn("w-full", THEME.punk.input)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase mb-1">Video Types</label>
              <div className="flex flex-wrap gap-3 text-xs">
                {videoTypes.map(type => (
                  <label key={type.key} className="flex items-center gap-1">
                    <input type="checkbox" checked={standaloneVideo.types?.[type.key] || false} onChange={e => setStandaloneVideo(prev => ({ ...prev, types: { ...(prev.types || {}), [type.key]: e.target.checked } }))} />
                    {type.label}
                  </label>
                ))}
              </div>
            </div>
            <button onClick={handleAddStandaloneVideo} className={cn("px-4 py-2", THEME.punk.btn, "bg-purple-600 text-white")}>Create Standalone Video</button>
          </div>
        </div>
      )}

      {/* Standalone Videos List */}
      {(data.standaloneVideos || []).length > 0 && (
        <div className={cn("p-4", THEME.punk.card)}>
          <h3 className="font-black uppercase mb-3 border-b-2 border-black pb-2">Standalone Videos</h3>
          <div className="space-y-3">
            {(data.standaloneVideos || []).map(video => (
              <div key={video.id} className="border-2 border-purple-500 bg-white p-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-bold">{video.title}</span>
                    <span className="ml-2 text-xs opacity-60">{video.releaseDate || 'No date'}</span>
                  </div>
                  <button onClick={() => actions.deleteStandaloneVideo(video.id)} className="text-red-500 text-xs">Delete</button>
                </div>
                <div className="flex flex-wrap gap-1 text-[11px] mb-2">
                  {videoTypes.map(type => video.types?.[type.key] ? <span key={type.key} className="px-2 py-1 bg-purple-100 border-2 border-black font-bold">{type.label}</span> : null)}
                </div>
                {/* Auto-generated tasks */}
                {(video.tasks || []).length > 0 && (
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    <div className="text-xs font-bold uppercase mb-1">Auto Tasks</div>
                    <div className="flex flex-wrap gap-1">
                      {video.tasks.map(task => (
                        <span key={task.id} className={cn("px-2 py-1 text-[10px] border font-bold", task.status === 'Done' ? 'bg-green-100 border-green-500' : 'bg-gray-100 border-gray-400')}>
                          {task.type} ({task.date})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Song Videos */}
      {(data.songs || []).map(song => (
        <div key={song.id} className={cn("p-4", THEME.punk.card)}>
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-black uppercase">{song.title}</h3>
              <p className="text-xs opacity-70">Core release {song.releaseDate || 'TBD'}</p>
            </div>
            <button onClick={() => onSelectSong?.(song)} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-black text-white")}>Edit Song</button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {songVersions(song).map(v => {
              const key = `${song.id}-${v.id}`;
              const draft = drafts[key] || { title: `${v.name} Video`, versionId: v.id, types: {} };
              return (
                <div key={v.id} className="border-2 border-black bg-white p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-bold">{v.name}</div>
                    <button onClick={() => {
                      actions.addSongVideo(song.id, { ...draft, releaseDate: v.releaseDate || song.releaseDate });
                      setDrafts(prev => ({ ...prev, [key]: { title: `${v.name} Video`, versionId: v.id, types: {} } }));
                    }} className={cn("px-2 py-1 text-xs", THEME.punk.btn, "bg-pink-600 text-white")}>Add Video</button>
                  </div>
                  <input value={draft.title} onChange={e => setDrafts(prev => ({ ...prev, [key]: { ...(prev[key] || {}), title: e.target.value } }))} className={cn("w-full text-xs", THEME.punk.input)} />
                  <div className="flex flex-wrap gap-2 text-xs">
                    {videoTypes.map(type => (
                      <label key={type.key} className="flex items-center gap-1">
                        <input type="checkbox" checked={draft.types?.[type.key] || false} onChange={e => setDrafts(prev => ({ ...prev, [key]: { ...(prev[key] || {}), versionId: v.id, types: { ...(prev[key]?.types || {}), [type.key]: e.target.checked } } }))} />
                        {type.label}
                      </label>
                    ))}
                    {draft.types?.custom && <input value={draft.types?.customLabel || ''} onChange={e => setDrafts(prev => ({ ...prev, [key]: { ...(prev[key] || {}), types: { ...(prev[key]?.types || {}), customLabel: e.target.value, custom: true } } }))} placeholder="Custom label" className={cn("px-2 py-1", THEME.punk.input, "text-xs")} />}
                  </div>
                  <div className="space-y-2">
                    {(song.videos || []).filter(video => video.versionId === v.id).map(video => (
                      <div key={video.id} className="border-2 border-black bg-gray-50 p-2 space-y-1">
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span>{video.title}</span>
                          <div className="flex gap-2 text-xs">
                            <button onClick={() => actions.deleteSongVideo(song.id, video.id)} className="text-red-600">Remove</button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[11px]">
                          {videoTypes.map(type => video.types?.[type.key] ? <span key={type.key} className="px-2 py-1 bg-blue-100 border-2 border-black font-bold">{type.label === 'Custom' ? (video.types?.customLabel || 'Custom') : type.label}</span> : null)}
                        </div>
                        {/* Auto-generated video tasks */}
                        {(video.tasks || []).length > 0 && (
                          <div className="mt-2 border-t border-gray-200 pt-2">
                            <div className="text-xs font-bold uppercase mb-1">Auto Tasks (Hire Crew/Film/Edit/Release)</div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="p-1 text-left">Task</th>
                                    <th className="p-1 text-left">Date</th>
                                    <th className="p-1 text-left">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {video.tasks.map(task => (
                                    <tr key={task.id} className="border-b border-gray-200">
                                      <td className="p-1 font-bold">{task.type}</td>
                                      <td className="p-1">
                                        <input type="date" value={task.date || ''} onChange={e => actions.updateVideoTask(song.id, video.id, task.id, { date: e.target.value })} className="border border-black p-1 text-xs w-24" />
                                      </td>
                                      <td className="p-1">
                                        <select value={task.status || 'Not Started'} onChange={e => actions.updateVideoTask(song.id, video.id, task.id, { status: e.target.value })} className="border border-black p-1 text-xs">
                                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        {/* Phase 8: Musicians assigned to video */}
                        <div className="mt-2 border-t border-gray-200 pt-2">
                          <div className="text-xs font-bold uppercase mb-1">Musicians</div>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {(video.musicians || []).map(m => {
                              const member = teamMembers.find(tm => tm.id === m.memberId);
                              return (
                                <span key={m.id} className="px-2 py-1 border-2 border-black bg-purple-100 text-[10px] font-bold flex items-center gap-1">
                                  {member?.name || 'Member'} — {(m.instruments || []).join(', ')}
                                  <button onClick={() => actions.removeVideoMusician(song.id, video.id, m.id)} className="text-red-600 ml-1">×</button>
                                </span>
                              );
                            })}
                          </div>
                          <div className="flex gap-1 items-center">
                            <select 
                              value={newVideoMusicians[video.id]?.memberId || ''} 
                              onChange={e => setNewVideoMusicians(prev => ({ ...prev, [video.id]: { ...(prev[video.id] || {}), memberId: e.target.value } }))} 
                              className="border border-black p-1 text-[10px]"
                            >
                              <option value="">Select musician</option>
                              {teamMembers.filter(m => m.isMusician).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <input 
                              value={newVideoMusicians[video.id]?.instruments || ''} 
                              onChange={e => setNewVideoMusicians(prev => ({ ...prev, [video.id]: { ...(prev[video.id] || {}), instruments: e.target.value } }))} 
                              placeholder="instruments" 
                              className="border border-black p-1 text-[10px] w-24" 
                            />
                            <button 
                              onClick={() => {
                                const entry = newVideoMusicians[video.id];
                                if (!entry?.memberId) return;
                                actions.addVideoMusician(song.id, video.id, { 
                                  id: crypto.randomUUID(), 
                                  memberId: entry.memberId, 
                                  instruments: (entry.instruments || '').split(',').map(i => i.trim()).filter(Boolean) 
                                });
                                setNewVideoMusicians(prev => ({ ...prev, [video.id]: { memberId: '', instruments: '' } }));
                              }} 
                              className="px-2 py-1 text-[10px] border-2 border-black bg-purple-500 text-white font-bold"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                        <DetailPane title="Video Detail Pane">
                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase mb-1">Notes</label>
                              <textarea value={video.notes || ''} onChange={e => actions.updateSongVideo(song.id, video.id, { notes: e.target.value })} className={cn("w-full h-16", THEME.punk.input)} placeholder="Director, storyline, exclusivity" />
                            </div>
                            <div className="space-y-2">
                              <div>
                                <label className="block text-[10px] font-bold uppercase mb-1">Exclusivity</label>
                                <input value={video.exclusiveType || ''} onChange={e => actions.updateSongVideo(song.id, video.id, { exclusiveType: e.target.value })} className={cn("w-full", THEME.punk.input)} placeholder="YouTube first, platform exclusive" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase mb-1">Platforms</label>
                                <input value={(video.platforms || []).join(', ')} onChange={e => actions.updateSongVideo(song.id, video.id, { platforms: e.target.value.split(',').map(i => i.trim()).filter(Boolean) })} className={cn("w-full", THEME.punk.input)} placeholder="YouTube, TikTok, IG" />
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[10px]">
                                {['Estimated', 'Quoted', 'Paid'].map(k => (
                                  <div key={k}>
                                    <label className="font-black uppercase block mb-1">{k}</label>
                                    <input type="number" value={video[`${k.toLowerCase()}Cost`] || 0} onChange={e => actions.updateSongVideo(song.id, video.id, { [`${k.toLowerCase()}Cost`]: parseFloat(e.target.value) || 0 })} className={cn("w-full", THEME.punk.input)} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </DetailPane>
                        {/* Custom tasks placeholder */}
                        <div className="text-[10px] text-gray-500 mt-1">Custom tasks: {(video.customTasks || []).length}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// Task Dashboard View - Shows tasks in progress, due soon, and macro overview
export const TaskDashboardView = () => {
  const { data } = useStore();
  const [view, setView] = useState('upcoming'); // 'upcoming', 'inProgress', 'overview'
  const [stageFilter, setStageFilter] = useState('all');
  
  // Get today's date for comparison
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Collect all tasks from all sources
  const allTasks = useMemo(() => {
    const tasks = [];
    
    // Song tasks
    (data.songs || []).forEach(song => {
      (song.deadlines || []).forEach(task => {
        tasks.push({
          id: 'song-' + task.id,
          type: task.type,
          category: task.category || 'Production',
          date: task.date,
          status: task.status,
          estimatedCost: task.estimatedCost,
          source: 'Song',
          sourceName: song.title,
          sourceType: 'song',
          sourceId: song.id,
          stageId: task.stageId || ''
        });
      });
      (song.customTasks || []).forEach(task => {
        tasks.push({
          id: 'custom-' + task.id,
          type: task.title,
          category: 'Custom',
          date: task.date,
          status: task.status,
          estimatedCost: task.estimatedCost,
          source: 'Song',
          sourceName: song.title,
          sourceType: 'song',
          sourceId: song.id
        });
      });
    });
    
    // Global tasks
    (data.globalTasks || []).forEach(task => {
      tasks.push({
        id: 'global-' + task.id,
        type: task.taskName,
        category: task.category,
        date: task.date,
        status: task.status,
        estimatedCost: task.estimatedCost,
        source: 'Global',
        sourceName: task.taskName,
        sourceType: 'global',
        sourceId: task.id,
        stageId: task.stageId || ''
      });
    });
    
    // Release tasks
    (data.releases || []).forEach(release => {
      (release.tasks || []).forEach(task => {
        tasks.push({
          id: 'release-' + task.id,
          type: task.type,
          category: task.category,
          date: task.date,
          status: task.status,
          estimatedCost: task.estimatedCost,
          source: 'Release',
          sourceName: release.name,
        sourceType: 'release',
        sourceId: release.id,
        stageId: task.stageId || ''
      });
    });
    });
    
    return tasks;
  }, [data.songs, data.globalTasks, data.releases]);

  // Filter tasks based on view
  const filteredTasks = useMemo(() => {
    let filtered = [...allTasks];
    if (stageFilter !== 'all') {
      filtered = filtered.filter(t => (t.stageId || '') === stageFilter);
    }
    
    if (view === 'upcoming') {
      // Tasks due in next 30 days that are not done
      filtered = filtered.filter(t => 
        t.date && 
        t.date >= today && 
        t.date <= nextMonth && 
        t.status !== 'Done'
      );
      filtered.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    } else if (view === 'inProgress') {
      // Tasks that are actively in progress
      filtered = filtered.filter(t => t.status === 'In Progress');
      filtered.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }
    
    return filtered;
  }, [allTasks, view, today, nextMonth, stageFilter]);

  // Calculate overview statistics
  const stats = useMemo(() => {
    const notStarted = allTasks.filter(t => t.status === 'Not Started').length;
    const inProgress = allTasks.filter(t => t.status === 'In Progress').length;
    const done = allTasks.filter(t => t.status === 'Done').length;
    const delayed = allTasks.filter(t => t.status === 'Delayed').length;
    const dueSoon = allTasks.filter(t => t.date && t.date >= today && t.date <= nextWeek && t.status !== 'Done').length;
    const overdue = allTasks.filter(t => t.date && t.date < today && t.status !== 'Done').length;
    const totalCost = allTasks.reduce((sum, t) => sum + getEffectiveCost(t), 0);
    const totalPaid = allTasks.reduce((sum, t) => {
      const { source, value } = resolveCostPrecedence(t);
      return ['actual', 'paid', 'partially_paid'].includes(source) ? sum + value : sum;
    }, 0);
    const remaining = allTasks.reduce((sum, t) => {
      const { source, value } = resolveCostPrecedence(t);
      if (['actual', 'paid', 'partially_paid'].includes(source)) return sum;
      return sum + value;
    }, 0);

    return { notStarted, inProgress, done, delayed, dueSoon, overdue, total: allTasks.length, totalCost, totalPaid, remaining };
  }, [allTasks, today, nextWeek]);

  // Group tasks by category for overview
  const categoryGroups = useMemo(() => {
    const groups = {};
    allTasks.forEach(task => {
      const cat = task.category || 'Other';
      if (!groups[cat]) groups[cat] = { total: 0, done: 0, inProgress: 0 };
      groups[cat].total++;
      if (task.status === 'Done') groups[cat].done++;
      if (task.status === 'In Progress') groups[cat].inProgress++;
    });
    return groups;
  }, [allTasks]);

  // Phase 9: Generate notifications/alerts
  const notifications = useMemo(() => {
    const alerts = [];
    
    // Overdue tasks
    const overdueTasks = allTasks.filter(t => t.date && t.date < today && t.status !== 'Done');
    if (overdueTasks.length > 0) {
      alerts.push({
        id: 'overdue',
        type: 'error',
        icon: '⚠️',
        message: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's are' : ' is'} overdue!`,
        count: overdueTasks.length
      });
    }
    
    // Tasks due this week
    const dueThisWeek = allTasks.filter(t => t.date && t.date >= today && t.date <= nextWeek && t.status !== 'Done');
    if (dueThisWeek.length > 0) {
      alerts.push({
        id: 'due-soon',
        type: 'warning',
        icon: '📅',
        message: `${dueThisWeek.length} task${dueThisWeek.length > 1 ? 's' : ''} due this week`,
        count: dueThisWeek.length
      });
    }
    
    // Upcoming releases (within 30 days)
    const upcomingReleases = (data.releases || []).filter(r => 
      r.releaseDate && r.releaseDate >= today && r.releaseDate <= nextMonth
    );
    if (upcomingReleases.length > 0) {
      alerts.push({
        id: 'releases',
        type: 'info',
        icon: '🎵',
        message: `${upcomingReleases.length} release${upcomingReleases.length > 1 ? 's' : ''} coming up in the next 30 days`,
        count: upcomingReleases.length
      });
    }
    
    // Songs with upcoming release dates
    const upcomingSongs = (data.songs || []).filter(s =>
      s.releaseDate && s.releaseDate >= today && s.releaseDate <= nextMonth
    );
    if (upcomingSongs.length > 0) {
      alerts.push({
        id: 'songs',
        type: 'info',
        icon: '🎶',
        message: `${upcomingSongs.length} song${upcomingSongs.length > 1 ? 's' : ''} releasing soon`,
        count: upcomingSongs.length
      });
    }
    
    // Budget exceeded check (if we have data)
    const totalBudget = (data.settings?.totalBudget || 0);
    if (totalBudget > 0 && stats.totalCost > totalBudget) {
      alerts.push({
        id: 'budget',
        type: 'error',
        icon: '💰',
        message: `Budget exceeded by ${formatMoney(stats.totalCost - totalBudget)}`,
        count: 1
      });
    }
    
    // Delayed tasks
    const delayedTasks = allTasks.filter(t => t.status === 'Delayed');
    if (delayedTasks.length > 0) {
      alerts.push({
        id: 'delayed',
        type: 'warning',
        icon: '🔴',
        message: `${delayedTasks.length} task${delayedTasks.length > 1 ? 's' : ''} marked as delayed`,
        count: delayedTasks.length
      });
    }
    
    return alerts;
  }, [allTasks, data.releases, data.songs, data.settings?.totalBudget, stats.totalCost, today, nextWeek, nextMonth]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done': return 'bg-green-200 text-green-800';
      case 'In Progress': return 'bg-blue-200 text-blue-800';
      case 'Delayed': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const isOverdue = (date) => date && date < today;
  const isDueSoon = (date) => date && date >= today && date <= nextWeek;

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Task Dashboard</h2>
        <div className="flex gap-2 items-center">
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
            <option value="all">All Stages</option>
            {(data.stages || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button
            onClick={() => setView('upcoming')}
            className={cn("px-4 py-2", THEME.punk.btn, view === 'upcoming' ? "bg-black text-white" : "bg-white")}
          >
            Upcoming
          </button>
          <button 
            onClick={() => setView('inProgress')} 
            className={cn("px-4 py-2", THEME.punk.btn, view === 'inProgress' ? "bg-black text-white" : "bg-white")}
          >
            In Progress
          </button>
          <button 
            onClick={() => setView('overview')} 
            className={cn("px-4 py-2", THEME.punk.btn, view === 'overview' ? "bg-black text-white" : "bg-white")}
          >
            Overview
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className={cn("p-4 text-center", THEME.punk.card)}>
          <div className="text-3xl font-black text-gray-600">{stats.total}</div>
          <div className="text-xs font-bold uppercase">Total Tasks</div>
        </div>
        <div className={cn("p-4 text-center", THEME.punk.card, "bg-blue-50")}>
          <div className="text-3xl font-black text-blue-600">{stats.inProgress}</div>
          <div className="text-xs font-bold uppercase">In Progress</div>
        </div>
        <div className={cn("p-4 text-center", THEME.punk.card, "bg-yellow-50")}>
          <div className="text-3xl font-black text-yellow-600">{stats.dueSoon}</div>
          <div className="text-xs font-bold uppercase">Due This Week</div>
        </div>
        <div className={cn("p-4 text-center", THEME.punk.card, "bg-red-50")}>
          <div className="text-3xl font-black text-red-600">{stats.overdue}</div>
          <div className="text-xs font-bold uppercase">Overdue</div>
        </div>
        <div className={cn("p-4 text-center", THEME.punk.card, "bg-green-50")}>
          <div className="text-3xl font-black text-green-600">{stats.done}</div>
          <div className="text-xs font-bold uppercase">Completed</div>
        </div>
        <div className={cn("p-4 text-center", THEME.punk.card)}>
          <div className="text-2xl font-black text-pink-600">{formatMoney(stats.totalPaid)}</div>
          <div className="text-xs font-bold uppercase">Paid</div>
        </div>
        <div className={cn("p-4 text-center", THEME.punk.card)}>
          <div className="text-2xl font-black text-indigo-600">{formatMoney(stats.remaining)}</div>
          <div className="text-xs font-bold uppercase">Estimated Remaining</div>
        </div>
      </div>

      {/* Phase 9: Notifications/Alerts Section */}
      {notifications.length > 0 && (
        <div className={cn("p-4 mb-6", THEME.punk.card)}>
          <h3 className="font-black uppercase mb-3 border-b-2 border-black pb-2">🔔 Notifications</h3>
          <div className="space-y-2">
            {notifications.map(alert => (
              <div 
                key={alert.id}
                className={cn(
                  "flex items-center gap-3 p-3 border-l-4",
                  alert.type === 'error' ? 'bg-red-50 border-red-500' :
                  alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                )}
              >
                <span className="text-xl">{alert.icon}</span>
                <span className="font-bold flex-1">{alert.message}</span>
                <span className={cn(
                  "px-2 py-1 text-xs font-bold rounded-full",
                  alert.type === 'error' ? 'bg-red-200 text-red-800' :
                  alert.type === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-blue-200 text-blue-800'
                )}>
                  {alert.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier 1.4: Random Item Spotlight */}
      {(() => {
        // Collect all items for random spotlight
        const spotlightItems = [];
        (data.songs || []).forEach(song => spotlightItems.push({ type: 'Song', name: song.title, date: song.releaseDate, progress: calculateTaskProgress([...(song.deadlines || []), ...(song.customTasks || [])]).progress, category: song.category }));
        (data.releases || []).forEach(release => spotlightItems.push({ type: 'Release', name: release.name, date: release.releaseDate, progress: calculateTaskProgress([...(release.tasks || []), ...(release.customTasks || [])]).progress, category: release.type }));
        
        if (spotlightItems.length === 0) return null;
        
        // Use a hash of the full date string for more uniform daily random selection
        const dateStr = new Date().toISOString().split('T')[0]; // e.g., "2025-11-29"
        let hash = 0;
        for (let i = 0; i < dateStr.length; i++) {
          const char = dateStr.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        const randomItem = spotlightItems[Math.abs(hash) % spotlightItems.length];
        
        return (
          <div className={cn("p-4 mb-6", THEME.punk.card, "bg-gradient-to-r from-pink-100 to-purple-100")}>
            <h3 className="font-black uppercase mb-3 border-b-2 border-black pb-2">✨ Item Spotlight</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-1 text-xs font-bold",
                    randomItem.type === 'Song' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'
                  )}>
                    {randomItem.type}
                  </span>
                  <span className="font-bold text-lg">{randomItem.name}</span>
                </div>
                <div className="text-xs mt-1 opacity-70">
                  {randomItem.category} • {randomItem.date || 'No date set'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-purple-600">{randomItem.progress}%</div>
                <div className="text-xs font-bold uppercase opacity-60">Progress</div>
              </div>
            </div>
          </div>
        );
      })()}

      {view === 'overview' ? (
        /* Overview by Category */
        <div className={cn("p-6", THEME.punk.card)}>
          <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Progress by Category</h3>
          <div className="space-y-4">
            {Object.entries(categoryGroups).map(([category, data]) => (
              <div key={category} className="flex items-center gap-4">
                <div className="w-32 font-bold text-sm truncate">{category}</div>
                <div className="flex-1 h-6 bg-gray-200 relative overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-green-500 transition-all"
                    style={{ width: `${(data.done / data.total) * 100}%` }}
                  />
                  <div 
                    className="absolute inset-y-0 bg-blue-500 transition-all"
                    style={{ 
                      left: `${(data.done / data.total) * 100}%`,
                      width: `${(data.inProgress / data.total) * 100}%` 
                    }}
                  />
                </div>
                <div className="w-24 text-xs font-bold text-right">
                  {data.done}/{data.total} done
                </div>
              </div>
            ))}
          </div>
          
          {/* Status Distribution */}
          <h3 className="font-black uppercase mt-8 mb-4 border-b-4 border-black pb-2">Status Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-100 border-4 border-black">
              <div className="text-2xl font-black">{stats.notStarted}</div>
              <div className="text-xs font-bold uppercase">Not Started</div>
            </div>
            <div className="p-3 bg-blue-100 border-4 border-black">
              <div className="text-2xl font-black">{stats.inProgress}</div>
              <div className="text-xs font-bold uppercase">In Progress</div>
            </div>
            <div className="p-3 bg-green-100 border-4 border-black">
              <div className="text-2xl font-black">{stats.done}</div>
              <div className="text-xs font-bold uppercase">Done</div>
            </div>
            <div className="p-3 bg-red-100 border-4 border-black">
              <div className="text-2xl font-black">{stats.delayed}</div>
              <div className="text-xs font-bold uppercase">Delayed</div>
            </div>
          </div>
        </div>
      ) : (
        /* Task List */
        <div className={cn("overflow-x-auto", THEME.punk.card)}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white">
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Task</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Source</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center opacity-50">
                    {view === 'upcoming' ? 'No upcoming tasks in the next 30 days.' : 'No tasks in progress.'}
                  </td>
                </tr>
              ) : filteredTasks.map(task => (
                <tr 
                  key={task.id} 
                  className={cn(
                    "border-b border-gray-200",
                    isOverdue(task.date) ? "bg-red-50" : isDueSoon(task.date) ? "bg-yellow-50" : ""
                  )}
                >
                  <td className="p-3">
                    <span className={cn(
                      "font-bold",
                      isOverdue(task.date) ? "text-red-600" : isDueSoon(task.date) ? "text-yellow-600" : ""
                    )}>
                      {task.date || '-'}
                    </span>
                    {isOverdue(task.date) && <span className="ml-2 text-xs bg-red-500 text-white px-1">OVERDUE</span>}
                    {isDueSoon(task.date) && !isOverdue(task.date) && <span className="ml-2 text-xs bg-yellow-500 text-white px-1">SOON</span>}
                  </td>
                  <td className="p-3 font-bold">{task.type}</td>
                  <td className="p-3"><span className="px-2 py-1 text-xs bg-gray-200">{task.category}</span></td>
                  <td className="p-3">
                    <span className={cn(
                      "px-2 py-1 text-xs font-bold",
                      task.source === 'Song' ? "bg-blue-100" : task.source === 'Release' ? "bg-green-100" : "bg-orange-100"
                    )}>
                      {task.source}: {task.sourceName}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={cn("px-2 py-1 text-xs font-bold", getStatusColor(task.status))}>
                      {task.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">{formatMoney(task.estimatedCost || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Financials View - Per music-tracker-implementation-plan.md Section 5
// Build filter panel for Stage/Era/Release/Song/Version/Item Type + paid/quoted/projected toggles
// Render tables and charts based on cost precedence
export const FinancialsView = () => {
  const { data } = useStore();
  const [filterStage, setFilterStage] = useState('all');
  const [filterEra, setFilterEra] = useState('all');
  const [filterRelease, setFilterRelease] = useState('all');
  const [filterSong, setFilterSong] = useState('all');
  const [filterItemType, setFilterItemType] = useState('all');
  const [costMode, setCostMode] = useState('effective'); // 'paid', 'quoted', 'estimated', 'effective'
  
  // Get cost value based on selected mode
  const getCostValue = useCallback((item) => {
    if (costMode === 'paid') return item.paidCost || item.amount_paid || 0;
    if (costMode === 'quoted') return item.quotedCost || item.quoted_cost || 0;
    if (costMode === 'estimated') return item.estimatedCost || item.estimated_cost || 0;
    return getEffectiveCost(item);
  }, [costMode]);
  
  // Collect all cost items with their source information
  const costItems = useMemo(() => {
    const items = [];
    
    // Song costs
    (data.songs || []).forEach(song => {
      // Apply filters
      if (filterSong !== 'all' && song.id !== filterSong) return;
      if (filterEra !== 'all' && !(song.eraIds || []).includes(filterEra)) return;
      if (filterStage !== 'all' && !(song.stageIds || []).includes(filterStage)) return;
      if (filterRelease !== 'all' && song.coreReleaseId !== filterRelease && 
          !(song.versions || []).some(v => (v.releaseIds || []).includes(filterRelease))) return;
      if (filterItemType !== 'all' && filterItemType !== 'song') return;
      
      const songCost = getCostValue(song);
      if (songCost > 0) {
        items.push({
          id: `song-${song.id}`,
          name: song.title,
          source: 'Song',
          sourceId: song.id,
          itemType: 'song',
          estimatedCost: song.estimatedCost || 0,
          quotedCost: song.quotedCost || 0,
          paidCost: song.paidCost || 0,
          effectiveCost: getEffectiveCost(song),
          date: song.releaseDate,
          eraIds: song.eraIds,
          stageIds: song.stageIds
        });
      }
      
      // Song tasks
      (song.deadlines || []).forEach(task => {
        const taskCost = getCostValue(task);
        if (taskCost > 0 || (costMode === 'effective' && getEffectiveCost(task) > 0)) {
          items.push({
            id: `song-task-${song.id}-${task.id}`,
            name: `${task.type} - ${song.title}`,
            source: 'Song Task',
            sourceId: song.id,
            itemType: 'task',
            estimatedCost: task.estimatedCost || 0,
            quotedCost: task.quotedCost || 0,
            paidCost: task.paidCost || 0,
            effectiveCost: getEffectiveCost(task),
            date: task.date,
            eraIds: task.eraIds || song.eraIds,
            stageIds: task.stageIds || song.stageIds
          });
        }
      });
      
      // Custom tasks
      (song.customTasks || []).forEach(task => {
        const taskCost = getCostValue(task);
        if (taskCost > 0 || (costMode === 'effective' && getEffectiveCost(task) > 0)) {
          items.push({
            id: `song-custom-${song.id}-${task.id}`,
            name: `${task.title} - ${song.title}`,
            source: 'Song Custom',
            sourceId: song.id,
            itemType: 'task',
            estimatedCost: task.estimatedCost || 0,
            quotedCost: task.quotedCost || 0,
            paidCost: task.paidCost || 0,
            effectiveCost: getEffectiveCost(task),
            date: task.date,
            eraIds: task.eraIds || song.eraIds,
            stageIds: task.stageIds || song.stageIds
          });
        }
      });
      
      // Versions
      (song.versions || []).filter(v => v.id !== 'core').forEach(v => {
        if (filterItemType !== 'all' && filterItemType !== 'version') return;
        const versionCost = getCostValue(v);
        if (versionCost > 0) {
          items.push({
            id: `version-${song.id}-${v.id}`,
            name: `${v.name} - ${song.title}`,
            source: 'Version',
            sourceId: song.id,
            itemType: 'version',
            estimatedCost: v.estimatedCost || 0,
            quotedCost: v.quotedCost || 0,
            paidCost: v.paidCost || 0,
            effectiveCost: getEffectiveCost(v),
            date: v.releaseDate,
            eraIds: v.eraIds || song.eraIds,
            stageIds: v.stageIds || song.stageIds
          });
        }
        
        // Version tasks
        (v.tasks || []).forEach(task => {
          const taskCost = getCostValue(task);
          if (taskCost > 0 || (costMode === 'effective' && getEffectiveCost(task) > 0)) {
            items.push({
              id: `version-task-${song.id}-${v.id}-${task.id}`,
              name: `${task.type} - ${v.name}`,
              source: 'Version Task',
              sourceId: song.id,
              itemType: 'task',
              estimatedCost: task.estimatedCost || 0,
              quotedCost: task.quotedCost || 0,
              paidCost: task.paidCost || 0,
              effectiveCost: getEffectiveCost(task),
              date: task.date,
              eraIds: task.eraIds || v.eraIds || song.eraIds,
              stageIds: task.stageIds || v.stageIds || song.stageIds
            });
          }
        });
      });
      
      // Videos
      (song.videos || []).forEach(video => {
        if (filterItemType !== 'all' && filterItemType !== 'video') return;
        const videoCost = getCostValue(video);
        if (videoCost > 0) {
          items.push({
            id: `video-${song.id}-${video.id}`,
            name: `${video.title} - ${song.title}`,
            source: 'Video',
            sourceId: song.id,
            itemType: 'video',
            estimatedCost: video.estimatedCost || 0,
            quotedCost: video.quotedCost || 0,
            paidCost: video.paidCost || 0,
            effectiveCost: getEffectiveCost(video),
            date: video.releaseDate,
            eraIds: video.eraIds || song.eraIds,
            stageIds: video.stageIds || song.stageIds
          });
        }
      });
    });
    
    // Release costs
    (data.releases || []).forEach(release => {
      if (filterRelease !== 'all' && release.id !== filterRelease) return;
      if (filterItemType !== 'all' && filterItemType !== 'release') return;
      
      const releaseCost = getCostValue(release);
      if (releaseCost > 0) {
        items.push({
          id: `release-${release.id}`,
          name: release.name,
          source: 'Release',
          sourceId: release.id,
          itemType: 'release',
          estimatedCost: release.estimatedCost || 0,
          quotedCost: release.quotedCost || 0,
          paidCost: release.paidCost || 0,
          effectiveCost: getEffectiveCost(release),
          date: release.releaseDate,
          eraIds: release.eraIds,
          stageIds: release.stageIds
        });
      }
      
      // Release tasks
      (release.tasks || []).forEach(task => {
        const taskCost = getCostValue(task);
        if (taskCost > 0 || (costMode === 'effective' && getEffectiveCost(task) > 0)) {
          items.push({
            id: `release-task-${release.id}-${task.id}`,
            name: `${task.type} - ${release.name}`,
            source: 'Release Task',
            sourceId: release.id,
            itemType: 'task',
            estimatedCost: task.estimatedCost || 0,
            quotedCost: task.quotedCost || 0,
            paidCost: task.paidCost || 0,
            effectiveCost: getEffectiveCost(task),
            date: task.date,
            eraIds: task.eraIds || release.eraIds,
            stageIds: task.stageIds || release.stageIds
          });
        }
      });
    });
    
    // Global tasks
    (data.globalTasks || []).forEach(task => {
      if (filterItemType !== 'all' && filterItemType !== 'global') return;
      const taskCost = getCostValue(task);
      if (taskCost > 0 || (costMode === 'effective' && getEffectiveCost(task) > 0)) {
        items.push({
          id: `global-${task.id}`,
          name: task.taskName || task.title,
          source: 'Global Task',
          sourceId: task.id,
          itemType: 'global',
          estimatedCost: task.estimatedCost || 0,
          quotedCost: task.quotedCost || 0,
          paidCost: task.paidCost || 0,
          effectiveCost: getEffectiveCost(task),
          date: task.date,
          eraIds: task.eraIds,
          stageIds: task.stageIds,
          category: task.category
        });
      }
    });
    
    // Events - Phase 2: Events derive cost from tasks only
    (data.events || []).forEach(event => {
      if (filterItemType !== 'all' && filterItemType !== 'event') return;
      // Calculate cost from tasks
      const eventTasks = [...(event.tasks || []), ...(event.customTasks || [])];
      const taskCost = eventTasks.reduce((sum, t) => sum + getEffectiveCost(t), 0);
      if (taskCost > 0) {
        items.push({
          id: `event-${event.id}`,
          name: event.title,
          source: 'Event',
          sourceId: event.id,
          itemType: 'event',
          estimatedCost: eventTasks.reduce((sum, t) => sum + (t.estimatedCost || 0), 0),
          quotedCost: eventTasks.reduce((sum, t) => sum + (t.quotedCost || 0), 0),
          paidCost: eventTasks.reduce((sum, t) => sum + (t.paidCost || 0), 0),
          effectiveCost: taskCost,
          date: event.date,
          eraIds: event.eraIds,
          stageIds: event.stageIds
        });
      }
    });
    
    // Per APP ARCHITECTURE.txt Section 1.2: Expenses as Item type
    (data.expenses || []).forEach(expense => {
      if (expense.isArchived) return;
      if (filterItemType !== 'all' && filterItemType !== 'expense') return;
      const expenseCost = getCostValue(expense);
      if (expenseCost > 0 || (costMode === 'effective' && getEffectiveCost(expense) > 0)) {
        items.push({
          id: `expense-${expense.id}`,
          name: expense.name,
          source: 'Expense',
          sourceId: expense.id,
          itemType: 'expense',
          estimatedCost: expense.estimatedCost || 0,
          quotedCost: expense.quotedCost || 0,
          paidCost: expense.paidCost || 0,
          effectiveCost: getEffectiveCost(expense),
          date: expense.date,
          eraIds: expense.eraIds,
          stageIds: expense.stageIds
        });
      }
    });
    
    return items.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [data, filterStage, filterEra, filterRelease, filterSong, filterItemType, costMode, getCostValue]);
  
  // Calculate totals
  const totals = useMemo(() => {
    return costItems.reduce((acc, item) => ({
      estimated: acc.estimated + (item.estimatedCost || 0),
      quoted: acc.quoted + (item.quotedCost || 0),
      paid: acc.paid + (item.paidCost || 0),
      effective: acc.effective + (item.effectiveCost || 0)
    }), { estimated: 0, quoted: 0, paid: 0, effective: 0 });
  }, [costItems]);
  
  // Group by source for summary
  const sourceGroups = useMemo(() => {
    const groups = {};
    costItems.forEach(item => {
      if (!groups[item.source]) {
        groups[item.source] = { count: 0, estimated: 0, quoted: 0, paid: 0, effective: 0 };
      }
      groups[item.source].count++;
      groups[item.source].estimated += item.estimatedCost || 0;
      groups[item.source].quoted += item.quotedCost || 0;
      groups[item.source].paid += item.paidCost || 0;
      groups[item.source].effective += item.effectiveCost || 0;
    });
    return groups;
  }, [costItems]);

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Financials</h2>
        <div className="flex gap-2">
          <select value={costMode} onChange={e => setCostMode(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
            <option value="effective">Effective Cost (Paid → Quoted → Estimated)</option>
            <option value="paid">Paid Only</option>
            <option value="quoted">Quoted Only</option>
            <option value="estimated">Estimated Only</option>
          </select>
        </div>
      </div>

      {/* Filter Panel - Per Section 5 of implementation plan */}
      <div className={cn("p-4 mb-6 bg-gray-50", THEME.punk.card)}>
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Stage</label>
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Stages</option>
              {(data.stages || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Era</label>
            <select value={filterEra} onChange={e => setFilterEra(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Eras</option>
              {(data.eras || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Release</label>
            <select value={filterRelease} onChange={e => setFilterRelease(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Releases</option>
              {(data.releases || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Song</label>
            <select value={filterSong} onChange={e => setFilterSong(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Songs</option>
              {(data.songs || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Item Type</label>
            <select value={filterItemType} onChange={e => setFilterItemType(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Types</option>
              <option value="song">Songs</option>
              <option value="version">Versions</option>
              <option value="video">Videos</option>
              <option value="release">Releases</option>
              <option value="global">Global Tasks</option>
              <option value="event">Events</option>
              <option value="expense">Expenses</option>
              <option value="task">Tasks</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={cn("p-4 text-center", THEME.punk.card)}>
          <div className="text-2xl font-black text-gray-600">{formatMoney(totals.estimated)}</div>
          <div className="text-xs font-bold uppercase">Estimated</div>
        </div>
        <div className={cn("p-4 text-center", THEME.punk.card)}>
          <div className="text-2xl font-black text-blue-600">{formatMoney(totals.quoted)}</div>
          <div className="text-xs font-bold uppercase">Quoted</div>
        </div>
        <div className={cn("p-4 text-center", THEME.punk.card, "bg-green-50")}>
          <div className="text-2xl font-black text-green-600">{formatMoney(totals.paid)}</div>
          <div className="text-xs font-bold uppercase">Paid</div>
        </div>
        <div className={cn("p-4 text-center", THEME.punk.card, "bg-pink-100")}>
          <div className="text-2xl font-black text-pink-600">{formatMoney(totals.effective)}</div>
          <div className="text-xs font-bold uppercase">Effective Total</div>
        </div>
      </div>

      {/* Summary by Source */}
      <div className={cn("p-4 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Summary by Source</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left">Source</th>
                <th className="p-2 text-right">Count</th>
                <th className="p-2 text-right">Estimated</th>
                <th className="p-2 text-right">Quoted</th>
                <th className="p-2 text-right">Paid</th>
                <th className="p-2 text-right">Effective</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(sourceGroups).map(([source, data]) => (
                <tr key={source} className="border-b border-gray-200">
                  <td className="p-2 font-bold">{source}</td>
                  <td className="p-2 text-right">{data.count}</td>
                  <td className="p-2 text-right">{formatMoney(data.estimated)}</td>
                  <td className="p-2 text-right">{formatMoney(data.quoted)}</td>
                  <td className="p-2 text-right text-green-600 font-bold">{formatMoney(data.paid)}</td>
                  <td className="p-2 text-right text-pink-600 font-bold">{formatMoney(data.effective)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-black text-white font-bold">
                <td className="p-2">TOTAL</td>
                <td className="p-2 text-right">{costItems.length}</td>
                <td className="p-2 text-right">{formatMoney(totals.estimated)}</td>
                <td className="p-2 text-right">{formatMoney(totals.quoted)}</td>
                <td className="p-2 text-right">{formatMoney(totals.paid)}</td>
                <td className="p-2 text-right">{formatMoney(totals.effective)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Detailed Cost Table */}
      <div className={cn("overflow-x-auto", THEME.punk.card)}>
        <h3 className="font-black uppercase p-4 border-b-4 border-black">Detailed Costs</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-right">Estimated</th>
              <th className="p-3 text-right">Quoted</th>
              <th className="p-3 text-right">Paid</th>
              <th className="p-3 text-right">Effective</th>
            </tr>
          </thead>
          <tbody>
            {costItems.length === 0 ? (
              <tr><td colSpan="7" className="p-10 text-center opacity-50">No cost items found.</td></tr>
            ) : costItems.map(item => (
              <tr key={item.id} className="border-b border-gray-200 hover:bg-yellow-50">
                <td className="p-3">{item.date || '-'}</td>
                <td className="p-3 font-bold">{item.name}</td>
                <td className="p-3">
                  <span className={cn(
                    "px-2 py-1 text-xs font-bold",
                    item.source.includes('Song') ? "bg-blue-100" :
                    item.source.includes('Release') ? "bg-green-100" :
                    item.source.includes('Video') ? "bg-orange-100" :
                    item.source.includes('Global') ? "bg-yellow-100" :
                    item.source.includes('Event') ? "bg-pink-100" :
                    item.source.includes('Expense') ? "bg-purple-100" :
                    "bg-gray-100"
                  )}>
                    {item.source}
                  </span>
                </td>
                <td className="p-3 text-right">{formatMoney(item.estimatedCost)}</td>
                <td className="p-3 text-right">{formatMoney(item.quotedCost)}</td>
                <td className="p-3 text-right text-green-600 font-bold">{formatMoney(item.paidCost)}</td>
                <td className="p-3 text-right text-pink-600 font-bold">{formatMoney(item.effectiveCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Progress View - Per music-tracker-implementation-plan.md Section 5
// Display progress using 0/0.5/1 model with filters for Era, Stage, Tags, Item Type, Release/Song/Version
export const ProgressView = () => {
  const { data } = useStore();
  const [filterEra, setFilterEra] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [filterItemType, setFilterItemType] = useState('all');
  const [filterRelease, setFilterRelease] = useState('all');
  const [filterSong, setFilterSong] = useState('all');
  
  // Collect all items with progress
  const progressItems = useMemo(() => {
    const items = [];
    
    // Songs
    (data.songs || []).forEach(song => {
      if (filterSong !== 'all' && song.id !== filterSong) return;
      if (filterEra !== 'all' && !(song.eraIds || []).includes(filterEra)) return;
      if (filterStage !== 'all' && !(song.stageIds || []).includes(filterStage)) return;
      if (filterTag !== 'all' && !(song.tagIds || []).includes(filterTag)) return;
      if (filterRelease !== 'all' && song.coreReleaseId !== filterRelease) return;
      if (filterItemType !== 'all' && filterItemType !== 'song') return;
      
      const allTasks = [
        ...(song.deadlines || []),
        ...(song.customTasks || []),
        ...(song.versions || []).flatMap(v => [...(v.tasks || []), ...(v.customTasks || [])])
      ];
      const progress = calculateTaskProgress(allTasks);
      
      items.push({
        id: `song-${song.id}`,
        name: song.title,
        type: 'Song',
        releaseDate: song.releaseDate,
        totalTasks: progress.totalTasks,
        pointsEarned: progress.pointsEarned,
        progress: progress.progress,
        eraIds: song.eraIds,
        stageIds: song.stageIds,
        tagIds: song.tagIds
      });
      
      // Individual versions
      (song.versions || []).filter(v => v.id !== 'core').forEach(v => {
        if (filterItemType !== 'all' && filterItemType !== 'version') return;
        const versionTasks = [...(v.tasks || []), ...(v.customTasks || [])];
        const vProgress = calculateTaskProgress(versionTasks);
        
        items.push({
          id: `version-${song.id}-${v.id}`,
          name: `${v.name} (${song.title})`,
          type: 'Version',
          releaseDate: v.releaseDate || song.releaseDate,
          totalTasks: vProgress.totalTasks,
          pointsEarned: vProgress.pointsEarned,
          progress: vProgress.progress,
          eraIds: v.eraIds || song.eraIds,
          stageIds: v.stageIds || song.stageIds,
          tagIds: v.tagIds || song.tagIds
        });
      });
      
      // Videos
      (song.videos || []).forEach(video => {
        if (filterItemType !== 'all' && filterItemType !== 'video') return;
        const videoTasks = [...(video.tasks || []), ...(video.customTasks || [])];
        const vProgress = calculateTaskProgress(videoTasks);
        
        items.push({
          id: `video-${song.id}-${video.id}`,
          name: `${video.title} (${song.title})`,
          type: 'Video',
          releaseDate: video.releaseDate || song.releaseDate,
          totalTasks: vProgress.totalTasks,
          pointsEarned: vProgress.pointsEarned,
          progress: vProgress.progress,
          eraIds: video.eraIds || song.eraIds,
          stageIds: video.stageIds || song.stageIds,
          tagIds: video.tagIds || song.tagIds
        });
      });
    });
    
    // Releases
    (data.releases || []).forEach(release => {
      if (filterRelease !== 'all' && release.id !== filterRelease) return;
      if (filterItemType !== 'all' && filterItemType !== 'release') return;
      
      const releaseTasks = [...(release.tasks || []), ...(release.customTasks || [])];
      const progress = calculateTaskProgress(releaseTasks);
      
      items.push({
        id: `release-${release.id}`,
        name: release.name,
        type: 'Release',
        releaseDate: release.releaseDate,
        totalTasks: progress.totalTasks,
        pointsEarned: progress.pointsEarned,
        progress: progress.progress,
        eraIds: release.eraIds,
        stageIds: release.stageIds,
        tagIds: release.tagIds
      });
    });
    
    // Events
    (data.events || []).forEach(event => {
      if (filterItemType !== 'all' && filterItemType !== 'event') return;
      
      const eventTasks = [...(event.tasks || []), ...(event.customTasks || [])];
      const progress = calculateTaskProgress(eventTasks);
      
      items.push({
        id: `event-${event.id}`,
        name: event.title,
        type: 'Event',
        releaseDate: event.date,
        totalTasks: progress.totalTasks,
        pointsEarned: progress.pointsEarned,
        progress: progress.progress,
        eraIds: event.eraIds,
        stageIds: event.stageIds,
        tagIds: event.tagIds
      });
    });
    
    return items.sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''));
  }, [data, filterEra, filterStage, filterTag, filterItemType, filterRelease, filterSong]);
  
  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const totalTasks = progressItems.reduce((sum, item) => sum + item.totalTasks, 0);
    const totalPoints = progressItems.reduce((sum, item) => sum + item.pointsEarned, 0);
    return totalTasks > 0 ? Math.round((totalPoints / totalTasks) * 100) : 0;
  }, [progressItems]);
  
  // Group by type for summary
  const typeGroups = useMemo(() => {
    const groups = {};
    progressItems.forEach(item => {
      if (!groups[item.type]) {
        groups[item.type] = { count: 0, totalTasks: 0, pointsEarned: 0 };
      }
      groups[item.type].count++;
      groups[item.type].totalTasks += item.totalTasks;
      groups[item.type].pointsEarned += item.pointsEarned;
    });
    return groups;
  }, [progressItems]);

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Progress</h2>
        <div className="text-right">
          <div className="text-3xl font-black text-pink-600">{overallProgress}%</div>
          <div className="text-xs font-bold uppercase opacity-60">Overall Progress</div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className={cn("p-4 mb-6 bg-gray-50", THEME.punk.card)}>
        <div className="grid md:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Era</label>
            <select value={filterEra} onChange={e => setFilterEra(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Eras</option>
              {(data.eras || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Stage</label>
            <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Stages</option>
              {(data.stages || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Tag</label>
            <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Tags</option>
              {(data.tags || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Item Type</label>
            <select value={filterItemType} onChange={e => setFilterItemType(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Types</option>
              <option value="song">Songs</option>
              <option value="version">Versions</option>
              <option value="video">Videos</option>
              <option value="release">Releases</option>
              <option value="event">Events</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Release</label>
            <select value={filterRelease} onChange={e => setFilterRelease(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Releases</option>
              {(data.releases || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Song</label>
            <select value={filterSong} onChange={e => setFilterSong(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Songs</option>
              {(data.songs || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Summary by Type */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(typeGroups).map(([type, data]) => {
          const typeProgress = data.totalTasks > 0 ? Math.round((data.pointsEarned / data.totalTasks) * 100) : 0;
          return (
            <div key={type} className={cn("p-4 text-center", THEME.punk.card)}>
              <div className="text-2xl font-black">{typeProgress}%</div>
              <div className="text-xs font-bold uppercase">{type}s ({data.count})</div>
              <div className="w-full h-2 bg-gray-200 mt-2">
                <div className={cn("h-full", getProgressColor(typeProgress))} style={{ width: `${typeProgress}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Table */}
      <div className={cn("overflow-x-auto", THEME.punk.card)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-center">Tasks</th>
              <th className="p-3 text-center">Points</th>
              <th className="p-3 text-left">Progress</th>
            </tr>
          </thead>
          <tbody>
            {progressItems.length === 0 ? (
              <tr><td colSpan="6" className="p-10 text-center opacity-50">No items found.</td></tr>
            ) : progressItems.map(item => (
              <tr key={item.id} className="border-b border-gray-200 hover:bg-yellow-50">
                <td className="p-3 font-bold">{item.name}</td>
                <td className="p-3">
                  <span className={cn(
                    "px-2 py-1 text-xs font-bold",
                    item.type === 'Song' ? "bg-blue-100" :
                    item.type === 'Version' ? "bg-indigo-100" :
                    item.type === 'Video' ? "bg-orange-100" :
                    item.type === 'Release' ? "bg-green-100" :
                    "bg-pink-100"
                  )}>
                    {item.type}
                  </span>
                </td>
                <td className="p-3">{item.releaseDate || '-'}</td>
                <td className="p-3 text-center">{item.totalTasks}</td>
                <td className="p-3 text-center">{item.pointsEarned.toFixed(1)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-4 bg-gray-200">
                      <div className={cn("h-full", getProgressColor(item.progress))} style={{ width: `${item.progress}%` }} />
                    </div>
                    <span className="font-bold text-xs w-12 text-right">{item.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Events List View - Following same pattern as Songs and Releases per unified Item/Page architecture
export const EventsListView = ({ onSelectEvent }) => {
  const { data, actions } = useStore();
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('asc');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('list');

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => (
    <span>{sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
  );

  const eventProgress = (event) => {
    const tasks = [...(event.tasks || []), ...(event.customTasks || [])];
    return calculateTaskProgress(tasks).progress;
  };

  // Phase 2: Events derive cost from tasks only
  const eventCost = (event) => {
    const tasks = [...(event.tasks || []), ...(event.customTasks || [])];
    return tasks.reduce((sum, t) => sum + getEffectiveCost(t), 0);
  };

  const events = useMemo(() => {
    let filtered = [...(data.events || [])];
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.type === filterType);
    }
    filtered.sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      // Phase 2: Sort by task cost instead of event cost
      if (sortBy === 'estimatedCost') { valA = eventCost(a); valB = eventCost(b); }
      if (sortDir === 'asc') { return valA < valB ? -1 : valA > valB ? 1 : 0; }
      else { return valA > valB ? -1 : valA < valB ? 1 : 0; }
    });
    return filtered;
  }, [data.events, sortBy, sortDir, filterType]);

  const handleAddEvent = async () => {
    const newEvent = await actions.addEvent({ title: 'New Event', date: new Date().toISOString().split('T')[0], type: 'Standalone Event' }, false);
    if (onSelectEvent) onSelectEvent(newEvent);
  };

  const eventTypes = useMemo(() => {
    const types = new Set();
    (data.events || []).forEach(e => e.type && types.add(e.type));
    return Array.from(types);
  }, [data.events]);

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Events</h2>
        <div className="flex flex-wrap gap-2">
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
            <option value="all">All Types</option>
            {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={handleAddEvent} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Event</button>
        </div>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {events.length === 0 ? (
            <div className={cn("col-span-full p-10 text-center opacity-50", THEME.punk.card)}>No events yet. Click Add Event to create one.</div>
          ) : (
            events.map(event => (
              <div key={event.id} onClick={() => onSelectEvent && onSelectEvent(event)} className={cn("p-4 cursor-pointer hover:bg-yellow-50", THEME.punk.card)}>
                <div className="font-bold text-lg mb-2">{event.title}</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between"><span className="opacity-60">Type:</span><span className="font-bold">{event.type || 'Event'}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Date:</span><span className="font-bold">{event.date || 'TBD'}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Location:</span><span className="font-bold">{event.location || '-'}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Progress:</span><span className="font-bold">{eventProgress(event)}%</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Task Cost:</span><span className="font-bold">{formatMoney(eventCost(event))}</span></div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={cn("overflow-x-auto", THEME.punk.card)}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white">
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('title')}>Title <SortIcon field="title" /></th>
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('type')}>Type <SortIcon field="type" /></th>
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('date')}>Date <SortIcon field="date" /></th>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-right">Progress</th>
                <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('estimatedCost')}>Task Cost <SortIcon field="estimatedCost" /></th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan="7" className="p-10 text-center opacity-50">No events yet. Click Add Event to create one.</td></tr>
              ) : (
                events.map(event => (
                  <tr key={event.id} onClick={() => onSelectEvent && onSelectEvent(event)} className="border-b border-gray-200 hover:bg-yellow-50 cursor-pointer">
                    <td className="p-3 font-bold">{event.title}</td>
                    <td className="p-3">{event.type || '-'}</td>
                    <td className="p-3">{event.date || '-'}</td>
                    <td className="p-3">{event.time || '-'}</td>
                    <td className="p-3">{event.location || '-'}</td>
                    <td className="p-3 text-right">{eventProgress(event)}%</td>
                    <td className="p-3 text-right">{formatMoney(eventCost(event))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Event Detail View - Following same pattern as SongDetailView and ReleaseDetailView
export const EventDetailView = ({ event, onBack }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...event });
  const [taskFilterStatus, setTaskFilterStatus] = useState('all');
  const [taskSortBy, setTaskSortBy] = useState('date');
  const [taskSortDir, setTaskSortDir] = useState('asc');
  // Task editing modal state - Unified Task Handling Architecture
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskContext, setEditingTaskContext] = useState(null); // { type: 'auto'|'custom'|'new-custom' }

  const teamMembers = useMemo(() => data.teamMembers || [], [data.teamMembers]);

  const handleSave = async () => { await actions.updateEvent(event.id, form); };
  const handleFieldChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

  // Handle opening the Task Edit Modal - Unified Task Handling Architecture
  const handleOpenTaskEdit = (task, context) => {
    setEditingTask({ ...task });
    setEditingTaskContext(context);
  };

  // Handle saving task from the Task Edit Modal - Unified Task Handling Architecture
  const handleSaveTaskEdit = async () => {
    if (!editingTask || !editingTaskContext) return;
    
    if (editingTaskContext.type === 'new-custom') {
      // Creating a new custom task
      await actions.addEventCustomTask(event.id, {
        title: editingTask.type || editingTask.title || 'New Task',
        type: editingTask.type || editingTask.title || 'Custom',
        date: editingTask.date || editingTask.dueDate || '',
        dueDate: editingTask.date || editingTask.dueDate || '',
        status: editingTask.status || 'Not Started',
        estimatedCost: editingTask.estimatedCost || 0,
        quotedCost: editingTask.quotedCost || 0,
        paidCost: editingTask.paidCost || 0,
        notes: editingTask.notes || editingTask.description || '',
        description: editingTask.description || editingTask.notes || '',
        assignedMembers: editingTask.assignedMembers || [],
        eraIds: editingTask.eraIds || [],
        stageIds: editingTask.stageIds || [],
        tagIds: editingTask.tagIds || [],
        isAutoTask: false
      });
    } else if (editingTaskContext.type === 'auto') {
      const updatedTasks = eventTasks.map(t => t.id === editingTask.id ? editingTask : t);
      await actions.updateEvent(event.id, { tasks: updatedTasks });
    } else if (editingTaskContext.type === 'custom') {
      await actions.updateEventCustomTask(event.id, editingTask.id, editingTask);
    }
    
    setEditingTask(null);
    setEditingTaskContext(null);
  };

  const handleDeleteEvent = async () => {
    if (confirm('Delete this event?')) { await actions.deleteEvent(event.id); onBack(); }
  };

  const currentEvent = useMemo(() => data.events.find(e => e.id === event.id) || event, [data.events, event]);
  const eventTasks = useMemo(() => currentEvent.tasks || [], [currentEvent.tasks]);
  const eventCustomTasks = useMemo(() => currentEvent.customTasks || [], [currentEvent.customTasks]);
  const allEventTasks = useMemo(() => [...eventTasks, ...eventCustomTasks], [eventTasks, eventCustomTasks]);
  const { progress: eventProgressValue } = calculateTaskProgress(allEventTasks);
  
  // Phase 2: Calculate costs from tasks only - events derive cost from tasks
  const costPaid = useMemo(() => allEventTasks.reduce((sum, t) => sum + (t.paidCost || 0), 0), [allEventTasks]);
  const estimatedCost = useMemo(() => allEventTasks.reduce((sum, t) => sum + getEffectiveCost(t), 0), [allEventTasks]);
  
  // Calculate overdue tasks
  const overdueTasks = useMemo(() => allEventTasks.filter(t => t.date && new Date(t.date) < new Date() && t.status !== 'Complete' && t.status !== 'Done'), [allEventTasks]);
  const openTasks = useMemo(() => allEventTasks.filter(t => t.status !== 'Complete' && t.status !== 'Done'), [allEventTasks]);

  const assignedTeamMembers = useMemo(() => {
    const memberIds = new Set();
    allEventTasks.forEach(task => {
      (task.assignedMembers || []).forEach(m => memberIds.add(m.memberId));
    });
    return teamMembers.filter(m => memberIds.has(m.id));
  }, [allEventTasks, teamMembers]);
  
  // Unified filtered and sorted tasks (includes both auto and custom tasks)
  const filteredTasks = useMemo(() => {
    const combined = [
      ...eventTasks.map(t => ({ ...t, _isAuto: true })),
      ...eventCustomTasks.map(t => ({ ...t, _isAuto: false }))
    ];
    let filtered = [...combined];
    if (taskFilterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === taskFilterStatus);
    }
    filtered.sort((a, b) => {
      const valA = a[taskSortBy] || '';
      const valB = b[taskSortBy] || '';
      return taskSortDir === 'asc' 
        ? (valA < valB ? -1 : valA > valB ? 1 : 0)
        : (valA > valB ? -1 : valA < valB ? 1 : 0);
    });
    return filtered;
  }, [eventTasks, eventCustomTasks, taskFilterStatus, taskSortBy, taskSortDir]);

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className={cn("px-4 py-2 bg-white flex items-center gap-2", THEME.punk.btn)}>
          <Icon name="ChevronLeft" size={16} /> Back to Events
        </button>
        <button onClick={handleDeleteEvent} className={cn("px-4 py-2", THEME.punk.btn, "bg-red-500 text-white")}>
          <Icon name="Trash2" size={16} />
        </button>
      </div>

      {/* SECTION A: Display Information (read-only) - Following SongDetailView pattern */}
      <div className={cn("p-6 mb-6 bg-gray-50", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Display Information</h3>
        
        {/* Event Title - prominent at top */}
        <div className="text-2xl font-black mb-4 pb-2 border-b-2 border-gray-300">{currentEvent.title || 'Untitled Event'}</div>
        
        <div className="grid md:grid-cols-4 gap-4">
          {/* Task Progress */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Task Progress</label>
            <div className="px-3 py-2 bg-yellow-100 border-2 border-black text-lg font-black">{eventProgressValue}%</div>
          </div>
          
          {/* Event Date/Time */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Event Date</label>
            <div className="px-3 py-2 bg-blue-100 border-2 border-black text-sm font-bold">
              {currentEvent.date || 'Not Set'} {currentEvent.time && `@ ${currentEvent.time}`}
            </div>
          </div>
          
          {/* Location */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Location</label>
            <div className="px-3 py-2 bg-gray-100 border-2 border-black text-sm font-bold">
              {currentEvent.location || 'TBD'}
            </div>
          </div>
          
          {/* Number of Open Tasks */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Open Tasks</label>
            <div className="px-3 py-2 bg-gray-100 border-2 border-black text-lg font-black">
              {openTasks.length}
            </div>
          </div>
          
          {/* Overdue Task Indicator */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Overdue Tasks</label>
            <div className={cn("px-3 py-2 border-2 border-black text-lg font-black", 
              overdueTasks.length > 0 ? "bg-red-200" : "bg-green-100"
            )}>
              {overdueTasks.length}
            </div>
          </div>
          
          {/* Entry Cost */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Entry Cost</label>
            <div className="px-3 py-2 bg-purple-100 border-2 border-black text-sm font-bold">
              {formatMoney(currentEvent.entryCost || 0)}
            </div>
          </div>
          
          {/* Phase 2: Cost from Tasks - derived, not direct input */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Task Cost Paid</label>
            <div className="px-3 py-2 bg-green-100 border-2 border-black text-sm font-bold">
              {formatMoney(costPaid)}
            </div>
          </div>
          
          {/* Phase 2: Total cost derived from tasks */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Total Task Cost</label>
            <div className="px-3 py-2 bg-yellow-100 border-2 border-black text-sm font-bold">
              {formatMoney(estimatedCost)}
            </div>
          </div>
          
          {/* Team Members */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold uppercase mb-2">Team Members on Tasks</label>
            <div className="flex flex-wrap gap-2">
              {assignedTeamMembers.length === 0 ? (
                <span className="text-xs opacity-50">No team members assigned</span>
              ) : assignedTeamMembers.map(m => (
                <div key={m.id} className="px-2 py-1 bg-purple-100 border-2 border-black text-xs font-bold">
                  {m.name} {m.isMusician && '🎵'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: Basic Information (editable) */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Event Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Title</label>
            <input value={form.title || ''} onChange={e => handleFieldChange('title', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Type</label>
            <input value={form.type || ''} onChange={e => handleFieldChange('type', e.target.value)} onBlur={handleSave} placeholder="Concert, Festival, Livestream" className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Date</label>
            <input type="date" value={form.date || ''} onChange={e => handleFieldChange('date', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Time</label>
            <input type="time" value={form.time || ''} onChange={e => handleFieldChange('time', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Location</label>
            <div className="flex gap-2">
              <input value={form.location || ''} onChange={e => handleFieldChange('location', e.target.value)} onBlur={handleSave} placeholder="Venue, City" className={cn("flex-1", THEME.punk.input)} />
              {/* Phase 2.4: Map Button */}
              {form.location && (
                <button 
                  onClick={() => {
                    const encoded = encodeURIComponent(form.location);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
                  }}
                  className={cn("px-3 py-2 whitespace-nowrap", THEME.punk.btn, "bg-blue-500 text-white")}
                  title="Open in Maps"
                >
                  <Icon name="MapPin" size={16} />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Entry Cost</label>
            <input type="number" value={form.entryCost || 0} onChange={e => handleFieldChange('entryCost', parseFloat(e.target.value) || 0)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          {/* Phase 2.3: Stage/Era/Tags for Events */}
          <div className="md:col-span-2">
            <EraStageTagsPicker
              value={{
                eraIds: form.eraIds || [],
                stageIds: form.stageIds || [],
                tagIds: form.tagIds || []
              }}
              onChange={({ eraIds, stageIds, tagIds }) => {
                handleFieldChange('eraIds', eraIds);
                handleFieldChange('stageIds', stageIds);
                handleFieldChange('tagIds', tagIds);
                setTimeout(handleSave, 0);
              }}
              multipleEras={true}
              multipleStages={true}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} placeholder="Event notes..." />
          </div>
        </div>
      </div>

      {/* Phase 2.1: Attendees Module - Simple name-only list */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Attendees</h3>
        <div className="space-y-2">
          {(form.attendees || []).length === 0 ? (
            <div className="text-xs opacity-50 mb-2">No attendees added yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-3">
              {(form.attendees || []).map((attendee, idx) => (
                <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-gray-100 border-2 border-black text-xs font-bold">
                  <span>{attendee}</span>
                  <button 
                    onClick={() => {
                      const updated = (form.attendees || []).filter((_, i) => i !== idx);
                      handleFieldChange('attendees', updated);
                      handleSave();
                    }}
                    className="text-red-500 hover:bg-red-100 p-0.5"
                  >
                    <Icon name="X" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Add attendee name"
              className={cn("flex-1", THEME.punk.input)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  const updated = [...(form.attendees || []), e.target.value.trim()];
                  handleFieldChange('attendees', updated);
                  handleSave();
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.target.closest('.flex').querySelector('input');
                if (input.value.trim()) {
                  const updated = [...(form.attendees || []), input.value.trim()];
                  handleFieldChange('attendees', updated);
                  handleSave();
                  input.value = '';
                }
              }}
              className={cn("px-3 py-2", THEME.punk.btn, "bg-black text-white")}
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Items Linked to This Event - Simplified UI */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Items Linked to This Event</h3>
        
        {/* Display linked items as pills */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 border-2 border-black">
            {/* Songs */}
            {(form.linkedSongIds || []).map(songId => {
              const song = (data.songs || []).find(s => s.id === songId);
              return song ? (
                <div key={songId} className="flex items-center gap-1 px-2 py-1 bg-blue-100 border-2 border-blue-500 text-xs font-bold">
                  <span>🎵 {song.title}</span>
                  <button onClick={() => {
                    handleFieldChange('linkedSongIds', (form.linkedSongIds || []).filter(id => id !== songId));
                    setTimeout(handleSave, 0);
                  }} className="text-blue-800 hover:text-red-600"><Icon name="X" size={12} /></button>
                </div>
              ) : null;
            })}
            {/* Releases */}
            {(form.linkedReleaseIds || []).map(releaseId => {
              const release = (data.releases || []).find(r => r.id === releaseId);
              return release ? (
                <div key={releaseId} className="flex items-center gap-1 px-2 py-1 bg-purple-100 border-2 border-purple-500 text-xs font-bold">
                  <span>📀 {release.name}</span>
                  <button onClick={() => {
                    handleFieldChange('linkedReleaseIds', (form.linkedReleaseIds || []).filter(id => id !== releaseId));
                    setTimeout(handleSave, 0);
                  }} className="text-purple-800 hover:text-red-600"><Icon name="X" size={12} /></button>
                </div>
              ) : null;
            })}
            {/* Videos */}
            {(form.linkedVideoIds || []).map(videoId => {
              const video = (data.standaloneVideos || []).find(v => v.id === videoId);
              return video ? (
                <div key={videoId} className="flex items-center gap-1 px-2 py-1 bg-red-100 border-2 border-red-500 text-xs font-bold">
                  <span>🎬 {video.title}</span>
                  <button onClick={() => {
                    handleFieldChange('linkedVideoIds', (form.linkedVideoIds || []).filter(id => id !== videoId));
                    setTimeout(handleSave, 0);
                  }} className="text-red-800 hover:text-red-600"><Icon name="X" size={12} /></button>
                </div>
              ) : null;
            })}
            {/* Expenses */}
            {(form.linkedExpenseIds || []).map(expenseId => {
              const expense = (data.expenses || []).find(e => e.id === expenseId);
              return expense ? (
                <div key={expenseId} className="flex items-center gap-1 px-2 py-1 bg-green-100 border-2 border-green-500 text-xs font-bold">
                  <span>💰 {expense.name}</span>
                  <button onClick={() => {
                    handleFieldChange('linkedExpenseIds', (form.linkedExpenseIds || []).filter(id => id !== expenseId));
                    setTimeout(handleSave, 0);
                  }} className="text-green-800 hover:text-red-600"><Icon name="X" size={12} /></button>
                </div>
              ) : null;
            })}
            {/* Empty state */}
            {!(form.linkedSongIds?.length || form.linkedReleaseIds?.length || form.linkedVideoIds?.length || form.linkedExpenseIds?.length) && (
              <span className="text-xs opacity-50">No items linked yet. Use the dropdowns below to add links.</span>
            )}
          </div>
        </div>

        {/* Add new links - simple dropdowns */}
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Add Song</label>
            <select 
              value="" 
              onChange={e => {
                if (e.target.value && !(form.linkedSongIds || []).includes(e.target.value)) {
                  handleFieldChange('linkedSongIds', [...(form.linkedSongIds || []), e.target.value]);
                  setTimeout(handleSave, 0);
                }
              }} 
              className={cn("w-full", THEME.punk.input)}
            >
              <option value="">Select song...</option>
              {(data.songs || []).filter(s => !(form.linkedSongIds || []).includes(s.id)).map(song => (
                <option key={song.id} value={song.id}>{song.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Add Release</label>
            <select 
              value="" 
              onChange={e => {
                if (e.target.value && !(form.linkedReleaseIds || []).includes(e.target.value)) {
                  handleFieldChange('linkedReleaseIds', [...(form.linkedReleaseIds || []), e.target.value]);
                  setTimeout(handleSave, 0);
                }
              }} 
              className={cn("w-full", THEME.punk.input)}
            >
              <option value="">Select release...</option>
              {(data.releases || []).filter(r => !(form.linkedReleaseIds || []).includes(r.id)).map(release => (
                <option key={release.id} value={release.id}>{release.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Add Video</label>
            <select 
              value="" 
              onChange={e => {
                if (e.target.value && !(form.linkedVideoIds || []).includes(e.target.value)) {
                  handleFieldChange('linkedVideoIds', [...(form.linkedVideoIds || []), e.target.value]);
                  setTimeout(handleSave, 0);
                }
              }} 
              className={cn("w-full", THEME.punk.input)}
            >
              <option value="">Select video...</option>
              {(data.standaloneVideos || []).filter(v => !(form.linkedVideoIds || []).includes(v.id)).map(video => (
                <option key={video.id} value={video.id}>{video.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Add Expense</label>
            <select 
              value="" 
              onChange={e => {
                if (e.target.value && !(form.linkedExpenseIds || []).includes(e.target.value)) {
                  handleFieldChange('linkedExpenseIds', [...(form.linkedExpenseIds || []), e.target.value]);
                  setTimeout(handleSave, 0);
                }
              }} 
              className={cn("w-full", THEME.punk.input)}
            >
              <option value="">Select expense...</option>
              {(data.expenses || []).filter(e => !e.isArchived && !(form.linkedExpenseIds || []).includes(e.id)).map(expense => (
                <option key={expense.id} value={expense.id}>{expense.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Unified Tasks Module - combines auto-generated and custom tasks */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex flex-wrap justify-between items-center mb-4 border-b-4 border-black pb-2 gap-2">
          <h3 className="font-black uppercase">Tasks</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={taskFilterStatus} onChange={e => setTaskFilterStatus(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={taskSortBy} onChange={e => setTaskSortBy(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="date">Sort by Date</option>
              <option value="type">Sort by Type</option>
              <option value="status">Sort by Status</option>
            </select>
            <button onClick={() => setTaskSortDir(taskSortDir === 'asc' ? 'desc' : 'asc')} className={cn("px-2 py-1 text-xs", THEME.punk.btn)}>
              {taskSortDir === 'asc' ? '↑' : '↓'}
            </button>
            {/* Phase 2.7: Recalculate auto-tasks for event */}
            <button 
              onClick={async () => {
                if (currentEvent.date) {
                  const newTasks = generateEventTasks(currentEvent.date, true);
                  await actions.updateEvent(event.id, { tasks: newTasks });
                }
              }} 
              className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-blue-500 text-white")}
            >
              Recalculate
            </button>
            <button 
              onClick={() => {
                // Unified Task Handling: Open modal with new blank task
                const newCustomTask = {
                  title: 'New Task',
                  date: '',
                  description: '',
                  estimatedCost: 0,
                  status: 'Not Started',
                  notes: '',
                  isAutoTask: false
                };
                handleOpenTaskEdit(newCustomTask, { type: 'new-custom' });
              }} 
              className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-green-600 text-white")}
            >
              + Add Task
            </button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-3 text-[10px] font-bold">
          <span className="px-2 py-1 bg-yellow-100 border-2 border-black">Auto Task</span>
          <span className="px-2 py-1 bg-green-100 border-2 border-black">Custom Task</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Task</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center opacity-50">No tasks yet. Add a custom task.</td></tr>
              ) : filteredTasks.map(task => {
                const isOverdue = task.date && new Date(task.date) < new Date() && task.status !== 'Complete' && task.status !== 'Done';
                return (
                  <tr 
                    key={task.id} 
                    className={cn(
                      "border-b border-gray-200 cursor-pointer hover:bg-gray-100",
                      isOverdue ? "bg-red-50" : task._isAuto ? "bg-yellow-50" : "bg-green-50"
                    )}
                    onClick={() => handleOpenTaskEdit(task, { type: task._isAuto ? 'auto' : 'custom' })}
                  >
                    <td className="p-2">
                      <span className={cn("px-2 py-1 text-xs font-bold border border-black", task._isAuto ? "bg-yellow-200" : "bg-green-200")}>
                        {task._isAuto ? 'Auto' : 'Custom'}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="font-bold">{task.type || task.title}</div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs", isOverdue && "text-red-600 font-bold")}>
                          {task.date || '-'}
                        </span>
                        {isOverdue && <span className="px-1 py-0.5 bg-red-200 border border-red-500 text-red-800 text-[10px] font-bold">OVERDUE</span>}
                      </div>
                    </td>
                    <td className="p-2" onClick={e => e.stopPropagation()}>
                      <select 
                        value={task.status || 'Not Started'} 
                        onChange={e => {
                          if (task._isAuto) {
                            const updatedTasks = eventTasks.map(t => t.id === task.id ? { ...t, status: e.target.value } : t);
                            actions.updateEvent(event.id, { tasks: updatedTasks });
                          } else {
                            actions.updateEventCustomTask(event.id, task.id, { status: e.target.value });
                          }
                        }} 
                        className="border-2 border-black p-1 text-xs"
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                      {!task._isAuto && (
                        <button onClick={() => { if (confirm('Delete this task?')) actions.deleteEventCustomTask(event.id, task.id); }} className="p-1 text-red-500 hover:bg-red-100"><Icon name="Trash2" size={14} /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Task More/Edit Info Page Modal - Unified Task Handling Architecture */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => { setEditingTask(null); setEditingTaskContext(null); }}>
          <div className={cn("w-full max-w-lg p-6 bg-white max-h-[90vh] overflow-y-auto", THEME.punk.card)} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
              <h3 className="font-black uppercase">
                {editingTaskContext?.type === 'new-custom' ? 'Add Task' : 'Edit Task'}
              </h3>
              <button onClick={() => { setEditingTask(null); setEditingTaskContext(null); }} className="p-1 hover:bg-gray-200"><Icon name="X" size={16} /></button>
            </div>

            <div className="space-y-4">
              {/* Task Name */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Task Name</label>
                <input 
                  value={editingTask.type || editingTask.title || ''} 
                  onChange={e => setEditingTask(prev => ({ ...prev, type: e.target.value, title: e.target.value }))} 
                  className={cn("w-full", THEME.punk.input)}
                />
              </div>

              {/* Task Due Date */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Due Date</label>
                <input 
                  type="date" 
                  value={editingTask.date || editingTask.dueDate || ''} 
                  onChange={e => setEditingTask(prev => ({ ...prev, date: e.target.value, dueDate: e.target.value }))} 
                  className={cn("w-full", THEME.punk.input)}
                />
              </div>

              {/* Task Status */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Status</label>
                <select
                  value={editingTask.status || 'Not Started'}
                  onChange={e => setEditingTask(prev => ({ ...prev, status: e.target.value }))}
                  className={cn("w-full", THEME.punk.input)}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Era and Stage */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Era</label>
                  <select
                    value={(editingTask.eraIds || [])[0] || ''}
                    onChange={e => setEditingTask(prev => ({ ...prev, eraIds: e.target.value ? [e.target.value] : [] }))}
                    className={cn("w-full", THEME.punk.input)}
                  >
                    <option value="">No Era</option>
                    {(data.eras || []).map(era => <option key={era.id} value={era.id}>{era.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Stage</label>
                  <select
                    value={(editingTask.stageIds || [])[0] || ''}
                    onChange={e => setEditingTask(prev => ({ ...prev, stageIds: e.target.value ? [e.target.value] : [] }))}
                    className={cn("w-full", THEME.punk.input)}
                  >
                    <option value="">No Stage</option>
                    {(data.stages || []).map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Cost Fields */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Estimated</label>
                  <input 
                    type="number" 
                    value={editingTask.estimatedCost || 0} 
                    onChange={e => setEditingTask(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))} 
                    className={cn("w-full text-sm", THEME.punk.input)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Quoted</label>
                  <input 
                    type="number" 
                    value={editingTask.quotedCost || 0} 
                    onChange={e => setEditingTask(prev => ({ ...prev, quotedCost: parseFloat(e.target.value) || 0 }))} 
                    className={cn("w-full text-sm", THEME.punk.input)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Paid</label>
                  <input 
                    type="number" 
                    value={editingTask.paidCost || 0} 
                    onChange={e => setEditingTask(prev => ({ ...prev, paidCost: parseFloat(e.target.value) || 0 }))} 
                    className={cn("w-full text-sm", THEME.punk.input)} 
                  />
                </div>
              </div>

              {/* Team Members */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Team Members</label>
                <div className="flex flex-wrap gap-1 p-2 border-4 border-black bg-white text-xs max-h-24 overflow-y-auto">
                  {teamMembers.map(m => (
                    <label key={m.id} className="flex items-center gap-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={(editingTask.assignedMembers || []).some(am => am.memberId === m.id)} 
                        onChange={e => {
                          const members = editingTask.assignedMembers || [];
                          if (e.target.checked) {
                            setEditingTask(prev => ({ ...prev, assignedMembers: [...members, { memberId: m.id, cost: 0 }] }));
                          } else {
                            setEditingTask(prev => ({ ...prev, assignedMembers: members.filter(am => am.memberId !== m.id) }));
                          }
                        }}
                        className="w-3 h-3" 
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Notes</label>
                <textarea 
                  value={editingTask.notes || editingTask.description || ''} 
                  onChange={e => setEditingTask(prev => ({ ...prev, notes: e.target.value, description: e.target.value }))} 
                  className={cn("w-full h-20", THEME.punk.input)} 
                  placeholder="Additional details..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-6 pt-4 border-t-4 border-black">
              <button onClick={handleSaveTaskEdit} className={cn("flex-1 px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>
                Save Changes
              </button>
              <button onClick={() => { setEditingTask(null); setEditingTaskContext(null); }} className={cn("px-4 py-2", THEME.punk.btn, "bg-gray-500 text-white")}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Expenses List View - Following same pattern as Songs and Releases
export const ExpensesListView = ({ onSelectExpense }) => {
  const { data, actions } = useStore();
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState('list');

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => (
    <span>{sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
  );

  const expenses = useMemo(() => {
    let filtered = [...(data.expenses || [])];
    if (!showArchived) filtered = filtered.filter(e => !e.isArchived);
    if (filterCategory !== 'all') filtered = filtered.filter(e => e.category === filterCategory);
    filtered.sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (sortBy === 'paidCost') { valA = getEffectiveCost(a); valB = getEffectiveCost(b); }
      if (sortDir === 'asc') { return valA < valB ? -1 : valA > valB ? 1 : 0; }
      else { return valA > valB ? -1 : valA < valB ? 1 : 0; }
    });
    return filtered;
  }, [data.expenses, sortBy, sortDir, filterCategory, showArchived]);

  const handleAddExpense = async () => {
    const newExpense = await actions.addExpense({ name: 'New Expense', date: new Date().toISOString().split('T')[0], category: 'General' });
    if (onSelectExpense) onSelectExpense(newExpense);
  };

  const expenseCategories = useMemo(() => {
    const categories = new Set();
    (data.expenses || []).forEach(e => e.category && categories.add(e.category));
    return Array.from(categories);
  }, [data.expenses]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + getEffectiveCost(e), 0), [expenses]);

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Expenses</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
            <option value="all">All Categories</option>
            {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="w-4 h-4" />
            Show Archived
          </label>
          <button onClick={handleAddExpense} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Expense</button>
        </div>
      </div>

      <div className={cn("p-4 mb-6", THEME.punk.card, "bg-green-50")}>
        <div className="flex justify-between items-center">
          <span className="font-bold">Total Expenses:</span>
          <span className="text-2xl font-black text-green-600">{formatMoney(totalExpenses)}</span>
        </div>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {expenses.length === 0 ? (
            <div className={cn("col-span-full p-10 text-center opacity-50", THEME.punk.card)}>No expenses yet.</div>
          ) : expenses.map(expense => (
            <div key={expense.id} onClick={() => onSelectExpense && onSelectExpense(expense)} className={cn("p-4 cursor-pointer hover:bg-yellow-50", THEME.punk.card, expense.isArchived && "opacity-50")}>
              <div className="font-bold text-lg mb-2">{expense.name}</div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between"><span className="opacity-60">Category:</span><span className="font-bold">{expense.category || '-'}</span></div>
                <div className="flex justify-between"><span className="opacity-60">Date:</span><span className="font-bold">{expense.date || '-'}</span></div>
                <div className="flex justify-between"><span className="opacity-60">Amount:</span><span className="font-bold text-green-600">{formatMoney(getEffectiveCost(expense))}</span></div>
              </div>
              {expense.isArchived && <span className="mt-2 block text-xs text-orange-600 font-bold">ARCHIVED</span>}
            </div>
          ))}
        </div>
      ) : (
        <div className={cn("overflow-x-auto", THEME.punk.card)}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white">
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('name')}>Name <SortIcon field="name" /></th>
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('category')}>Category <SortIcon field="category" /></th>
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('date')}>Date <SortIcon field="date" /></th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('paidCost')}>Amount <SortIcon field="paidCost" /></th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan="6" className="p-10 text-center opacity-50">No expenses yet.</td></tr>
              ) : expenses.map(expense => (
                <tr key={expense.id} className={cn("border-b border-gray-200 hover:bg-yellow-50", expense.isArchived && "opacity-50")}>
                  <td className="p-3 font-bold cursor-pointer" onClick={() => onSelectExpense && onSelectExpense(expense)}>{expense.name}</td>
                  <td className="p-3">{expense.category || '-'}</td>
                  <td className="p-3">{expense.date || '-'}</td>
                  <td className="p-3">{expense.status || '-'}</td>
                  <td className="p-3 text-right font-bold text-green-600">{formatMoney(getEffectiveCost(expense))}</td>
                  <td className="p-3 text-center">
                    <div className="flex gap-2 justify-center">
                      {!expense.isArchived ? (
                        <button onClick={(e) => { e.stopPropagation(); actions.archiveExpense(expense.id); }} className="text-orange-500 p-1 hover:bg-orange-50" title="Archive"><Icon name="Archive" size={14} /></button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); actions.updateExpense(expense.id, { isArchived: false }); }} className="text-green-500 p-1 hover:bg-green-50" title="Restore">↩</button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete?')) actions.deleteExpense(expense.id); }} className="text-red-500 p-1 hover:bg-red-50" title="Delete"><Icon name="Trash2" size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Expense Detail View - SPECIAL CASE: Has validation for Complete status requiring paidCost > 0
export const ExpenseDetailView = ({ expense, onBack }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...expense });
  const [statusWarning, setStatusWarning] = useState('');

  const handleSave = async () => { await actions.updateExpense(expense.id, form); };
  const handleFieldChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

  // SPECIAL VALIDATION: When status changes to Complete, check if paidCost > 0
  const handleStatusChange = (newStatus) => {
    if (newStatus === 'Complete' && (!form.paidCost || form.paidCost <= 0)) {
      setStatusWarning('Cannot set status to Complete without a Paid Amount greater than 0.');
      return; // Don't change the status
    }
    setStatusWarning('');
    handleFieldChange('status', newStatus);
    setTimeout(handleSave, 0);
  };

  const handleDeleteExpense = async () => {
    if (confirm('Delete this expense?')) { await actions.deleteExpense(expense.id); onBack(); }
  };

  const currentExpense = useMemo(() => data.expenses?.find(e => e.id === expense.id) || expense, [data.expenses, expense]);

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className={cn("px-4 py-2 bg-white flex items-center gap-2", THEME.punk.btn)}>
          <Icon name="ChevronLeft" size={16} /> Back to Expenses
        </button>
        <div className="flex gap-2">
          {!currentExpense.isArchived ? (
            <button onClick={() => { actions.archiveExpense(expense.id); onBack(); }} className={cn("px-4 py-2", THEME.punk.btn, "bg-orange-500 text-white")}><Icon name="Archive" size={16} /></button>
          ) : (
            <button onClick={() => actions.updateExpense(expense.id, { isArchived: false })} className={cn("px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>Restore</button>
          )}
          <button onClick={handleDeleteExpense} className={cn("px-4 py-2", THEME.punk.btn, "bg-red-500 text-white")}><Icon name="Trash2" size={16} /></button>
        </div>
      </div>

      {currentExpense.isArchived && (
        <div className={cn("p-4 mb-6 bg-orange-100 border-4 border-orange-500", THEME.punk.card)}>
          <span className="font-bold text-orange-800">⚠️ This expense is archived</span>
        </div>
      )}

      {/* SECTION A: Display Information (read-only) - Following SongDetailView pattern */}
      <div className={cn("p-6 mb-6 bg-gray-50", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Display Information</h3>
        
        {/* Expense Name - prominent at top */}
        <div className="text-2xl font-black mb-4 pb-2 border-b-2 border-gray-300">{currentExpense.name || 'Untitled Expense'}</div>
        
        <div className="grid md:grid-cols-4 gap-4">
          {/* Status */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Status</label>
            <div className={cn("px-3 py-2 border-2 border-black text-sm font-bold",
              currentExpense.status === 'Complete' ? "bg-green-100" : 
              currentExpense.status === 'In Progress' ? "bg-yellow-100" : "bg-gray-100"
            )}>
              {currentExpense.status || 'Not Started'}
            </div>
          </div>
          
          {/* Date */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Date</label>
            <div className="px-3 py-2 bg-blue-100 border-2 border-black text-sm font-bold">
              {currentExpense.date || 'Not Set'}
            </div>
          </div>
          
          {/* Amount Paid */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Amount Paid</label>
            <div className="px-3 py-2 bg-green-100 border-2 border-black text-sm font-bold">
              {formatMoney(currentExpense.paidCost || 0)}
            </div>
          </div>
          
          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Category</label>
            <div className="px-3 py-2 bg-purple-100 border-2 border-black text-sm font-bold">
              {currentExpense.category || 'General'}
            </div>
          </div>
          
          {/* Phase 4.2: Vendor - show text or team members based on mode */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-2">Vendor/Payee</label>
            <div className="px-3 py-2 bg-gray-100 border-2 border-black text-sm font-bold">
              {currentExpense.vendorMode === 'teamMember' && (currentExpense.teamMemberIds || []).length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {(currentExpense.teamMemberIds || []).map(id => {
                    const member = (data.teamMembers || []).find(m => m.id === id);
                    return member ? <span key={id} className="px-2 py-1 bg-blue-100 border border-blue-300 text-xs">{member.name}</span> : null;
                  })}
                </div>
              ) : currentExpense.vendorText ? (
                currentExpense.vendorText
              ) : currentExpense.vendorId ? (
                (data.vendors || []).find(v => v.id === currentExpense.vendorId)?.name || 'Unknown Vendor'
              ) : (
                <span className="opacity-50">Not specified</span>
              )}
            </div>
          </div>
          
          {/* Phase 4.4: Receipt Location */}
          {currentExpense.receiptLocation && (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase mb-2">Receipt Location</label>
              <div className="px-3 py-2 bg-gray-100 border-2 border-black text-sm font-bold">
                {currentExpense.receiptLocation}
              </div>
            </div>
          )}
          
          {/* Phase 4.5: Team Members */}
          {(currentExpense.teamMemberIds || []).length > 0 && currentExpense.vendorMode !== 'teamMember' && (
            <div className="md:col-span-4">
              <label className="block text-xs font-bold uppercase mb-2">Team Members</label>
              <div className="flex flex-wrap gap-2">
                {(currentExpense.teamMemberIds || []).map(id => {
                  const member = (data.teamMembers || []).find(m => m.id === id);
                  return member ? (
                    <span key={id} className="px-2 py-1 bg-purple-100 border-2 border-black text-xs font-bold">
                      {member.name} {member.isMusician && '🎵'}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION B: Basic Information (editable) */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Expense Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Name</label>
            <input value={form.name || ''} onChange={e => handleFieldChange('name', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Category</label>
            <input value={form.category || ''} onChange={e => handleFieldChange('category', e.target.value)} onBlur={handleSave} placeholder="General, Marketing, Production" className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Date</label>
            <input type="date" value={form.date || ''} onChange={e => handleFieldChange('date', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Status</label>
            <select 
              value={form.status || 'Not Started'} 
              onChange={e => handleStatusChange(e.target.value)} 
              className={cn("w-full", THEME.punk.input, statusWarning && "border-red-500")}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {statusWarning && (
              <div className="text-xs text-red-600 font-bold mt-1">⚠️ {statusWarning}</div>
            )}
            <div className="text-[10px] text-gray-500 mt-1">Note: Setting to Complete requires Paid Amount greater than 0</div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Estimated Cost</label>
            <input type="number" value={form.estimatedCost || 0} onChange={e => handleFieldChange('estimatedCost', parseFloat(e.target.value) || 0)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Quoted Cost</label>
            <input type="number" value={form.quotedCost || 0} onChange={e => handleFieldChange('quotedCost', parseFloat(e.target.value) || 0)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Paid Amount</label>
            <input type="number" value={form.paidCost || 0} onChange={e => { handleFieldChange('paidCost', parseFloat(e.target.value) || 0); setStatusWarning(''); }} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          {/* Phase 4.4: Receipt Location */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Receipt Location</label>
            <input value={form.receiptLocation || ''} onChange={e => handleFieldChange('receiptLocation', e.target.value)} onBlur={handleSave} placeholder="URL, file path, or note" className={cn("w-full", THEME.punk.input)} />
          </div>
          
          {/* Phase 4.2: Vendor Mode Toggle */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Vendor/Payee</label>
            <div className="flex gap-2 mb-2">
              <button 
                onClick={() => { handleFieldChange('vendorMode', 'text'); setTimeout(handleSave, 0); }}
                className={cn("px-3 py-1 text-xs font-bold", THEME.punk.btn, form.vendorMode !== 'teamMember' ? "bg-black text-white" : "bg-white")}
              >
                Text Input
              </button>
              <button 
                onClick={() => { handleFieldChange('vendorMode', 'teamMember'); setTimeout(handleSave, 0); }}
                className={cn("px-3 py-1 text-xs font-bold", THEME.punk.btn, form.vendorMode === 'teamMember' ? "bg-black text-white" : "bg-white")}
              >
                Team Members
              </button>
            </div>
            {form.vendorMode === 'teamMember' ? (
              <div className="flex flex-wrap gap-2 p-2 border-4 border-black bg-white min-h-[40px]">
                {(data.teamMembers || []).map(member => (
                  <label key={member.id} className="flex items-center gap-1 text-xs font-bold cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={(form.teamMemberIds || []).includes(member.id)} 
                      onChange={e => {
                        const newIds = e.target.checked 
                          ? [...(form.teamMemberIds || []), member.id]
                          : (form.teamMemberIds || []).filter(id => id !== member.id);
                        handleFieldChange('teamMemberIds', newIds);
                        setTimeout(handleSave, 0);
                      }}
                      className="w-3 h-3" 
                    />
                    {member.name}
                  </label>
                ))}
                {(data.teamMembers || []).length === 0 && <span className="text-xs opacity-50">No team members available</span>}
              </div>
            ) : (
              <input 
                value={form.vendorText || ''} 
                onChange={e => handleFieldChange('vendorText', e.target.value)} 
                onBlur={handleSave} 
                placeholder="Vendor name or company" 
                className={cn("w-full", THEME.punk.input)} 
              />
            )}
          </div>
          
          {/* Phase 4.3: Stage/Era/Tags */}
          <div className="md:col-span-2">
            <EraStageTagsPicker
              value={{
                eraIds: form.eraIds || [],
                stageIds: form.stageIds || [],
                tagIds: form.tagIds || []
              }}
              onChange={({ eraIds, stageIds, tagIds }) => {
                handleFieldChange('eraIds', eraIds);
                handleFieldChange('stageIds', stageIds);
                handleFieldChange('tagIds', tagIds);
                setTimeout(handleSave, 0);
              }}
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} placeholder="Additional notes..." />
          </div>
        </div>
      </div>
    </div>
  );
};


// Videos List View - Phase 1 Video System Overhaul
// Following unified Item/Page architecture (same template as Songs/Releases)
export const VideosListView = ({ onSelectVideo }) => {
  const { data, actions } = useStore();
  const [sortBy, setSortBy] = useState('releaseDate');
  const [sortDir, setSortDir] = useState('asc');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  // Phase 1.2: State for adding new video with type selection
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [newVideoType, setNewVideoType] = useState('');

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => (
    <span>{sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
  );

  const videoProgress = (video) => {
    const tasks = [...(video.tasks || []), ...(video.customTasks || [])];
    return calculateTaskProgress(tasks).progress;
  };

  // Collect all videos from songs and standalone
  const allVideos = useMemo(() => {
    const videos = [];
    // Song videos
    (data.songs || []).forEach(song => {
      (song.videos || []).forEach(video => {
        videos.push({
          ...video,
          _songId: song.id,
          _songTitle: song.title,
          _source: 'song'
        });
      });
    });
    // Standalone videos
    (data.standaloneVideos || []).forEach(video => {
      videos.push({
        ...video,
        _source: 'standalone'
      });
    });
    return videos;
  }, [data.songs, data.standaloneVideos]);

  // Phase 1.1: Extended video types list
  const videoTypeOptions = [
    { key: 'lyric', label: 'Lyric Video' },
    { key: 'enhancedLyric', label: 'Enhanced Lyric' },
    { key: 'music', label: 'Music Video' },
    { key: 'visualizer', label: 'Visualizer' },
    { key: 'live', label: 'Live Video' },
    { key: 'loop', label: 'Loop Video' },
    { key: 'custom', label: 'Custom' }
  ];

  // Phase 1.1: Get video type label (supports both new single type and legacy types object)
  const getVideoTypeLabel = (video) => {
    // New schema: videoType field
    if (video.videoType) {
      const found = videoTypeOptions.find(t => t.key === video.videoType);
      return found ? found.label : video.videoType;
    }
    // Legacy support: extract from types object
    const labels = videoTypeOptions.filter(t => video.types?.[t.key]).map(t => t.label);
    return labels.length > 0 ? labels.join(', ') : 'None';
  };

  const videos = useMemo(() => {
    let filtered = [...allVideos];
    if (filterType !== 'all') {
      filtered = filtered.filter(v => v.types?.[filterType] || v.videoType === filterType);
    }
    filtered.sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (sortBy === 'budgetedCost') { valA = a.budgetedCost || 0; valB = b.budgetedCost || 0; }
      if (sortDir === 'asc') { return valA < valB ? -1 : valA > valB ? 1 : 0; }
      else { return valA > valB ? -1 : valA < valB ? 1 : 0; }
    });
    return filtered;
  }, [allVideos, sortBy, sortDir, filterType]);

  // Phase 1.2: Handle adding standalone video with type selection
  const handleAddVideo = async () => {
    if (!newVideoType) return;
    
    const typeLabel = videoTypeOptions.find(t => t.key === newVideoType)?.label || newVideoType;
    const newVideo = await actions.addStandaloneVideo({
      title: `New ${typeLabel}`,
      releaseDate: new Date().toISOString().split('T')[0],
      videoType: newVideoType,
      types: { [newVideoType]: true }
    });
    setShowAddVideoModal(false);
    setNewVideoType('');
    if (onSelectVideo) onSelectVideo(newVideo);
  };

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Videos</h2>
        <div className="flex flex-wrap gap-2">
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
            <option value="all">All Types</option>
            {videoTypeOptions.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          {/* Phase 1.2: Opens modal to select type first */}
          <button onClick={() => setShowAddVideoModal(true)} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Video</button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.length === 0 ? (
            <div className={cn("col-span-full p-10 text-center opacity-50", THEME.punk.card)}>No videos yet. Click Add Video to create one.</div>
          ) : (
            videos.map(video => (
              <div key={video.id} onClick={() => onSelectVideo && onSelectVideo(video)} className={cn("p-4 cursor-pointer hover:bg-yellow-50", THEME.punk.card)}>
                <div className="font-bold text-lg mb-2">{video.title}</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between"><span className="opacity-60">Type:</span><span className="font-bold">{getVideoTypeLabel(video)}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Source:</span><span className="font-bold">{video._source === 'song' ? video._songTitle : 'Standalone'}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Date:</span><span className="font-bold">{video.releaseDate || 'TBD'}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Progress:</span><span className="font-bold">{videoProgress(video)}%</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Budget:</span><span className="font-bold">{formatMoney(video.budgetedCost || 0)}</span></div>
                </div>
                {video.timedExclusive && (
                  <div className="mt-2 px-2 py-1 bg-orange-100 border border-orange-500 text-[10px] font-bold text-orange-800">TIMED EXCLUSIVE</div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={cn("overflow-x-auto", THEME.punk.card)}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white">
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('title')}>Title <SortIcon field="title" /></th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Source</th>
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('releaseDate')}>Date <SortIcon field="releaseDate" /></th>
                <th className="p-3 text-right">Progress</th>
                <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('budgetedCost')}>Budget <SortIcon field="budgetedCost" /></th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 ? (
                <tr><td colSpan="6" className="p-10 text-center opacity-50">No videos yet. Click Add Video to create one.</td></tr>
              ) : (
                videos.map(video => (
                  <tr key={video.id} onClick={() => onSelectVideo && onSelectVideo(video)} className="border-b border-gray-200 hover:bg-yellow-50 cursor-pointer">
                    <td className="p-3 font-bold">
                      {video.title}
                      {video.timedExclusive && <span className="ml-2 px-1 py-0.5 bg-orange-100 border border-orange-500 text-[10px] font-bold text-orange-800">EXCL</span>}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-purple-100 text-[10px] font-bold border border-purple-500">{getVideoTypeLabel(video)}</span>
                    </td>
                    <td className="p-3">{video._source === 'song' ? video._songTitle : 'Standalone'}</td>
                    <td className="p-3">{video.releaseDate || '-'}</td>
                    <td className="p-3 text-right">{videoProgress(video)}%</td>
                    <td className="p-3 text-right">{formatMoney(video.budgetedCost || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Phase 1.2: Add Video Modal - Must pick a Type first */}
      {showAddVideoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={cn("bg-white p-6 max-w-md w-full", THEME.punk.card)}>
            <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
              <h3 className="font-black uppercase">Add New Video</h3>
              <button onClick={() => { setShowAddVideoModal(false); setNewVideoType(''); }} className="text-2xl font-bold">×</button>
            </div>
            
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase mb-2">Select Video Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {videoTypeOptions.map(type => (
                  <label 
                    key={type.key} 
                    className={cn(
                      "flex items-center gap-2 p-3 border-2 cursor-pointer font-bold text-sm",
                      newVideoType === type.key 
                        ? "border-purple-500 bg-purple-100" 
                        : "border-black hover:bg-gray-50"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="videoType" 
                      value={type.key}
                      checked={newVideoType === type.key}
                      onChange={e => setNewVideoType(e.target.value)}
                      className="w-4 h-4"
                    />
                    {type.label}
                  </label>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Videos can only have one type. Choose the type before creating.
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t-2 border-gray-200">
              <button 
                onClick={() => { setShowAddVideoModal(false); setNewVideoType(''); }} 
                className={cn("px-4 py-2", THEME.punk.btn)}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddVideo} 
                disabled={!newVideoType}
                className={cn(
                  "px-4 py-2", 
                  THEME.punk.btn, 
                  newVideoType ? "bg-green-600 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                )}
              >
                Create Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Video Detail View - Phase 1 Video System Overhaul
// Following unified Item/Page architecture with SongDetailView pattern
export const VideoDetailView = ({ video, onBack }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...video });
  const [editingTask, setEditingTask] = useState(null); // Phase 1.7: Task editing modal
  const [editingTaskContext, setEditingTaskContext] = useState(null); // { type: 'auto'|'custom'|'new-custom' } - Unified Task Handling
  const [taskFilterStatus, setTaskFilterStatus] = useState('all');
  const [taskSortBy, setTaskSortBy] = useState('date');
  const [taskSortDir, setTaskSortDir] = useState('asc');

  const teamMembers = useMemo(() => data.teamMembers || [], [data.teamMembers]);
  
  // Phase 1.1: Single video type - video types list
  const videoTypeOptions = [
    { key: 'lyric', label: 'Lyric Video' },
    { key: 'enhancedLyric', label: 'Enhanced Lyric' },
    { key: 'music', label: 'Music Video' },
    { key: 'visualizer', label: 'Visualizer' },
    { key: 'live', label: 'Live Video' },
    { key: 'loop', label: 'Loop Video' },
    { key: 'custom', label: 'Custom' }
  ];
  
  // Phase 1.1: Get current video type (single type)
  const getCurrentVideoType = useMemo(() => {
    // New schema: videoType field
    if (form.videoType) return form.videoType;
    // Legacy support: extract from types object
    if (form.types) {
      for (const t of videoTypeOptions) {
        if (form.types[t.key]) return t.key;
      }
    }
    return '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.videoType, form.types]);
  
  const getVideoTypeLabel = (typeKey) => {
    const found = videoTypeOptions.find(t => t.key === typeKey);
    return found ? found.label : typeKey || 'None';
  };

  const handleSave = async () => {
    if (video._source === 'standalone') {
      await actions.updateStandaloneVideo(video.id, form);
    } else {
      await actions.updateSongVideo(video._songId, video.id, form);
    }
  };

  const handleFieldChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

  // Handle opening the Task Edit Modal - Unified Task Handling Architecture
  const handleOpenTaskEdit = (task, context) => {
    setEditingTask({ ...task });
    setEditingTaskContext(context);
  };

  // Handle saving task from the Task Edit Modal - Unified Task Handling Architecture
  const handleSaveTaskEdit = async () => {
    if (!editingTask || !editingTaskContext) return;
    
    if (editingTaskContext.type === 'new-custom') {
      // Creating a new custom task
      const taskData = {
        title: editingTask.type || editingTask.title || 'New Task',
        type: editingTask.type || editingTask.title || 'Custom',
        date: editingTask.date || editingTask.dueDate || '',
        dueDate: editingTask.date || editingTask.dueDate || '',
        status: editingTask.status || 'Not Started',
        estimatedCost: editingTask.estimatedCost || 0,
        quotedCost: editingTask.quotedCost || 0,
        paidCost: editingTask.paidCost || 0,
        notes: editingTask.notes || editingTask.description || '',
        description: editingTask.description || editingTask.notes || '',
        assignedMembers: editingTask.assignedMembers || [],
        eraIds: editingTask.eraIds || [],
        stageIds: editingTask.stageIds || [],
        tagIds: editingTask.tagIds || [],
        isAutoTask: false,
        parentType: 'video',
        parentId: video.id
      };
      if (video._source === 'standalone') {
        await actions.addStandaloneVideoCustomTask(video.id, taskData);
      } else {
        await actions.addSongVideoCustomTask(video._songId, video.id, taskData);
      }
    } else if (editingTaskContext.type === 'auto') {
      const updatedTasks = videoTasks.map(t => t.id === editingTask.id ? editingTask : t);
      if (video._source === 'standalone') {
        await actions.updateStandaloneVideo(video.id, { tasks: updatedTasks });
      } else {
        await actions.updateSongVideo(video._songId, video.id, { tasks: updatedTasks });
      }
    } else if (editingTaskContext.type === 'custom') {
      if (video._source === 'standalone') {
        await actions.updateStandaloneVideoCustomTask(video.id, editingTask.id, editingTask);
      } else {
        await actions.updateSongVideoCustomTask(video._songId, video.id, editingTask.id, editingTask);
      }
    }
    
    setEditingTask(null);
    setEditingTaskContext(null);
  };

  const handleDeleteVideo = async () => {
    if (confirm('Delete this video?')) {
      if (video._source === 'standalone') {
        await actions.deleteStandaloneVideo(video.id);
      } else {
        await actions.deleteSongVideo(video._songId, video.id);
      }
      onBack();
    }
  };

  // Get current video from store
  const currentVideo = useMemo(() => {
    if (video._source === 'standalone') {
      return (data.standaloneVideos || []).find(v => v.id === video.id) || video;
    } else {
      const song = (data.songs || []).find(s => s.id === video._songId);
      return (song?.videos || []).find(v => v.id === video.id) || video;
    }
  }, [data.songs, data.standaloneVideos, video]);

  const videoTasks = useMemo(() => currentVideo.tasks || [], [currentVideo.tasks]);
  const videoCustomTasks = useMemo(() => currentVideo.customTasks || [], [currentVideo.customTasks]);
  const allVideoTasks = useMemo(() => [...videoTasks, ...videoCustomTasks], [videoTasks, videoCustomTasks]);
  const { progress: videoProgressValue } = calculateTaskProgress(allVideoTasks);
  
  // Phase 1.5: Calculate costs from tasks only (not from video level)
  const totalEstimatedCost = useMemo(() => allVideoTasks.reduce((sum, t) => sum + getEffectiveCost(t), 0), [allVideoTasks]);
  const costPaid = useMemo(() => allVideoTasks.reduce((sum, t) => sum + (t.paidCost || 0), 0), [allVideoTasks]);
  
  // Phase 1.5: Budget check - if Total Estimated Cost from Tasks > Budgeted Cost → Show "Over Budget" flag
  const budgetedCost = currentVideo.budgetedCost || 0;
  const isOverBudget = budgetedCost > 0 && totalEstimatedCost > budgetedCost;
  
  // Calculate overdue tasks
  const overdueTasks = useMemo(() => allVideoTasks.filter(t => t.date && new Date(t.date) < new Date() && t.status !== 'Complete' && t.status !== 'Done'), [allVideoTasks]);
  const openTasks = useMemo(() => allVideoTasks.filter(t => t.status !== 'Complete' && t.status !== 'Done'), [allVideoTasks]);

  const assignedTeamMembers = useMemo(() => {
    const memberIds = new Set();
    // From video-level teamMemberIds
    (currentVideo.teamMemberIds || []).forEach(id => memberIds.add(id));
    // From task assignments
    allVideoTasks.forEach(task => {
      (task.assignedMembers || []).forEach(m => memberIds.add(m.memberId));
      (task.teamMemberIds || []).forEach(id => memberIds.add(id));
    });
    return teamMembers.filter(m => memberIds.has(m.id));
  }, [currentVideo, allVideoTasks, teamMembers]);
  
  // Unified filtered and sorted tasks (includes both auto and custom tasks)
  const filteredTasks = useMemo(() => {
    const combined = [
      ...videoTasks.map(t => ({ ...t, _isAuto: true })),
      ...videoCustomTasks.map(t => ({ ...t, _isAuto: false }))
    ];
    let filtered = [...combined];
    if (taskFilterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === taskFilterStatus);
    }
    filtered.sort((a, b) => {
      const valA = a[taskSortBy] || '';
      const valB = b[taskSortBy] || '';
      return taskSortDir === 'asc' 
        ? (valA < valB ? -1 : valA > valB ? 1 : 0)
        : (valA > valB ? -1 : valA < valB ? 1 : 0);
    });
    return filtered;
  }, [videoTasks, videoCustomTasks, taskFilterStatus, taskSortBy, taskSortDir]);

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className={cn("px-4 py-2 bg-white flex items-center gap-2", THEME.punk.btn)}>
          <Icon name="ChevronLeft" size={16} /> Back to Videos
        </button>
        <button onClick={handleDeleteVideo} className={cn("px-4 py-2", THEME.punk.btn, "bg-red-500 text-white")}>
          <Icon name="Trash2" size={16} />
        </button>
      </div>

      {/* SECTION A: Display Information (read-only) - Following SongDetailView pattern */}
      <div className={cn("p-6 mb-6 bg-gray-50", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Display Information</h3>
        
        {/* Video Title - prominent at top */}
        <div className="text-2xl font-black mb-4 pb-2 border-b-2 border-gray-300">{currentVideo.title || 'Untitled Video'}</div>
        
        <div className="grid md:grid-cols-4 gap-4">
          {/* Task Progress */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Task Progress</label>
            <div className="px-3 py-2 bg-yellow-100 border-2 border-black text-lg font-black">{videoProgressValue}%</div>
          </div>
          
          {/* Release Date */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Release Date</label>
            <div className="px-3 py-2 bg-blue-100 border-2 border-black text-sm font-bold">
              {currentVideo.releaseDate || 'Not Set'}
            </div>
          </div>
          
          {/* Phase 1.1: Video Type (single type) */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Video Type</label>
            <div className="px-3 py-2 bg-purple-100 border-2 border-black text-sm font-bold">
              {getVideoTypeLabel(getCurrentVideoType)}
              {currentVideo.isAutogenerated && <span className="ml-2 text-[10px] text-gray-500">(Auto)</span>}
            </div>
          </div>
          
          {/* Number of Open Tasks */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Open Tasks</label>
            <div className="px-3 py-2 bg-gray-100 border-2 border-black text-lg font-black">
              {openTasks.length}
            </div>
          </div>
          
          {/* Overdue Task Indicator */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Overdue Tasks</label>
            <div className={cn("px-3 py-2 border-2 border-black text-lg font-black", 
              overdueTasks.length > 0 ? "bg-red-200" : "bg-green-100"
            )}>
              {overdueTasks.length}
            </div>
          </div>
          
          {/* Phase 1.5: Total Estimated Cost (from tasks) with Over Budget indicator */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Est. Cost (Tasks)</label>
            <div className={cn("px-3 py-2 border-2 border-black text-sm font-bold", isOverBudget ? "bg-red-200" : "bg-yellow-100")}>
              {formatMoney(totalEstimatedCost)}
              {isOverBudget && <span className="ml-1 text-red-600 text-[10px] font-bold">OVER</span>}
            </div>
          </div>
          
          {/* Phase 1.5: Budgeted Cost */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Budgeted Cost</label>
            <div className="px-3 py-2 bg-blue-100 border-2 border-black text-sm font-bold">
              {formatMoney(budgetedCost)}
            </div>
          </div>
          
          {/* Cost Paid */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Cost Paid</label>
            <div className="px-3 py-2 bg-green-100 border-2 border-black text-sm font-bold">
              {formatMoney(costPaid)}
            </div>
          </div>
          
          {/* Source */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Source</label>
            <div className="px-3 py-2 bg-gray-100 border-2 border-black text-sm font-bold">
              {video._source === 'song' ? video._songTitle : 'Standalone'}
            </div>
          </div>
          
          {/* Team Members */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold uppercase mb-2">Team Members on Tasks</label>
            <div className="flex flex-wrap gap-2">
              {assignedTeamMembers.length === 0 ? (
                <span className="text-xs opacity-50">No team members assigned</span>
              ) : assignedTeamMembers.map(m => (
                <div key={m.id} className="px-2 py-1 bg-purple-100 border-2 border-black text-xs font-bold">
                  {m.name} {m.isMusician && '🎵'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: Video Information (editable) - Phase 1 Updates */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Video Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Title</label>
            <input value={form.title || ''} onChange={e => handleFieldChange('title', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Release Date</label>
            <input type="date" value={form.releaseDate || ''} onChange={e => handleFieldChange('releaseDate', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          
          {/* Phase 1.1: Video Type - single select, display-only if autogenerated */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Video Type
              {currentVideo.isAutogenerated && <span className="ml-2 text-orange-600">(Display Only)</span>}
            </label>
            {currentVideo.isAutogenerated ? (
              <div className="px-3 py-2 bg-gray-100 border-4 border-black text-sm font-bold opacity-60">
                {getVideoTypeLabel(getCurrentVideoType)}
              </div>
            ) : (
              <select 
                value={getCurrentVideoType} 
                onChange={e => {
                  const newType = e.target.value;
                  handleFieldChange('videoType', newType);
                  handleFieldChange('types', newType ? { [newType]: true } : {});
                  setTimeout(handleSave, 0);
                }} 
                className={cn("w-full", THEME.punk.input)}
              >
                <option value="">Select Type...</option>
                {videoTypeOptions.map(type => (
                  <option key={type.key} value={type.key}>{type.label}</option>
                ))}
              </select>
            )}
          </div>
          
          {/* Custom Video Type Explanation - shows only when type is 'custom' */}
          {getCurrentVideoType === 'custom' && currentVideo && !currentVideo.isAutogenerated && (
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Explain Custom Video Type</label>
              <input 
                value={form.customTypeExplanation || ''} 
                onChange={e => handleFieldChange('customTypeExplanation', e.target.value)} 
                onBlur={handleSave} 
                placeholder="Describe the custom video type..."
                className={cn("w-full", THEME.punk.input)} 
              />
            </div>
          )}
          
          {/* Phase 1.5: Budgeted Cost - replaces estimated/quoted/paid at video level */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Budgeted Cost</label>
            <input 
              type="number" 
              value={form.budgetedCost || 0} 
              onChange={e => handleFieldChange('budgetedCost', parseFloat(e.target.value) || 0)} 
              onBlur={handleSave} 
              className={cn("w-full", THEME.punk.input)} 
            />
            {isOverBudget && (
              <div className="text-xs text-red-600 font-bold mt-1">⚠️ Over budget by {formatMoney(totalEstimatedCost - budgetedCost)}</div>
            )}
          </div>
          
          {/* Phase 1.4: Timed Exclusive */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 font-bold mb-2">
              <input 
                type="checkbox" 
                checked={form.timedExclusive || false} 
                onChange={e => { handleFieldChange('timedExclusive', e.target.checked); setTimeout(handleSave, 0); }} 
                className="w-5 h-5" 
              />
              Timed Exclusive?
            </label>
            {form.timedExclusive && (
              <div className="grid md:grid-cols-3 gap-4 pl-7 mt-2">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Start Date</label>
                  <input type="date" value={form.exclusiveStartDate || ''} onChange={e => handleFieldChange('exclusiveStartDate', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">End Date</label>
                  <input type="date" value={form.exclusiveEndDate || ''} onChange={e => handleFieldChange('exclusiveEndDate', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Exclusive Notes (Platform)</label>
                  <input value={form.exclusiveNotes || ''} onChange={e => handleFieldChange('exclusiveNotes', e.target.value)} onBlur={handleSave} placeholder="e.g., YouTube exclusive" className={cn("w-full", THEME.punk.input)} />
                </div>
              </div>
            )}
          </div>
          
          {/* Phase 1.6: Stage/Era/Tags for Videos */}
          <div className="md:col-span-2">
            <EraStageTagsPicker
              value={{
                eraIds: form.eraIds || [],
                stageIds: form.stageIds || [],
                tagIds: form.tagIds || []
              }}
              onChange={({ eraIds, stageIds, tagIds }) => {
                handleFieldChange('eraIds', eraIds);
                handleFieldChange('stageIds', stageIds);
                handleFieldChange('tagIds', tagIds);
                setTimeout(handleSave, 0);
              }}
            />
          </div>
          
          {/* Phase 1.3: Attached Items (Releases and Events for tracking) */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Attached Releases</label>
            <div className="flex flex-wrap gap-2 p-2 border-4 border-black bg-white min-h-[40px] max-h-24 overflow-y-auto">
              {(data.releases || []).map(r => (
                <label key={r.id} className="flex items-center gap-1 text-xs font-bold cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={(form.attachedReleaseIds || []).includes(r.id)} 
                    onChange={e => {
                      const newIds = e.target.checked 
                        ? [...(form.attachedReleaseIds || []), r.id]
                        : (form.attachedReleaseIds || []).filter(id => id !== r.id);
                      handleFieldChange('attachedReleaseIds', newIds);
                      setTimeout(handleSave, 0);
                    }}
                    className="w-3 h-3" 
                  />
                  {r.name}
                </label>
              ))}
              {(data.releases || []).length === 0 && <span className="text-xs opacity-50">No releases available</span>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Attached Events</label>
            <div className="flex flex-wrap gap-2 p-2 border-4 border-black bg-white min-h-[40px] max-h-24 overflow-y-auto">
              {(data.events || []).map(ev => (
                <label key={ev.id} className="flex items-center gap-1 text-xs font-bold cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={(form.attachedEventIds || []).includes(ev.id)} 
                    onChange={e => {
                      const newIds = e.target.checked 
                        ? [...(form.attachedEventIds || []), ev.id]
                        : (form.attachedEventIds || []).filter(id => id !== ev.id);
                      handleFieldChange('attachedEventIds', newIds);
                      setTimeout(handleSave, 0);
                    }}
                    className="w-3 h-3" 
                  />
                  {ev.title}
                </label>
              ))}
              {(data.events || []).length === 0 && <span className="text-xs opacity-50">No events available</span>}
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} placeholder="Video notes..." />
          </div>
        </div>
      </div>

      {/* Unified Tasks Module - combines auto-generated and custom tasks */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex flex-wrap justify-between items-center mb-4 border-b-4 border-black pb-2 gap-2">
          <h3 className="font-black uppercase">Tasks</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={taskFilterStatus} onChange={e => setTaskFilterStatus(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={taskSortBy} onChange={e => setTaskSortBy(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="date">Sort by Date</option>
              <option value="type">Sort by Type</option>
              <option value="status">Sort by Status</option>
            </select>
            <button onClick={() => setTaskSortDir(taskSortDir === 'asc' ? 'desc' : 'asc')} className={cn("px-2 py-1 text-xs", THEME.punk.btn)}>
              {taskSortDir === 'asc' ? '↑' : '↓'}
            </button>
            <button 
              onClick={() => {
                // Unified Task Handling: Open modal with new blank task
                const newCustomTask = {
                  title: 'New Task',
                  date: '',
                  description: '',
                  estimatedCost: 0,
                  status: 'Not Started',
                  notes: '',
                  isAutoTask: false
                };
                handleOpenTaskEdit(newCustomTask, { type: 'new-custom' });
              }} 
              className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-green-600 text-white")}
            >
              + Add Task
            </button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-3 text-[10px] font-bold">
          <span className="px-2 py-1 bg-yellow-100 border-2 border-black">Auto Task</span>
          <span className="px-2 py-1 bg-green-100 border-2 border-black">Custom Task</span>
        </div>
        
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
                <tr><td colSpan="4" className="p-4 text-center opacity-50">No tasks yet. Add a custom task.</td></tr>
              ) : filteredTasks.map(task => {
                const isOverdue = task.date && new Date(task.date) < new Date() && task.status !== 'Complete' && task.status !== 'Done';
                return (
                  <tr key={task.id} className={cn(
                    "border-b border-gray-200 cursor-pointer hover:bg-gray-50",
                    isOverdue ? "bg-red-50" : task._isAuto ? "bg-yellow-50" : "bg-green-50"
                  )} onClick={() => handleOpenTaskEdit(task, { type: task._isAuto ? 'auto' : 'custom' })}>
                    <td className="p-2">
                      <span className={cn("px-2 py-1 text-xs font-bold border border-black", task._isAuto ? "bg-yellow-200" : "bg-green-200")}>
                        {task._isAuto ? 'Auto' : 'Custom'}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="font-bold">{task.type || task.title}</div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs", isOverdue && "text-red-600 font-bold")}>
                          {task.date || '-'}
                        </span>
                        {isOverdue && <span className="px-1 py-0.5 bg-red-200 border border-red-500 text-red-800 text-[10px] font-bold">OVERDUE</span>}
                      </div>
                    </td>
                    <td className="p-2" onClick={e => e.stopPropagation()}>
                      <select 
                        value={task.status || 'Not Started'} 
                        onChange={e => {
                          if (task._isAuto) {
                            const updatedTasks = videoTasks.map(t => t.id === task.id ? { ...t, status: e.target.value } : t);
                            if (video._source === 'standalone') {
                              actions.updateStandaloneVideo(video.id, { tasks: updatedTasks });
                            } else {
                              actions.updateSongVideo(video._songId, video.id, { tasks: updatedTasks });
                            }
                          } else {
                            const updatedTasks = videoCustomTasks.map(t => t.id === task.id ? { ...t, status: e.target.value } : t);
                            if (video._source === 'standalone') {
                              actions.updateStandaloneVideo(video.id, { customTasks: updatedTasks });
                            } else {
                              actions.updateSongVideo(video._songId, video.id, { customTasks: updatedTasks });
                            }
                          }
                        }} 
                        className="border-2 border-black p-1 text-xs"
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phase 1.7: Video Task More/Edit Info Page Modal - Unified Task Handling Architecture */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { setEditingTask(null); setEditingTaskContext(null); }}>
          <div className={cn("bg-white p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto", THEME.punk.card)} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
              <h3 className="font-black uppercase">{editingTaskContext?.type === 'new-custom' ? 'Add Task' : 'Edit Video Task'}</h3>
              <button onClick={() => { setEditingTask(null); setEditingTaskContext(null); }} className="text-2xl font-bold">×</button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Task Name</label>
                <input 
                  value={editingTask.title || editingTask.type || ''} 
                  onChange={e => setEditingTask({ ...editingTask, title: e.target.value, type: e.target.value })} 
                  className={cn("w-full", THEME.punk.input)} 
                  disabled={editingTask._isAuto}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Due Date</label>
                <input 
                  type="date" 
                  value={editingTask.date || ''} 
                  onChange={e => setEditingTask({ ...editingTask, date: e.target.value })} 
                  className={cn("w-full", THEME.punk.input)} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Status</label>
                <select 
                  value={editingTask.status || 'Not Started'} 
                  onChange={e => setEditingTask({ ...editingTask, status: e.target.value })}
                  className={cn("w-full", THEME.punk.input)}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Phase 1.7: Era */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Era</label>
                <select 
                  value={(editingTask.eraIds || [])[0] || ''} 
                  onChange={e => setEditingTask({ ...editingTask, eraIds: e.target.value ? [e.target.value] : [] })}
                  className={cn("w-full", THEME.punk.input)}
                >
                  <option value="">No Era</option>
                  {(data.eras || []).map(era => <option key={era.id} value={era.id}>{era.name}</option>)}
                </select>
              </div>
              {/* Phase 1.7: Stage */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Stage</label>
                <select 
                  value={(editingTask.stageIds || [])[0] || ''} 
                  onChange={e => setEditingTask({ ...editingTask, stageIds: e.target.value ? [e.target.value] : [] })}
                  className={cn("w-full", THEME.punk.input)}
                >
                  <option value="">No Stage</option>
                  {(data.stages || []).map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                </select>
              </div>
              {/* Phase 1.7: Tags */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Tags</label>
                <div className="flex flex-wrap gap-1 p-1 border-4 border-black bg-white text-xs max-h-16 overflow-y-auto">
                  {(data.tags || []).map(tag => (
                    <label key={tag.id} className="flex items-center gap-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={(editingTask.tagIds || []).includes(tag.id)} 
                        onChange={e => {
                          const ids = e.target.checked 
                            ? [...(editingTask.tagIds || []), tag.id]
                            : (editingTask.tagIds || []).filter(id => id !== tag.id);
                          setEditingTask({ ...editingTask, tagIds: ids });
                        }}
                        className="w-3 h-3" 
                      />
                      <span style={{ color: tag.color }}>{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Phase 1.7: Cost fields */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Estimated Cost</label>
                <input 
                  type="number" 
                  value={editingTask.estimatedCost || 0} 
                  onChange={e => setEditingTask({ ...editingTask, estimatedCost: parseFloat(e.target.value) || 0 })} 
                  className={cn("w-full", THEME.punk.input)} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Quoted Cost</label>
                <input 
                  type="number" 
                  value={editingTask.quotedCost || 0} 
                  onChange={e => setEditingTask({ ...editingTask, quotedCost: parseFloat(e.target.value) || 0 })} 
                  className={cn("w-full", THEME.punk.input)} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Paid Cost</label>
                <input 
                  type="number" 
                  value={editingTask.paidCost || 0} 
                  onChange={e => setEditingTask({ ...editingTask, paidCost: parseFloat(e.target.value) || 0 })} 
                  className={cn("w-full", THEME.punk.input)} 
                />
              </div>
              {/* Phase 1.7: Team Members */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Team Members</label>
                <div className="flex flex-wrap gap-1 p-1 border-4 border-black bg-white text-xs max-h-20 overflow-y-auto">
                  {teamMembers.map(m => (
                    <label key={m.id} className="flex items-center gap-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={(editingTask.teamMemberIds || []).includes(m.id) || (editingTask.assignedMembers || []).some(am => am.memberId === m.id)} 
                        onChange={e => {
                          const ids = e.target.checked 
                            ? [...(editingTask.teamMemberIds || []), m.id]
                            : (editingTask.teamMemberIds || []).filter(id => id !== m.id);
                          setEditingTask({ ...editingTask, teamMemberIds: ids });
                        }}
                        className="w-3 h-3" 
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
              {/* Phase 1.7: Notes */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase mb-1">Notes</label>
                <textarea 
                  value={editingTask.notes || editingTask.description || ''} 
                  onChange={e => setEditingTask({ ...editingTask, notes: e.target.value, description: e.target.value })} 
                  className={cn("w-full h-24", THEME.punk.input)} 
                  placeholder="Task notes..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t-2 border-gray-200">
              <button onClick={() => { setEditingTask(null); setEditingTaskContext(null); }} className={cn("px-4 py-2", THEME.punk.btn)}>Cancel</button>
              <button onClick={handleSaveTaskEdit} className={cn("px-4 py-2", THEME.punk.btn, "bg-green-600 text-white")}>Save Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Global Tasks List View - Following unified Item/Page architecture (same template as Songs/Releases)
// Phase 5: Enhanced with Category management
export const GlobalTasksListView = ({ onSelectTask }) => {
  const { data, actions } = useStore();
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArchived, setFilterArchived] = useState('active');
  const [viewMode, setViewMode] = useState('list');
  const [newCategoryName, setNewCategoryName] = useState('');
  // Phase 5.1: Manage categories modal
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => (
    <span>{sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
  );

  // Phase 5.1: Categories as Items - user-created only, no prefilled categories
  const allCategories = useMemo(() => {
    // Only show user-created categories (taskCategories collection)
    // Phase 5.1: No prefilled categories - users create their own
    return (data.taskCategories || []).map(c => ({ ...c, isLegacy: false }));
  }, [data.taskCategories]);

  const tasks = useMemo(() => {
    let filtered = [...(data.globalTasks || [])];
    if (filterArchived === 'active') {
      filtered = filtered.filter(t => !t.isArchived && t.status !== 'Done');
    } else if (filterArchived === 'archived') {
      filtered = filtered.filter(t => t.isArchived);
    } else if (filterArchived === 'done') {
      filtered = filtered.filter(t => t.status === 'Done');
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    filtered.sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (sortBy === 'estimatedCost') { valA = getEffectiveCost(a); valB = getEffectiveCost(b); }
      if (sortDir === 'asc') { return valA < valB ? -1 : valA > valB ? 1 : 0; }
      else { return valA > valB ? -1 : valA < valB ? 1 : 0; }
    });
    return filtered;
  }, [data.globalTasks, sortBy, sortDir, filterCategory, filterStatus, filterArchived]);

  const handleAddTask = async () => {
    const newTask = await actions.addGlobalTask({
      taskName: 'New Task',
      category: 'Other',
      date: new Date().toISOString().split('T')[0],
      status: 'Not Started',
      estimatedCost: 0
    });
    if (onSelectTask) onSelectTask(newTask);
  };

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Global Tasks</h2>
        <div className="flex flex-wrap gap-2">
          <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
            <option value="all">All Categories</option>
            {allCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterArchived} onChange={e => setFilterArchived(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
            <option value="archived">Archived</option>
          </select>
          {/* Phase 5.1 & 5.3: Manage Categories button */}
          <button onClick={() => setShowManageCategoriesModal(true)} className={cn("px-4 py-2", THEME.punk.btn, "bg-purple-600 text-white")}>
            <Icon name="Folder" size={16} className="inline mr-1" /> Categories
          </button>
          <button onClick={handleAddTask} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Task</button>
        </div>
      </div>

      {/* Phase 5.1: Manage Categories Modal */}
      {showManageCategoriesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={cn("bg-white p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto", THEME.punk.card)}>
            <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
              <h3 className="font-black uppercase">Manage Categories</h3>
              <button onClick={() => setShowManageCategoriesModal(false)} className="text-2xl font-bold">×</button>
            </div>
            
            {/* Phase 5.3: Add Category Form */}
            <div className="mb-4 p-3 bg-gray-50 border-2 border-black">
              <div className="flex gap-2">
                <input 
                  value={newCategoryName} 
                  onChange={e => setNewCategoryName(e.target.value)} 
                  placeholder="New category name" 
                  className={cn("flex-1", THEME.punk.input)} 
                />
                <button 
                  onClick={async () => {
                    if (newCategoryName.trim()) {
                      await actions.addTaskCategory({ name: newCategoryName.trim() });
                      setNewCategoryName('');
                    }
                  }}
                  className={cn("px-4 py-2", THEME.punk.btn, "bg-green-600 text-white")}
                >
                  + Add
                </button>
              </div>
            </div>
            
            {/* Phase 5.1: List of Category Items */}
            <div className="space-y-2">
              {(data.taskCategories || []).length === 0 ? (
                <div className="p-4 text-center text-sm opacity-50">
                  No categories created yet. Add a category above to organize your tasks.
                </div>
              ) : (
                (data.taskCategories || []).map(category => {
                  const taskCount = (data.globalTasks || []).filter(t => 
                    t.categoryId === category.id || t.category === category.name
                  ).length;
                  return (
                    <div key={category.id} className="flex items-center justify-between p-3 border-2 border-black bg-white">
                      <div>
                        <span className="font-bold">{category.name}</span>
                        <span className="ml-2 text-xs opacity-60">({taskCount} tasks)</span>
                      </div>
                      <button 
                        onClick={() => {
                          if (confirm(`Delete category "${category.name}"? Tasks will remain but become uncategorized.`)) {
                            actions.deleteTaskCategory(category.id);
                          }
                        }}
                        className="text-red-500 p-1 hover:bg-red-50"
                        title="Delete"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t-2 border-gray-200 text-xs text-gray-500">
              <p>💡 Categories help organize your global tasks. Tasks without a category belong to an invisible default.</p>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tasks.length === 0 ? (
            <div className={cn("col-span-full p-10 text-center opacity-50", THEME.punk.card)}>No tasks yet. Click Add Task to create one.</div>
          ) : (
            tasks.map(task => (
              <div key={task.id} onClick={() => onSelectTask && onSelectTask(task)} className={cn("p-4 cursor-pointer hover:bg-yellow-50", THEME.punk.card, task.isArchived && "opacity-50")}>
                <div className="font-bold text-lg mb-2">{task.taskName}</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between"><span className="opacity-60">Category:</span><span className="font-bold">{task.category || '-'}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Date:</span><span className="font-bold">{task.date || 'TBD'}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Status:</span><span className="font-bold">{task.status}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Est. Cost:</span><span className="font-bold">{formatMoney(getEffectiveCost(task))}</span></div>
                </div>
                {task.isArchived && <span className="mt-2 block text-xs text-orange-600 font-bold">ARCHIVED</span>}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={cn("overflow-x-auto", THEME.punk.card)}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black text-white">
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('taskName')}>Task Name <SortIcon field="taskName" /></th>
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('category')}>Category <SortIcon field="category" /></th>
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('date')}>Date <SortIcon field="date" /></th>
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('status')}>Status <SortIcon field="status" /></th>
                <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('estimatedCost')}>Est. Cost <SortIcon field="estimatedCost" /></th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan="6" className="p-10 text-center opacity-50">No tasks yet. Click Add Task to create one.</td></tr>
              ) : (
                tasks.map(task => (
                  <tr key={task.id} className={cn("border-b border-gray-200 hover:bg-yellow-50 cursor-pointer", task.isArchived && "opacity-50")} onClick={() => onSelectTask && onSelectTask(task)}>
                    <td className="p-3 font-bold">{task.taskName}</td>
                    <td className="p-3">{task.category || '-'}</td>
                    <td className="p-3">{task.date || '-'}</td>
                    <td className="p-3">{task.status}</td>
                    <td className="p-3 text-right">{formatMoney(getEffectiveCost(task))}</td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        {!task.isArchived ? (
                          <button onClick={(e) => { e.stopPropagation(); actions.archiveGlobalTask(task.id); }} className="text-orange-500 p-1 hover:bg-orange-50" title="Archive"><Icon name="Archive" size={14} /></button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); actions.updateGlobalTask(task.id, { isArchived: false }); }} className="text-green-500 p-1 hover:bg-green-50" title="Restore">↩</button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete?')) actions.deleteGlobalTask(task.id); }} className="text-red-500 p-1 hover:bg-red-50" title="Delete"><Icon name="Trash2" size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Global Task Detail View - Phase 5.2: Uses Task More/Edit Info Page, NOT an Item Edit/More Info Page
// This focuses on task-specific editing rather than full item management
export const GlobalTaskDetailView = ({ task, onBack }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...task });
  const [newAssignments, setNewAssignments] = useState({ memberId: '', cost: 0 });
  // Phase 5.3: State for adding new category inline
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const teamMembers = useMemo(() => data.teamMembers || [], [data.teamMembers]);
  // Phase 5.1: Categories as Items - show only user-created categories, no prefilled
  const allCategories = useMemo(() => {
    // Phase 5.1: No prefilled categories - users create their own
    return (data.taskCategories || []).map(c => ({ ...c, isLegacy: false }));
  }, [data.taskCategories]);

  const handleSave = async () => { await actions.updateGlobalTask(task.id, form); };
  const handleFieldChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

  const handleDeleteTask = async () => {
    if (confirm('Delete this task?')) { await actions.deleteGlobalTask(task.id); onBack(); }
  };

  const handleArchive = async () => {
    await actions.archiveGlobalTask(task.id);
    onBack();
  };

  // Phase 5.3: Add new category and assign this task to it
  const handleAddCategoryAndAssign = async () => {
    if (newCategoryName.trim()) {
      const newCategory = await actions.addTaskCategory({ name: newCategoryName.trim() });
      if (newCategory) {
        handleFieldChange('category', newCategory.name);
        handleFieldChange('categoryId', newCategory.id);
        setTimeout(handleSave, 0);
      }
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const addAssignment = () => {
    if (!newAssignments.memberId) return;
    const updatedMembers = [...(form.assignedMembers || []), { memberId: newAssignments.memberId, cost: parseFloat(newAssignments.cost) || 0 }];
    handleFieldChange('assignedMembers', updatedMembers);
    setTimeout(handleSave, 0);
    setNewAssignments({ memberId: '', cost: 0 });
  };

  const removeAssignment = (index) => {
    const updatedMembers = (form.assignedMembers || []).filter((_, i) => i !== index);
    handleFieldChange('assignedMembers', updatedMembers);
    setTimeout(handleSave, 0);
  };

  const currentTask = useMemo(() => (data.globalTasks || []).find(t => t.id === task.id) || task, [data.globalTasks, task]);
  
  // Get assigned members list
  const assignedTeamMembers = useMemo(() => {
    const memberIds = new Set();
    (currentTask.assignedMembers || []).forEach(m => memberIds.add(m.memberId));
    return teamMembers.filter(m => memberIds.has(m.id));
  }, [currentTask, teamMembers]);

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className={cn("px-4 py-2 bg-white flex items-center gap-2", THEME.punk.btn)}>
          <Icon name="ChevronLeft" size={16} /> Back to Tasks
        </button>
        <div className="flex gap-2">
          {!currentTask.isArchived ? (
            <button onClick={handleArchive} className={cn("px-4 py-2", THEME.punk.btn, "bg-orange-500 text-white")}><Icon name="Archive" size={16} /></button>
          ) : (
            <button onClick={() => { actions.updateGlobalTask(task.id, { isArchived: false }); }} className={cn("px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>Restore</button>
          )}
          <button onClick={handleDeleteTask} className={cn("px-4 py-2", THEME.punk.btn, "bg-red-500 text-white")}><Icon name="Trash2" size={16} /></button>
        </div>
      </div>

      {currentTask.isArchived && (
        <div className={cn("p-4 mb-6 bg-orange-100 border-4 border-orange-500", THEME.punk.card)}>
          <span className="font-bold text-orange-800">⚠️ This task is archived</span>
        </div>
      )}

      {/* Phase 5.2: SECTION A - Task Display Information (read-only summary) */}
      <div className={cn("p-6 mb-6 bg-gray-50", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Task Summary</h3>
        
        {/* Task Name - prominent at top */}
        <div className="text-2xl font-black mb-4 pb-2 border-b-2 border-gray-300">{currentTask.taskName || 'Untitled Task'}</div>
        
        <div className="grid md:grid-cols-4 gap-4">
          {/* Status */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Status</label>
            <div className={cn("px-3 py-2 border-2 border-black text-sm font-bold",
              currentTask.status === 'Complete' || currentTask.status === 'Done' ? "bg-green-100" : 
              currentTask.status === 'In Progress' ? "bg-yellow-100" : "bg-gray-100"
            )}>
              {currentTask.status || 'Not Started'}
            </div>
          </div>
          
          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Due Date</label>
            <div className="px-3 py-2 bg-blue-100 border-2 border-black text-sm font-bold">
              {currentTask.date || 'Not Set'}
            </div>
          </div>
          
          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Category</label>
            <div className="px-3 py-2 bg-purple-100 border-2 border-black text-sm font-bold">
              {currentTask.category || 'Other'}
            </div>
          </div>
          
          {/* Cost Paid */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Cost Paid</label>
            <div className="px-3 py-2 bg-green-100 border-2 border-black text-sm font-bold">
              {formatMoney(currentTask.paidCost || 0)}
            </div>
          </div>
          
          {/* Estimated Cost */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Estimated Cost</label>
            <div className="px-3 py-2 bg-yellow-100 border-2 border-black text-sm font-bold">
              {formatMoney(currentTask.estimatedCost || 0)}
            </div>
          </div>
          
          {/* Assigned To (legacy field) */}
          {currentTask.assignedTo && (
            <div>
              <label className="block text-xs font-bold uppercase mb-2">Assigned To</label>
              <div className="px-3 py-2 bg-gray-100 border-2 border-black text-sm font-bold">
                {currentTask.assignedTo}
              </div>
            </div>
          )}
          
          {/* Team Members */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold uppercase mb-2">Assigned Members</label>
            <div className="flex flex-wrap gap-2">
              {assignedTeamMembers.length === 0 && !currentTask.assignedTo ? (
                <span className="text-xs opacity-50">No team members assigned</span>
              ) : assignedTeamMembers.map(m => (
                <div key={m.id} className="px-2 py-1 bg-purple-100 border-2 border-black text-xs font-bold">
                  {m.name} {m.isMusician && '🎵'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Phase 5.2: SECTION B - Task Information (editable) - Task-focused editing */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Task Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Task Name</label>
            <input value={form.taskName || ''} onChange={e => handleFieldChange('taskName', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          {/* Phase 5.1 & 5.3: Category with Add Category option */}
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Category</label>
            <div className="flex gap-2">
              <select 
                value={form.category || ''} 
                onChange={e => { 
                  handleFieldChange('category', e.target.value); 
                  // Find matching category ID
                  const cat = allCategories.find(c => c.name === e.target.value);
                  if (cat && !cat.isLegacy) {
                    handleFieldChange('categoryId', cat.id);
                  }
                  setTimeout(handleSave, 0); 
                }} 
                className={cn("flex-1", THEME.punk.input)}
              >
                <option value="">No Category</option>
                {allCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              {/* Phase 5.3: Add Category button */}
              <button 
                onClick={() => setShowAddCategory(!showAddCategory)}
                className={cn("px-3 py-2 text-xs", THEME.punk.btn, showAddCategory ? "bg-gray-500 text-white" : "bg-purple-600 text-white")}
                title="Add New Category"
              >
                {showAddCategory ? '×' : '+'}
              </button>
            </div>
            {/* Phase 5.3: Inline Add Category form */}
            {showAddCategory && (
              <div className="flex gap-2 mt-2">
                <input 
                  value={newCategoryName} 
                  onChange={e => setNewCategoryName(e.target.value)} 
                  placeholder="New category name"
                  className={cn("flex-1 text-xs", THEME.punk.input)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategoryAndAssign()}
                />
                <button 
                  onClick={handleAddCategoryAndAssign}
                  className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-green-600 text-white")}
                >
                  Add & Assign
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Due Date</label>
            <input type="date" value={form.date || ''} onChange={e => handleFieldChange('date', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Status</label>
            <select value={form.status || 'Not Started'} onChange={e => { handleFieldChange('status', e.target.value); setTimeout(handleSave, 0); }} className={cn("w-full", THEME.punk.input)}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Estimated Cost</label>
            <input type="number" value={form.estimatedCost || 0} onChange={e => handleFieldChange('estimatedCost', parseFloat(e.target.value) || 0)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Quoted Cost</label>
            <input type="number" value={form.quotedCost || 0} onChange={e => handleFieldChange('quotedCost', parseFloat(e.target.value) || 0)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Paid Cost</label>
            <input type="number" value={form.paidCost || 0} onChange={e => handleFieldChange('paidCost', parseFloat(e.target.value) || 0)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Assigned To <span className="text-gray-400">(Simple text)</span></label>
            <input value={form.assignedTo || ''} onChange={e => handleFieldChange('assignedTo', e.target.value)} onBlur={handleSave} placeholder="Person name" className={cn("w-full", THEME.punk.input)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} placeholder="Task notes and details..." />
          </div>
          {/* Era/Stage/Tags */}
          <div className="md:col-span-2">
            <EraStageTagsPicker
              value={{
                eraIds: form.eraIds || [],
                stageIds: form.stageIds || [],
                tagIds: form.tagIds || []
              }}
              onChange={({ eraIds, stageIds, tagIds }) => {
                handleFieldChange('eraIds', eraIds);
                handleFieldChange('stageIds', stageIds);
                handleFieldChange('tagIds', tagIds);
                setTimeout(handleSave, 0);
              }}
            />
          </div>
        </div>
      </div>

      {/* Team Member Assignments */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Team Member Assignments</h3>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 mb-3">
            {(form.assignedMembers || []).length === 0 ? (
              <span className="text-xs opacity-50">No team members assigned yet</span>
            ) : (form.assignedMembers || []).map((m, index) => {
              const member = teamMembers.find(tm => tm.id === m.memberId);
              return (
                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-purple-100 border-2 border-black">
                  <span className="text-sm font-bold">{member?.name || 'Member'} ({formatMoney(m.cost)})</span>
                  <button onClick={() => removeAssignment(index)} className="text-red-500 text-sm font-bold">✕</button>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <select value={newAssignments.memberId} onChange={e => setNewAssignments(prev => ({ ...prev, memberId: e.target.value }))} className={cn("flex-1 text-sm", THEME.punk.input)}>
              <option value="">Select team member...</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="number" value={newAssignments.cost} onChange={e => setNewAssignments(prev => ({ ...prev, cost: e.target.value }))} placeholder="Cost" className={cn("w-24 text-sm", THEME.punk.input)} />
            <button onClick={addAssignment} className={cn("px-4 py-2 text-sm", THEME.punk.btn, "bg-purple-600 text-white")}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
};
