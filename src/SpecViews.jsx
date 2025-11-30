import { useState, useMemo, useCallback } from 'react';
import { useStore, STATUS_OPTIONS, SONG_CATEGORIES, RELEASE_TYPES, VERSION_TYPES, GLOBAL_TASK_CATEGORIES, EXCLUSIVITY_OPTIONS, getEffectiveCost, calculateTaskProgress, resolveCostPrecedence, getPrimaryDate, getTaskDueDate } from './Store';
import { THEME, formatMoney, cn } from './utils';
import { Icon } from './Components';
import { DetailPane } from './ItemComponents';

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
        <h2 className={THEME.punk.textStyle}>Songs</h2>
        <div className="flex flex-wrap gap-2">
          {/* Tier 1.1: Grid/List View Toggle */}
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
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', date: '', description: '', estimatedCost: 0, status: 'Not Started', notes: '' });
  const [newVersionName, setNewVersionName] = useState('Template Version');
  const [newSongMusician, setNewSongMusician] = useState({ memberId: '', instruments: '' });
  const [newVersionMusicians, setNewVersionMusicians] = useState({});
  const [newAssignments, setNewAssignments] = useState({});
  // Section 3: Task sorting/filtering state
  const [taskSortBy, setTaskSortBy] = useState('date');
  const [taskSortDir, setTaskSortDir] = useState('asc');
  const [taskFilterStatus, setTaskFilterStatus] = useState('all');
  const [taskFilterCategory, setTaskFilterCategory] = useState('all');
  // Version expand/collapse state
  const [expandedVersions, setExpandedVersions] = useState({});
  // Selected task for editing modal
  const [selectedTask, setSelectedTask] = useState(null);

  const teamMembers = useMemo(() => data.teamMembers || [], [data.teamMembers]);

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
    if (budget > 0 && nextTotal > budget) return; // prevent over-allocation
    const updatedMembers = [...(taskObj.assignedMembers || []), { memberId: entry.memberId, cost: parseFloat(entry.cost) || 0, instrument: entry.instrument || '' }];
    updater(updatedMembers);
    setNewAssignments(prev => ({ ...prev, [taskKey]: { memberId: '', cost: 0, instrument: '' } }));
  };

  const handleSave = async () => { await actions.updateSong(song.id, form); };
  const handleFieldChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

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

  const handleAddCustomTask = async () => {
    await actions.addSongCustomTask(song.id, newTask);
    setNewTask({ title: '', date: '', description: '', estimatedCost: 0, status: 'Not Started', notes: '' });
    setShowAddTask(false);
  };

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

  // Handle instrument change and auto-create/delete Record tasks
  const handleInstrumentsChange = useCallback(async (instrumentsString) => {
    const newInstruments = instrumentsString.split(',').map(i => i.trim()).filter(Boolean);
    handleFieldChange('instruments', newInstruments);
    // Auto-sync instrument recording tasks will happen on save
    setTimeout(handleSave, 0);
  }, [handleFieldChange, handleSave]);

  const currentSong = useMemo(() => data.songs.find(s => s.id === song.id) || song, [data.songs, song]);
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

  // Handle video type checkbox toggle - creates/deletes Video Item
  const handleVideoTypeToggle = useCallback(async (versionId, typeKey, checked) => {
    const version = currentSong.versions?.find(v => v.id === versionId);
    if (!version) return;
    
    const newVideoTypes = { ...(version.videoTypes || {}), [typeKey]: checked };
    await actions.updateSongVersion(song.id, versionId, { videoTypes: newVideoTypes });
    
    // If video type checked, auto-create Video Item for the Song
    if (checked) {
      const videoTypeLabels = {
        lyric: 'Lyric Video',
        enhancedLyric: 'Enhanced Lyric Video',
        music: 'Music Video',
        visualizer: 'Visualizer',
        custom: 'Custom Video'
      };
      const existingVideo = (currentSong.videos || []).find(v => 
        v.versionId === versionId && v.types?.[typeKey]
      );
      if (!existingVideo) {
        await actions.addSongVideo(song.id, {
          title: `${currentSong.title} - ${videoTypeLabels[typeKey]}`,
          versionId: versionId,
          types: { [typeKey]: true },
          releaseDate: version.releaseDate || currentSong.releaseDate || ''
        });
      }
    }
  }, [currentSong, song.id, actions]);

  // Section 3: Filtered and sorted tasks
  const filteredSongTasks = useMemo(() => {
    let tasks = [...songTasks];
    if (taskFilterStatus !== 'all') {
      tasks = tasks.filter(t => t.status === taskFilterStatus);
    }
    if (taskFilterCategory !== 'all') {
      tasks = tasks.filter(t => t.category === taskFilterCategory);
    }
    tasks.sort((a, b) => {
      const valA = a[taskSortBy] || '';
      const valB = b[taskSortBy] || '';
      return taskSortDir === 'asc' 
        ? (valA < valB ? -1 : valA > valB ? 1 : 0)
        : (valA > valB ? -1 : valA < valB ? 1 : 0);
    });
    return tasks;
  }, [songTasks, taskFilterStatus, taskFilterCategory, taskSortBy, taskSortDir]);

  // Section 3: Get linked releases for Display Information - supports coreReleaseIds (array) and legacy coreReleaseId
  const linkedReleases = useMemo(() => {
    const releaseIds = new Set();
    // Support new coreReleaseIds array
    (currentSong.coreReleaseIds || []).forEach(id => releaseIds.add(id));
    // Legacy support for single coreReleaseId
    if (currentSong.coreReleaseId) releaseIds.add(currentSong.coreReleaseId);
    (currentSong.versions || []).forEach(v => {
      (v.releaseIds || []).forEach(rid => releaseIds.add(rid));
    });
    return (data.releases || []).filter(r => releaseIds.has(r.id));
  }, [currentSong, data.releases]);

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

  // Get unique task categories for filter dropdown
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
                <input 
                  type="date" 
                  value={form.releaseDateOverride ? form.releaseDate : (earliestReleaseDate || form.releaseDate || '')} 
                  onChange={e => handleFieldChange('releaseDate', e.target.value)} 
                  onBlur={handleSave} 
                  disabled={!form.releaseDateOverride && earliestReleaseDate}
                  className={cn("flex-1", THEME.punk.input, !form.releaseDateOverride && earliestReleaseDate && "opacity-60")} 
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
        
        {/* B.4 Videos: Core Version Video Options */}
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
              ].map(type => {
                const coreVersion = (currentSong.versions || []).find(v => v.id === 'core');
                return (
                  <label key={type.key} className="flex items-center gap-2 cursor-pointer font-bold">
                    <input 
                      type="checkbox" 
                      checked={coreVersion?.videoTypes?.[type.key] || false} 
                      onChange={e => handleVideoTypeToggle('core', type.key, e.target.checked)} 
                      className="w-4 h-4"
                    />
                    {type.label}
                  </label>
                );
              })}
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
        
        {/* B.6 Instruments */}
        <div className="mb-6 pb-4 border-b-2 border-gray-200">
          <h4 className="text-xs font-black uppercase mb-3 text-gray-600">Instruments</h4>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Instruments
              <span className="text-[10px] font-normal ml-2 text-gray-500">(Adding creates "Record (Instrument)" tasks)</span>
            </label>
            <input 
              value={(form.instruments || []).join(', ')} 
              onChange={e => handleInstrumentsChange(e.target.value)} 
              placeholder="guitar, synth, drums (comma-separated)" 
              className={cn("w-full", THEME.punk.input)} 
            />
          </div>
        </div>
        
        {/* B.7 Metadata: Era, Stage, Tags, Notes */}
        <div>
          <h4 className="text-xs font-black uppercase mb-3 text-gray-600">Metadata</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Era</label>
              <div className="flex gap-2">
                <select 
                  value={(form.eraIds || [])[0] || ''} 
                  onChange={e => {
                    const newEraIds = e.target.value ? [e.target.value] : [];
                    handleFieldChange('eraIds', newEraIds);
                    setTimeout(handleSave, 0);
                  }}
                  className={cn("flex-1", THEME.punk.input)}
                >
                  <option value="">No Era</option>
                  {(data.eras || []).map(era => <option key={era.id} value={era.id}>{era.name}</option>)}
                </select>
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
              <select 
                value={(form.stageIds || [])[0] || ''} 
                onChange={e => {
                  const newStageIds = e.target.value ? [e.target.value] : [];
                  handleFieldChange('stageIds', newStageIds);
                  setTimeout(handleSave, 0);
                }}
                className={cn("w-full", THEME.punk.input)}
              >
                <option value="">No Stage</option>
                {(data.stages || []).map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Tags</label>
              <input value={(form.tags || []).join(', ')} onChange={e => handleFieldChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} onBlur={handleSave} placeholder="comma-separated tags" className={cn("w-full", THEME.punk.input)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Notes</label>
              <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-20", THEME.punk.input)} placeholder="Additional notes..." />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B.2: Versions Module - Collapsible list */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Versions</h3>
          <div className="flex gap-2">
            <input value={newVersionName} onChange={e => setNewVersionName(e.target.value)} placeholder="New version name" className={cn("px-3 py-2 text-xs", THEME.punk.input)} />
            <button onClick={() => actions.addSongVersion(song.id, { name: newVersionName, releaseDate: currentSong.releaseDate })} className={cn("px-3 py-2 text-xs", THEME.punk.btn, "bg-black text-white")}>+ Add Version</button>
          </div>
        </div>
        
        <div className="space-y-2">
          {(currentSong.versions || []).map(v => {
            const versionTaskCount = (v.tasks || []).length + (v.customTasks || []).length;
            const versionProgress = calculateTaskProgress([...(v.tasks || []), ...(v.customTasks || [])]).progress;
            const isExpanded = expandedVersions[v.id];
            
            return (
              <div key={v.id} className={cn("border-2 border-black", v.id === 'core' ? 'bg-yellow-50' : 'bg-white')}>
                {/* Collapsed header - Version Name and task count */}
                <div 
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleVersionExpand(v.id)}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={isExpanded ? "ChevronDown" : "ChevronRight"} size={16} />
                    <span className="font-bold">{v.name}</span>
                    {v.id === 'core' && <span className="px-2 py-1 bg-yellow-200 text-xs font-bold border border-black">CORE</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-2 py-1 bg-gray-100 border border-black">{versionTaskCount} tasks</span>
                    <span className="px-2 py-1 bg-green-100 border border-black">{versionProgress}%</span>
                    {v.id !== 'core' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); if (confirm('Delete this version?')) actions.deleteSongVersion(song.id, v.id); }} 
                        className="p-1 text-red-500 hover:bg-red-100"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Expanded content */}
                {isExpanded && (
                  <div className="p-4 border-t-2 border-black">
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      {/* Version Name */}
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">Version Name</label>
                        <input value={v.name} onChange={e => actions.updateSongVersion(song.id, v.id, { name: e.target.value })} className={cn("w-full", THEME.punk.input)} />
                      </div>
                      
                      {/* Release Date */}
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">Release Date</label>
                        <input type="date" value={v.releaseDate || ''} onChange={e => actions.updateSongVersion(song.id, v.id, { releaseDate: e.target.value })} className={cn("w-full", THEME.punk.input)} />
                      </div>
                    </div>
                    
                    {/* B.2 Video Checkboxes - Creates/deletes Video Items */}
                    <div className="mb-4 p-3 bg-gray-50 border border-black">
                      <div className="text-xs font-bold uppercase mb-2">Video Types (check to create Video Item)</div>
                      <div className="flex flex-wrap gap-4 text-xs">
                        {[
                          { key: 'lyric', label: 'Lyric Video' },
                          { key: 'enhancedLyric', label: 'Enhanced Lyric' },
                          { key: 'music', label: 'Music Video' },
                          { key: 'visualizer', label: 'Visualizer' },
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
                    
                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Notes</label>
                      <textarea value={v.notes || ''} onChange={e => actions.updateSongVersion(song.id, v.id, { notes: e.target.value })} className={cn("w-full h-16", THEME.punk.input)} placeholder="Mix differences, edits, era..." />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION B.3: Tasks Module - All tasks from song and versions */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex flex-wrap justify-between items-center mb-4 border-b-4 border-black pb-2 gap-2">
          <h3 className="font-black uppercase">All Tasks</h3>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Task Filters */}
            <select value={taskFilterStatus} onChange={e => setTaskFilterStatus(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={taskFilterCategory} onChange={e => setTaskFilterCategory(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="all">All Categories</option>
              {taskCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Task Sorting */}
            <select value={taskSortBy} onChange={e => setTaskSortBy(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="date">Sort by Date</option>
              <option value="type">Sort by Type</option>
              <option value="status">Sort by Status</option>
              <option value="estimatedCost">Sort by Cost</option>
            </select>
            <button onClick={() => setTaskSortDir(taskSortDir === 'asc' ? 'desc' : 'asc')} className={cn("px-2 py-1 text-xs", THEME.punk.btn)}>
              {taskSortDir === 'asc' ? '↑' : '↓'}
            </button>
            <button onClick={handleRecalculateDeadlines} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-blue-500 text-white")}>Recalculate from Release Date</button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-3 text-[10px] font-bold">
          <span className="px-2 py-1 bg-yellow-100 border-2 border-black">Core Song</span>
          {(currentSong.versions || []).filter(v => v.id !== 'core').map(v => (
            <span key={v.id} className="px-2 py-1 bg-blue-100 border-2 border-black">{v.name}</span>
          ))}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left">Version</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('type'); setTaskSortDir(taskSortBy === 'type' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Type {taskSortBy === 'type' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('date'); setTaskSortDir(taskSortBy === 'date' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Date {taskSortBy === 'date' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('status'); setTaskSortDir(taskSortBy === 'status' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Status {taskSortBy === 'status' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-right cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('estimatedCost'); setTaskSortDir(taskSortBy === 'estimatedCost' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Est. Cost {taskSortBy === 'estimatedCost' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-left">Assignments</th>
                <th className="p-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {/* Core Song Tasks - now uses filtered/sorted tasks */}
              {filteredSongTasks.length === 0 && (currentSong.versions || []).every(v => (v.tasks || []).length === 0) ? (
                <tr><td colSpan="8" className="p-4 text-center opacity-50">No tasks yet. Set a release date and click Recalculate.</td></tr>
              ) : (
                <>
                  {/* Core song tasks */}
                  {filteredSongTasks.map(task => (
                    <tr key={`core-${task.id}`} className="border-b border-gray-200 bg-yellow-50">
                      <td className="p-2"><span className="px-2 py-1 text-xs font-bold bg-yellow-200 border border-black">Core</span></td>
                      <td className="p-2 font-bold">{task.type}{task.isOverridden && <span className="text-xs text-orange-500 ml-1">(edited)</span>}</td>
                      <td className="p-2"><span className="px-2 py-1 text-xs bg-gray-200">{task.category || '-'}</span></td>
                      <td className="p-2"><input type="date" value={task.date || ''} onChange={e => handleDeadlineChange(task.id, 'date', e.target.value)} className="border-2 border-black p-1 text-xs" /></td>
                      <td className="p-2"><select value={task.status || 'Not Started'} onChange={e => handleDeadlineChange(task.id, 'status', e.target.value)} className="border-2 border-black p-1 text-xs">{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                      <td className="p-2"><input type="number" value={task.estimatedCost || 0} onChange={e => handleDeadlineChange(task.id, 'estimatedCost', parseFloat(e.target.value) || 0)} className="border-2 border-black p-1 text-xs w-20 text-right" /></td>
                      <td className="p-2 text-xs space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {(task.assignedMembers || []).map(m => {
                            const member = teamMembers.find(tm => tm.id === m.memberId);
                            return <span key={m.memberId + m.cost + (m.instrument || '')} className="px-2 py-1 bg-purple-100 border-2 border-black font-bold text-xs">{member?.name || 'Member'} {m.instrument ? `• ${m.instrument}` : ''} ({formatMoney(m.cost)})</span>;
                          })}
                        </div>
                        <div className="flex gap-1 items-center">
                          <select value={newAssignments[task.id]?.memberId || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), memberId: e.target.value } }))} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
                            <option value="">Assign member</option>
                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                          <input type="number" value={newAssignments[task.id]?.cost || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), cost: e.target.value } }))} placeholder="Cost" className={cn("px-2 py-1 text-xs w-20", THEME.punk.input)} />
                          <input value={newAssignments[task.id]?.instrument || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), instrument: e.target.value } }))} placeholder="Instrument" className={cn("px-2 py-1 text-xs w-28", THEME.punk.input)} />
                          <button onClick={() => addAssignment(task.id, task, (assignedMembers) => {
                            const updatedTasks = songTasks.map(t => t.id === task.id ? { ...t, assignedMembers } : t);
                            actions.updateSong(song.id, { deadlines: updatedTasks });
                          })} className={cn("px-2 py-1 text-xs", THEME.punk.btn, "bg-pink-600 text-white")}>Add</button>
                        </div>
                        {taskBudget(task) > 0 && <div className="text-[10px] font-bold">Budget Remaining: {formatMoney(taskBudget(task) - (task.assignedMembers || []).reduce((s, m) => s + (m.cost || 0), 0))}</div>}
                      </td>
                      <td className="p-2"><input value={task.notes || ''} onChange={e => handleDeadlineChange(task.id, 'notes', e.target.value)} className="border-2 border-black p-1 text-xs w-full" placeholder="Notes..." /></td>
                    </tr>
                  ))}
                  
                  {/* Version tasks */}
                  {(currentSong.versions || []).filter(v => v.id !== 'core').flatMap(v => 
                    (v.tasks || []).map(task => (
                      <tr key={`${v.id}-${task.id}`} className="border-b border-gray-200 bg-blue-50">
                        <td className="p-2"><span className="px-2 py-1 text-xs font-bold bg-blue-200 border border-black">{v.name}</span></td>
                        <td className="p-2 font-bold">{task.type}{task.isOverridden && <span className="text-xs text-orange-500 ml-1">(edited)</span>}</td>
                        <td className="p-2"><span className="px-2 py-1 text-xs bg-gray-200">{task.category || '-'}</span></td>
                        <td className="p-2"><input type="date" value={task.date || ''} onChange={e => actions.updateVersionTask(song.id, v.id, task.id, { date: e.target.value })} className="border-2 border-black p-1 text-xs" /></td>
                        <td className="p-2"><select value={task.status || 'Not Started'} onChange={e => actions.updateVersionTask(song.id, v.id, task.id, { status: e.target.value })} className="border-2 border-black p-1 text-xs">{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                        <td className="p-2"><input type="number" value={task.estimatedCost || 0} onChange={e => actions.updateVersionTask(song.id, v.id, task.id, { estimatedCost: parseFloat(e.target.value) || 0 })} className="border-2 border-black p-1 text-xs w-20 text-right" /></td>
                        <td className="p-2 text-xs"><span className="opacity-50">(Assign via version)</span></td>
                        <td className="p-2"><span className="opacity-50">-</span></td>
                      </tr>
                    ))
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Tasks Section (2.2.3) */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Custom Tasks</h3>
          <button onClick={() => setShowAddTask(!showAddTask)} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-black text-white")}>{showAddTask ? 'Cancel' : '+ Add Task'}</button>
        </div>
        {showAddTask && (
          <div className="bg-gray-50 p-4 mb-4 border-2 border-black">
            <div className="grid md:grid-cols-2 gap-3">
              <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task Title" className={cn("w-full", THEME.punk.input)} />
              <input type="date" value={newTask.date} onChange={e => setNewTask({ ...newTask, date: e.target.value })} className={cn("w-full", THEME.punk.input)} />
              <input value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Description" className={cn("w-full", THEME.punk.input)} />
              <input type="number" value={newTask.estimatedCost} onChange={e => setNewTask({ ...newTask, estimatedCost: parseFloat(e.target.value) || 0 })} placeholder="Estimated Cost" className={cn("w-full", THEME.punk.input)} />
              <select value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })} className={cn("w-full", THEME.punk.input)}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <button onClick={handleAddCustomTask} className={cn("px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>Add Task</button>
            </div>
          </div>
        )}
        {songCustomTasks.length === 0 ? (
          <p className="text-center opacity-50 py-4">No custom tasks yet.</p>
        ) : (
          <div className="space-y-2">
            {songCustomTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 p-3 bg-gray-50 border-2 border-black">
                <div className="flex-1">
                  <div className="font-bold">{task.title}</div>
                  <div className="text-xs opacity-60">{task.date} | {task.status} | {formatMoney(task.estimatedCost || 0)}</div>
                  {task.description && <div className="text-sm mt-1">{task.description}</div>}
                    <div className="mt-2 space-y-1">
                      <div className="flex flex-wrap gap-1">
                        {(task.assignedMembers || []).map(m => {
                          const member = teamMembers.find(tm => tm.id === m.memberId);
                        return <span key={m.memberId + m.cost + (m.instrument || '')} className="px-2 py-1 border-2 border-black bg-purple-100 text-xs font-bold">{member?.name || 'Member'} {m.instrument ? `• ${m.instrument}` : ''} ({formatMoney(m.cost)})</span>;
                      })}
                    </div>
                    <div className="flex gap-1 items-center">
                      <select value={newAssignments[task.id]?.memberId || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), memberId: e.target.value } }))} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
                        <option value="">Assign member</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <input type="number" value={newAssignments[task.id]?.cost || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), cost: e.target.value } }))} placeholder="Cost" className={cn("px-2 py-1 text-xs w-20", THEME.punk.input)} />
                      <input value={newAssignments[task.id]?.instrument || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), instrument: e.target.value } }))} placeholder="Instrument" className={cn("px-2 py-1 text-xs w-28", THEME.punk.input)} />
                      <button onClick={() => addAssignment(task.id, task, (assignedMembers) => actions.updateSongCustomTask(song.id, task.id, { assignedMembers }))} className={cn("px-2 py-1 text-xs", THEME.punk.btn, "bg-pink-600 text-white")}>Add</button>
                      {taskBudget(task) > 0 && <span className="text-[10px] font-bold">Remaining: {formatMoney(taskBudget(task) - (task.assignedMembers || []).reduce((s, m) => s + (m.cost || 0), 0))}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDeleteCustomTask(task.id)} className="p-2 text-red-500 hover:bg-red-100"><Icon name="Trash2" size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cost Summary - Calculated from all tasks (per specification B.2) */}
      <div className={cn("p-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Cost Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Core Song Tasks:</span><span className="font-bold">{formatMoney(tasksCost)}</span></div>
          <div className="flex justify-between"><span>Custom Tasks:</span><span className="font-bold">{formatMoney(customTasksCost)}</span></div>
          <div className="flex justify-between"><span>Version Tasks:</span><span className="font-bold">{formatMoney(versionsCost)}</span></div>
          <div className="flex justify-between border-t-4 border-black pt-2 text-lg"><span className="font-black">TOTAL:</span><span className="font-black">{formatMoney(totalCost)}</span></div>
        </div>
      </div>
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
  
  // Get all categories - combine legacy GLOBAL_TASK_CATEGORIES with new Task Category Items
  const allCategories = useMemo(() => {
    const legacyCategories = GLOBAL_TASK_CATEGORIES.map(name => ({ id: `legacy-${name}`, name, isLegacy: true }));
    const itemCategories = (data.taskCategories || []).map(c => ({ ...c, isLegacy: false }));
    // Merge: prefer Item categories over legacy if same name
    const merged = [];
    const nameSet = new Set();
    itemCategories.forEach(c => { merged.push(c); nameSet.add(c.name); });
    legacyCategories.forEach(c => { if (!nameSet.has(c.name)) merged.push(c); });
    return merged;
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

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Releases</h2>
        <div className="flex gap-2">
          {/* Tier 1.1: Grid/List View Toggle */}
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
          <button onClick={handleAddRelease} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Release</button>
        </div>
      </div>
      
      {/* Tier 1.1: Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {releases.length === 0 ? (
            <div className={cn("col-span-full p-10 text-center opacity-50", THEME.punk.card)}>No releases yet. Click Add Release to create one.</div>
          ) : (
            releases.map(release => (
              <div 
                key={release.id} 
                onClick={() => onSelectRelease && onSelectRelease(release)} 
                className={cn("p-4 cursor-pointer hover:bg-yellow-50", THEME.punk.card)}
              >
                <div className="font-bold text-lg mb-2">{release.name}</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="opacity-60">Type:</span>
                    <span className="font-bold">{release.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Release Date:</span>
                    <span className="font-bold">{release.releaseDate || 'TBD'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Progress:</span>
                    <span className="font-bold">{releaseProgress(release)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Est. Cost:</span>
                    <span className="font-bold">{formatMoney(release.estimatedCost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Songs:</span>
                    <span className="font-bold">{(release.attachedSongIds || []).length}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {release.hasPhysicalCopies && <span className="px-2 py-1 bg-blue-200 text-blue-800 text-[10px] font-bold border border-blue-500">PHYSICAL</span>}
                  {release.exclusiveType && release.exclusiveType !== 'None' && <span className="px-2 py-1 bg-purple-200 text-purple-800 text-[10px] font-bold border border-purple-500">{release.exclusiveType}</span>}
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
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Release Date</th>
                <th className="p-3 text-center">Physical</th>
                <th className="p-3 text-right">Progress</th>
                <th className="p-3 text-right">Estimated Cost</th>
              </tr>
            </thead>
            <tbody>
              {releases.length === 0 ? (
                <tr><td colSpan="6" className="p-10 text-center opacity-50">No releases yet. Click Add Release to create one.</td></tr>
              ) : releases.map(release => (
                <tr key={release.id} onClick={() => onSelectRelease && onSelectRelease(release)} className="border-b border-gray-200 hover:bg-yellow-50 cursor-pointer">
                  <td className="p-3 font-bold">{release.name}</td>
                  <td className="p-3">{release.type}</td>
                  <td className="p-3">{release.releaseDate || '-'}</td>
                  <td className="p-3 text-center">{release.hasPhysicalCopies ? 'Yes' : 'No'}</td>
                  <td className="p-3 text-right">{releaseProgress(release)}%</td>
                  <td className="p-3 text-right">{formatMoney(release.estimatedCost || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Release Detail View (Spec 2.5) - Section 3: Enhanced with Display Information and Task Sorting/Filtering
export const ReleaseDetailView = ({ release, onBack }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...release });
  const [showAddReq, setShowAddReq] = useState(false);
  const [newReq, setNewReq] = useState({ songId: '', versionType: 'Album', status: 'Not Started', notes: '' });
  const [newAssignments, setNewAssignments] = useState({});
  // Phase 3: Custom tasks state
  const [showAddCustomTask, setShowAddCustomTask] = useState(false);
  const [newCustomTask, setNewCustomTask] = useState({ title: '', date: '', description: '', estimatedCost: 0, status: 'Not Started' });
  // Tier 1.3: Task sorting/filtering state
  const [taskSortBy, setTaskSortBy] = useState('date');
  const [taskSortDir, setTaskSortDir] = useState('asc');
  const [taskFilterStatus, setTaskFilterStatus] = useState('all');
  const [taskFilterCategory, setTaskFilterCategory] = useState('all');

  const teamMembers = useMemo(() => data.teamMembers || [], [data.teamMembers]);

  const taskBudget = (task = {}) => {
    if (task.paidCost !== undefined) return task.paidCost || 0;
    if (task.actualCost !== undefined) return task.actualCost || 0;
    if (task.quotedCost !== undefined) return task.quotedCost || 0;
    return task.estimatedCost || 0;
  };

  const addAssignment = (taskKey, taskObj, updater) => {
    const entry = newAssignments[taskKey] || { memberId: '', cost: 0 };
    const budget = taskBudget(taskObj);
    const current = (taskObj.assignedMembers || []).reduce((s, m) => s + (parseFloat(m.cost) || 0), 0);
    const nextTotal = current + (parseFloat(entry.cost) || 0);
    if (budget > 0 && nextTotal > budget) return;
    const updatedMembers = [...(taskObj.assignedMembers || []), { memberId: entry.memberId, cost: parseFloat(entry.cost) || 0 }];
    updater(updatedMembers);
    setNewAssignments(prev => ({ ...prev, [taskKey]: { memberId: '', cost: 0 } }));
  };

  const currentRelease = data.releases.find(r => r.id === release.id) || release;

  const handleSave = async () => { await actions.updateRelease(release.id, form); };
  const handleFieldChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

  const handleAddRequirement = async () => {
    await actions.addRecordingRequirement(release.id, newReq);
    setNewReq({ songId: '', versionType: 'Album', status: 'Not Started', notes: '' });
    setShowAddReq(false);
  };

  const handleUpdateRequirement = async (reqId, field, value) => {
    await actions.updateRecordingRequirement(release.id, reqId, { [field]: value });
  };

  const handleDeleteRequirement = async (reqId) => {
    if (confirm('Delete this requirement?')) await actions.deleteRecordingRequirement(release.id, reqId);
  };

  const handleDeleteRelease = async () => {
    if (confirm('Delete this release?')) { await actions.deleteRelease(release.id); onBack(); }
  };

  // Phase 3: Handle custom task addition
  const handleAddCustomTask = async () => {
    await actions.addReleaseCustomTask(release.id, newCustomTask);
    setNewCustomTask({ title: '', date: '', description: '', estimatedCost: 0, status: 'Not Started' });
    setShowAddCustomTask(false);
  };

  const getSongTitle = (songId) => {
    const song = data.songs.find(s => s.id === songId);
    return song ? song.title : '(Unknown Song)';
  };
  
  // Tier 1.2: Get linked songs for Display Information
  const linkedSongs = useMemo(() => {
    const songIds = new Set(currentRelease.attachedSongIds || []);
    // Also include songs from required recordings
    (currentRelease.requiredRecordings || []).forEach(req => {
      if (req.songId) songIds.add(req.songId);
    });
    return (data.songs || []).filter(s => songIds.has(s.id));
  }, [currentRelease, data.songs]);
  
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
  
  // Get unique task categories for filter dropdown
  const taskCategories = useMemo(() => {
    const categories = new Set();
    (currentRelease.tasks || []).forEach(t => t.category && categories.add(t.category));
    return Array.from(categories);
  }, [currentRelease.tasks]);
  
  // Tier 1.3: Filtered and sorted release tasks
  const filteredReleaseTasks = useMemo(() => {
    let tasks = [...(currentRelease.tasks || [])];
    if (taskFilterStatus !== 'all') {
      tasks = tasks.filter(t => t.status === taskFilterStatus);
    }
    if (taskFilterCategory !== 'all') {
      tasks = tasks.filter(t => t.category === taskFilterCategory);
    }
    tasks.sort((a, b) => {
      const valA = a[taskSortBy] || '';
      const valB = b[taskSortBy] || '';
      return taskSortDir === 'asc' 
        ? (valA < valB ? -1 : valA > valB ? 1 : 0)
        : (valA > valB ? -1 : valA < valB ? 1 : 0);
    });
    return tasks;
  }, [currentRelease.tasks, taskFilterStatus, taskFilterCategory, taskSortBy, taskSortDir]);

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className={cn("px-4 py-2 bg-white flex items-center gap-2", THEME.punk.btn)}><Icon name="ChevronLeft" size={16} /> Back to Releases</button>
        <button onClick={handleDeleteRelease} className={cn("px-4 py-2", THEME.punk.btn, "bg-red-500 text-white")}><Icon name="Trash2" size={16} /></button>
      </div>

      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Release Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Name</label>
            <input value={form.name || ''} onChange={e => handleFieldChange('name', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Type</label>
            <select value={form.type || 'Album'} onChange={e => { handleFieldChange('type', e.target.value); }} onBlur={handleSave} className={cn("w-full", THEME.punk.input)}>
              {RELEASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Release Date</label>
            <input type="date" value={form.releaseDate || ''} onChange={e => handleFieldChange('releaseDate', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Exclusive Availability</label>
            <select value={form.exclusiveType || 'None'} onChange={e => handleFieldChange('exclusiveType', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)}>
              {EXCLUSIVITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Exclusive Start Date</label>
            <input type="date" value={form.exclusiveStartDate || ''} onChange={e => handleFieldChange('exclusiveStartDate', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Exclusive End Date</label>
            <input type="date" value={form.exclusiveEndDate || ''} onChange={e => handleFieldChange('exclusiveEndDate', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          {/* Cost layers with precedence: paidCost > quotedCost > estimatedCost */}
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
              <label className="block text-xs font-bold uppercase mb-1">Partial Payment</label>
              <input type="number" value={form.partially_paid || 0} onChange={e => handleFieldChange('partially_paid', parseFloat(e.target.value) || 0)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
            </div>
            <div className="flex items-center gap-2 font-bold">
              <input type="checkbox" checked={form.hasPhysicalCopies || false} onChange={e => { handleFieldChange('hasPhysicalCopies', e.target.checked); setTimeout(handleSave, 0); }} className="w-5 h-5" />
              Includes Physical Copies
            </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Exclusive Notes</label>
            <input value={form.exclusiveNotes || ''} onChange={e => handleFieldChange('exclusiveNotes', e.target.value)} onBlur={handleSave} placeholder="Platform partners, windows, or audience restrictions" className={cn("w-full", THEME.punk.input)} />
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

      {/* Tier 1.2: Display Information Module - Read-only linked data */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Display Information</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {/* Linked Songs */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Linked Songs</label>
            <div className="space-y-1">
              {linkedSongs.length === 0 ? (
                <span className="text-xs opacity-50">No songs linked</span>
              ) : linkedSongs.map(s => (
                <div key={s.id} className="px-2 py-1 bg-blue-100 border-2 border-black text-xs font-bold">
                  {s.title} ({s.releaseDate || 'TBD'})
                </div>
              ))}
            </div>
          </div>
          {/* Assigned Team Members */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Assigned Team</label>
            <div className="space-y-1">
              {assignedTeamMembers.length === 0 ? (
                <span className="text-xs opacity-50">No team members assigned</span>
              ) : assignedTeamMembers.map(m => (
                <div key={m.id} className="px-2 py-1 bg-purple-100 border-2 border-black text-xs font-bold">
                  {m.name} {m.isMusician && '🎵'}
                </div>
              ))}
            </div>
          </div>
          {/* Summary Stats */}
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Summary</label>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black">
                <span>Songs:</span>
                <span className="font-bold">{linkedSongs.length}</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black">
                <span>Recordings:</span>
                <span className="font-bold">{(currentRelease.requiredRecordings || []).length}</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black">
                <span>Tasks:</span>
                <span className="font-bold">{allReleaseTasks.length}</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-yellow-100 border border-black">
                <span>Progress:</span>
                <span className="font-bold">{releaseProgressValue}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Required Recordings</h3>
          <button onClick={() => setShowAddReq(!showAddReq)} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-black text-white")}>{showAddReq ? 'Cancel' : '+ Add Requirement'}</button>
        </div>

        {showAddReq && (
          <div className="bg-gray-50 p-4 mb-4 border-2 border-black">
            <div className="grid md:grid-cols-4 gap-3">
              <select value={newReq.songId} onChange={e => setNewReq({ ...newReq, songId: e.target.value })} className={cn("w-full", THEME.punk.input)}>
                <option value="">Select Song...</option>
                {(data.songs || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              <select value={newReq.versionType} onChange={e => setNewReq({ ...newReq, versionType: e.target.value })} className={cn("w-full", THEME.punk.input)}>{VERSION_TYPES.map(v => <option key={v} value={v}>{v}</option>)}</select>
              <select value={newReq.status} onChange={e => setNewReq({ ...newReq, status: e.target.value })} className={cn("w-full", THEME.punk.input)}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <button onClick={handleAddRequirement} className={cn("px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>Add</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left">Song</th>
                <th className="p-2 text-left">Version Type</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Notes</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(currentRelease.requiredRecordings || []).length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center opacity-50">No required recordings yet.</td></tr>
              ) : (currentRelease.requiredRecordings || []).map(req => (
                <tr key={req.id} className="border-b border-gray-200">
                  <td className="p-2 font-bold">{getSongTitle(req.songId)}</td>
                  <td className="p-2"><select value={req.versionType || 'Album'} onChange={e => handleUpdateRequirement(req.id, 'versionType', e.target.value)} className="border-2 border-black p-1 text-xs">{VERSION_TYPES.map(v => <option key={v} value={v}>{v}</option>)}</select></td>
                  <td className="p-2"><select value={req.status || 'Not Started'} onChange={e => handleUpdateRequirement(req.id, 'status', e.target.value)} className="border-2 border-black p-1 text-xs">{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td className="p-2"><input value={req.notes || ''} onChange={e => handleUpdateRequirement(req.id, 'notes', e.target.value)} className="border-2 border-black p-1 text-xs w-full" placeholder="Notes..." /></td>
                  <td className="p-2 text-center"><button onClick={() => handleDeleteRequirement(req.id)} className="p-1 hover:bg-red-100 text-red-500"><Icon name="Trash2" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Release Tasks Section - Tier 1.3: Enhanced with Sorting/Filtering */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex flex-wrap justify-between items-center mb-4 border-b-4 border-black pb-2 gap-2">
          <h3 className="font-black uppercase">Release Tasks</h3>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Tier 1.3: Task Filters */}
            <select value={taskFilterStatus} onChange={e => setTaskFilterStatus(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={taskFilterCategory} onChange={e => setTaskFilterCategory(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="all">All Categories</option>
              {taskCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Tier 1.3: Task Sorting */}
            <select value={taskSortBy} onChange={e => setTaskSortBy(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
              <option value="date">Sort by Date</option>
              <option value="type">Sort by Type</option>
              <option value="status">Sort by Status</option>
              <option value="estimatedCost">Sort by Cost</option>
            </select>
            <button onClick={() => setTaskSortDir(taskSortDir === 'asc' ? 'desc' : 'asc')} className={cn("px-2 py-1 text-xs", THEME.punk.btn)}>
              {taskSortDir === 'asc' ? '↑' : '↓'}
            </button>
            <button onClick={() => actions.recalculateReleaseTasksAction(release.id)} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-blue-500 text-white")}>Recalculate from Release Date</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('type'); setTaskSortDir(taskSortBy === 'type' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Type {taskSortBy === 'type' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('date'); setTaskSortDir(taskSortBy === 'date' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Date {taskSortBy === 'date' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-left cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('status'); setTaskSortDir(taskSortBy === 'status' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Status {taskSortBy === 'status' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-right cursor-pointer hover:bg-gray-200" onClick={() => { setTaskSortBy('estimatedCost'); setTaskSortDir(taskSortBy === 'estimatedCost' && taskSortDir === 'asc' ? 'desc' : 'asc'); }}>Est. Cost {taskSortBy === 'estimatedCost' && (taskSortDir === 'asc' ? '↑' : '↓')}</th>
                <th className="p-2 text-left">Assignments</th>
                <th className="p-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredReleaseTasks.length === 0 ? (
                <tr><td colSpan="7" className="p-4 text-center opacity-50">No tasks yet. Set a release date and click Recalculate.</td></tr>
              ) : filteredReleaseTasks.map(task => (
                <tr key={task.id} className="border-b border-gray-200">
                  <td className="p-2 font-bold">{task.type}{task.isOverridden && <span className="text-xs text-orange-500 ml-1">(edited)</span>}</td>
                  <td className="p-2"><span className="px-2 py-1 text-xs bg-gray-200">{task.category}</span></td>
                  <td className="p-2"><input type="date" value={task.date || ''} onChange={e => actions.updateReleaseTask(release.id, task.id, { date: e.target.value })} className="border-2 border-black p-1 text-xs" /></td>
                  <td className="p-2"><select value={task.status || 'Not Started'} onChange={e => actions.updateReleaseTask(release.id, task.id, { status: e.target.value })} className="border-2 border-black p-1 text-xs">{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td className="p-2"><input type="number" value={task.estimatedCost || 0} onChange={e => actions.updateReleaseTask(release.id, task.id, { estimatedCost: parseFloat(e.target.value) || 0 })} className="border-2 border-black p-1 text-xs w-20 text-right" /></td>
                  <td className="p-2 text-xs space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {(task.assignedMembers || []).map(m => {
                        const member = teamMembers.find(tm => tm.id === m.memberId);
                        return <span key={m.memberId + m.cost + (m.instrument || '')} className="px-2 py-1 bg-purple-100 border-2 border-black font-bold text-xs">{member?.name || 'Member'} {m.instrument ? `• ${m.instrument}` : ''} ({formatMoney(m.cost)})</span>;
                      })}
                    </div>
                    <div className="flex gap-1 items-center">
                      <select value={newAssignments[task.id]?.memberId || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), memberId: e.target.value } }))} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
                        <option value="">Assign member</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <input type="number" value={newAssignments[task.id]?.cost || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), cost: e.target.value } }))} placeholder="Cost" className={cn("px-2 py-1 text-xs w-20", THEME.punk.input)} />
                      <input value={newAssignments[task.id]?.instrument || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), instrument: e.target.value } }))} placeholder="Instrument" className={cn("px-2 py-1 text-xs w-28", THEME.punk.input)} />
                      <button onClick={() => addAssignment(task.id, task, (assignedMembers) => actions.updateReleaseTask(release.id, task.id, { assignedMembers }))} className={cn("px-2 py-1 text-xs", THEME.punk.btn, "bg-pink-600 text-white")}>Add</button>
                      {taskBudget(task) > 0 && <span className="text-[10px] font-bold">Remaining: {formatMoney(taskBudget(task) - (task.assignedMembers || []).reduce((s, m) => s + (m.cost || 0), 0))}</span>}
                    </div>
                  </td>
                  <td className="p-2"><input value={task.notes || ''} onChange={e => actions.updateReleaseTask(release.id, task.id, { notes: e.target.value })} className="border-2 border-black p-1 text-xs w-full" placeholder="Notes..." /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phase 3: Attached Songs Section */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Attached Songs</h3>
          <button onClick={() => actions.autoCalculateReleaseDateFromContent(release.id)} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-purple-500 text-white")}>Auto-Calculate Date</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <select onChange={e => { if (e.target.value) actions.attachSongToRelease(release.id, e.target.value); }} className={cn("px-3 py-2 text-xs", THEME.punk.input)} value="">
            <option value="">Attach Song...</option>
            {(data.songs || []).filter(s => !(currentRelease.attachedSongIds || []).includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {(currentRelease.attachedSongIds || []).map(songId => {
            const song = data.songs.find(s => s.id === songId);
            return song ? (
              <span key={songId} className="px-3 py-2 border-2 border-black bg-blue-100 text-sm font-bold flex items-center gap-2">
                {song.title} <span className="text-xs opacity-60">({song.releaseDate || 'No date'})</span>
                <button onClick={() => actions.detachSongFromRelease(release.id, songId)} className="text-red-600 ml-1">×</button>
              </span>
            ) : null;
          })}
          {(currentRelease.attachedSongIds || []).length === 0 && <span className="opacity-50 text-sm">No songs attached yet.</span>}
        </div>
      </div>

      {/* Phase 3: Custom Tasks Section */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Custom Tasks</h3>
          <button onClick={() => setShowAddCustomTask(!showAddCustomTask)} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-black text-white")}>{showAddCustomTask ? 'Cancel' : '+ Add Custom Task'}</button>
        </div>
        {showAddCustomTask && (
          <div className="bg-gray-50 p-4 mb-4 border-2 border-black">
            <div className="grid md:grid-cols-2 gap-3">
              <input value={newCustomTask.title} onChange={e => setNewCustomTask(prev => ({ ...prev, title: e.target.value }))} placeholder="Task Title" className={cn("w-full", THEME.punk.input)} />
              <input type="date" value={newCustomTask.date} onChange={e => setNewCustomTask(prev => ({ ...prev, date: e.target.value }))} className={cn("w-full", THEME.punk.input)} />
              <input value={newCustomTask.description} onChange={e => setNewCustomTask(prev => ({ ...prev, description: e.target.value }))} placeholder="Description" className={cn("w-full", THEME.punk.input)} />
              <input type="number" value={newCustomTask.estimatedCost} onChange={e => setNewCustomTask(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))} placeholder="Estimated Cost" className={cn("w-full", THEME.punk.input)} />
              <select value={newCustomTask.status} onChange={e => setNewCustomTask(prev => ({ ...prev, status: e.target.value }))} className={cn("w-full", THEME.punk.input)}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <button onClick={handleAddCustomTask} className={cn("px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>Add Task</button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {(currentRelease.customTasks || []).length === 0 ? (
            <p className="text-center opacity-50 py-4">No custom tasks yet.</p>
          ) : (currentRelease.customTasks || []).map(task => (
            <div key={task.id} className="flex items-center gap-2 p-3 bg-gray-50 border-2 border-black">
              <div className="flex-1">
                <div className="font-bold">{task.title}</div>
                <div className="text-xs opacity-60">{task.date} | {task.status} | {formatMoney(getEffectiveCost(task))}</div>
                {task.description && <div className="text-sm mt-1">{task.description}</div>}
              </div>
              <button onClick={() => actions.deleteReleaseCustomTask(release.id, task.id)} className="p-2 text-red-500 hover:bg-red-100"><Icon name="Trash2" size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className={cn("p-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Cost Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between"><span>Release Base Cost:</span><span className="font-bold">{formatMoney(getEffectiveCost(currentRelease))}</span></div>
          <div className="flex justify-between"><span>Tasks Total:</span><span className="font-bold">{formatMoney((currentRelease.tasks || []).reduce((sum, t) => sum + getEffectiveCost(t), 0))}</span></div>
          <div className="flex justify-between"><span>Custom Tasks Total:</span><span className="font-bold">{formatMoney((currentRelease.customTasks || []).reduce((sum, t) => sum + getEffectiveCost(t), 0))}</span></div>
          <div className="flex justify-between border-t-4 border-black pt-2 text-lg">
            <span className="font-black">TOTAL:</span>
            <span className="font-black">{formatMoney(getEffectiveCost(currentRelease) + (currentRelease.tasks || []).reduce((sum, t) => sum + getEffectiveCost(t), 0) + (currentRelease.customTasks || []).reduce((sum, t) => sum + getEffectiveCost(t), 0))}</span>
          </div>
        </div>
      </div>
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

    // Events
    (data.events || []).forEach(event => {
      const eventDate = resolvePrimary(event);
      if (eventDate) {
        items.push({
          id: 'event-' + event.id,
          date: eventDate,
          sourceType: 'Event',
          label: event.type || 'Event',
          name: event.title,
          category: 'Event',
          status: null,
          estimatedCost: event.estimatedCost || 0,
          notes: event.description,
          songId: null,
          clickable: true
        });
      }
      
      // Phase 5: Event custom tasks
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
    
    // Events
    (data.events || []).forEach(event => {
      if (filterItemType !== 'all' && filterItemType !== 'event') return;
      const eventCost = getCostValue(event);
      if (eventCost > 0) {
        items.push({
          id: `event-${event.id}`,
          name: event.title,
          source: 'Event',
          sourceId: event.id,
          itemType: 'event',
          estimatedCost: event.estimatedCost || 0,
          quotedCost: event.quotedCost || 0,
          paidCost: event.paidCost || 0,
          effectiveCost: getEffectiveCost(event),
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

  const events = useMemo(() => {
    let filtered = [...(data.events || [])];
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.type === filterType);
    }
    filtered.sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (sortBy === 'estimatedCost') { valA = getEffectiveCost(a); valB = getEffectiveCost(b); }
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
          <div className="flex border-4 border-black">
            <button onClick={() => setViewMode('list')} className={cn("px-3 py-2 font-bold text-xs", viewMode === 'list' ? "bg-black text-white" : "bg-white")} title="List View">
              <Icon name="List" size={16} />
            </button>
            <button onClick={() => setViewMode('grid')} className={cn("px-3 py-2 font-bold text-xs border-l-4 border-black", viewMode === 'grid' ? "bg-black text-white" : "bg-white")} title="Grid View">
              <Icon name="PieChart" size={16} />
            </button>
          </div>
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
                  <div className="flex justify-between"><span className="opacity-60">Est. Cost:</span><span className="font-bold">{formatMoney(getEffectiveCost(event))}</span></div>
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
                <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('estimatedCost')}>Est. Cost <SortIcon field="estimatedCost" /></th>
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
                    <td className="p-3 text-right">{formatMoney(getEffectiveCost(event))}</td>
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
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', date: '', description: '', estimatedCost: 0, status: 'Not Started' });
  const [newAssignments, setNewAssignments] = useState({});
  const [taskFilterStatus, setTaskFilterStatus] = useState('all');

  const teamMembers = useMemo(() => data.teamMembers || [], [data.teamMembers]);

  const addAssignment = (taskKey, taskObj, updater) => {
    const entry = newAssignments[taskKey] || { memberId: '', cost: 0 };
    const updatedMembers = [...(taskObj.assignedMembers || []), { memberId: entry.memberId, cost: parseFloat(entry.cost) || 0 }];
    updater(updatedMembers);
    setNewAssignments(prev => ({ ...prev, [taskKey]: { memberId: '', cost: 0 } }));
  };

  const handleSave = async () => { await actions.updateEvent(event.id, form); };
  const handleFieldChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

  const handleAddCustomTask = async () => {
    await actions.addEventCustomTask(event.id, newTask);
    setNewTask({ title: '', date: '', description: '', estimatedCost: 0, status: 'Not Started' });
    setShowAddTask(false);
  };

  const handleDeleteCustomTask = async (taskId) => {
    if (confirm('Delete this task?')) { await actions.deleteEventCustomTask(event.id, taskId); }
  };

  const handleDeleteEvent = async () => {
    if (confirm('Delete this event?')) { await actions.deleteEvent(event.id); onBack(); }
  };

  const currentEvent = useMemo(() => data.events.find(e => e.id === event.id) || event, [data.events, event]);
  const eventTasks = useMemo(() => currentEvent.tasks || [], [currentEvent.tasks]);
  const eventCustomTasks = useMemo(() => currentEvent.customTasks || [], [currentEvent.customTasks]);
  const allEventTasks = useMemo(() => [...eventTasks, ...eventCustomTasks], [eventTasks, eventCustomTasks]);
  const { progress: eventProgressValue } = calculateTaskProgress(allEventTasks);
  const tasksCost = eventTasks.reduce((sum, t) => sum + getEffectiveCost(t), 0);
  const customTasksCost = eventCustomTasks.reduce((sum, t) => sum + getEffectiveCost(t), 0);
  const totalCost = getEffectiveCost(currentEvent) + tasksCost + customTasksCost;

  const filteredEventTasks = useMemo(() => {
    let tasks = [...eventTasks];
    if (taskFilterStatus !== 'all') {
      tasks = tasks.filter(t => t.status === taskFilterStatus);
    }
    return tasks;
  }, [eventTasks, taskFilterStatus]);

  const assignedTeamMembers = useMemo(() => {
    const memberIds = new Set();
    allEventTasks.forEach(task => {
      (task.assignedMembers || []).forEach(m => memberIds.add(m.memberId));
    });
    return teamMembers.filter(m => memberIds.has(m.id));
  }, [allEventTasks, teamMembers]);

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
            <input value={form.location || ''} onChange={e => handleFieldChange('location', e.target.value)} onBlur={handleSave} placeholder="Venue, City" className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Entry Cost</label>
            <input type="number" value={form.entryCost || 0} onChange={e => handleFieldChange('entryCost', parseFloat(e.target.value) || 0)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Exclusive Type</label>
            <select value={form.exclusiveType || 'None'} onChange={e => handleFieldChange('exclusiveType', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)}>
              {EXCLUSIVITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
          <div className="flex items-center gap-2">
            <span className="px-3 py-2 text-xs font-black bg-yellow-200 border-2 border-black">Progress: {eventProgressValue}%</span>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} placeholder="Event notes..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Description</label>
            <textarea value={form.description || ''} onChange={e => handleFieldChange('description', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} placeholder="Public description..." />
          </div>
        </div>
      </div>

      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Display Information</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Assigned Team</label>
            <div className="space-y-1">
              {assignedTeamMembers.length === 0 ? (
                <span className="text-xs opacity-50">No team members assigned</span>
              ) : assignedTeamMembers.map(m => (
                <div key={m.id} className="px-2 py-1 bg-purple-100 border-2 border-black text-xs font-bold">{m.name}</div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Summary</label>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black"><span>Auto Tasks:</span><span className="font-bold">{eventTasks.length}</span></div>
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black"><span>Custom Tasks:</span><span className="font-bold">{eventCustomTasks.length}</span></div>
              <div className="flex justify-between px-2 py-1 bg-yellow-100 border border-black"><span>Progress:</span><span className="font-bold">{eventProgressValue}%</span></div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Schedule</label>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black"><span>Date:</span><span className="font-bold">{currentEvent.date || 'TBD'}</span></div>
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black"><span>Time:</span><span className="font-bold">{currentEvent.time || 'TBD'}</span></div>
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black"><span>Location:</span><span className="font-bold">{currentEvent.location || 'TBD'}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex flex-wrap justify-between items-center mb-4 border-b-4 border-black pb-2 gap-2">
          <h3 className="font-black uppercase">All Tasks</h3>
          <select value={taskFilterStatus} onChange={e => setTaskFilterStatus(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-right">Est. Cost</th>
                <th className="p-2 text-left">Assignments</th>
              </tr>
            </thead>
            <tbody>
              {filteredEventTasks.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center opacity-50">No tasks yet.</td></tr>
              ) : (
                filteredEventTasks.map(task => (
                  <tr key={task.id} className="border-b border-gray-200 bg-blue-50">
                    <td className="p-2 font-bold">{task.type}</td>
                    <td className="p-2">
                      <input type="date" value={task.date || ''} onChange={e => {
                        const updatedTasks = eventTasks.map(t => t.id === task.id ? { ...t, date: e.target.value } : t);
                        actions.updateEvent(event.id, { tasks: updatedTasks });
                      }} className="border-2 border-black p-1 text-xs" />
                    </td>
                    <td className="p-2">
                      <select value={task.status || 'Not Started'} onChange={e => {
                        const updatedTasks = eventTasks.map(t => t.id === task.id ? { ...t, status: e.target.value } : t);
                        actions.updateEvent(event.id, { tasks: updatedTasks });
                      }} className="border-2 border-black p-1 text-xs">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input type="number" value={task.estimatedCost || 0} onChange={e => {
                        const updatedTasks = eventTasks.map(t => t.id === task.id ? { ...t, estimatedCost: parseFloat(e.target.value) || 0 } : t);
                        actions.updateEvent(event.id, { tasks: updatedTasks });
                      }} className="border-2 border-black p-1 text-xs w-20 text-right" />
                    </td>
                    <td className="p-2 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {(task.assignedMembers || []).map(m => {
                          const member = teamMembers.find(tm => tm.id === m.memberId);
                          return <span key={m.memberId} className="px-2 py-1 bg-purple-100 border-2 border-black font-bold">{member?.name || 'Member'} ({formatMoney(m.cost)})</span>;
                        })}
                      </div>
                      <div className="flex gap-1 items-center mt-1">
                        <select value={newAssignments[task.id]?.memberId || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), memberId: e.target.value } }))} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
                          <option value="">Assign</option>
                          {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <input type="number" value={newAssignments[task.id]?.cost || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), cost: e.target.value } }))} placeholder="$" className={cn("px-2 py-1 text-xs w-16", THEME.punk.input)} />
                        <button onClick={() => addAssignment(task.id, task, (assignedMembers) => {
                          const updatedTasks = eventTasks.map(t => t.id === task.id ? { ...t, assignedMembers } : t);
                          actions.updateEvent(event.id, { tasks: updatedTasks });
                        })} className={cn("px-2 py-1 text-xs", THEME.punk.btn, "bg-pink-600 text-white")}>+</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Custom Tasks</h3>
          <button onClick={() => setShowAddTask(!showAddTask)} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-black text-white")}>{showAddTask ? 'Cancel' : '+ Add Task'}</button>
        </div>
        {showAddTask && (
          <div className="bg-gray-50 p-4 mb-4 border-2 border-black">
            <div className="grid md:grid-cols-2 gap-3">
              <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task Title" className={cn("w-full", THEME.punk.input)} />
              <input type="date" value={newTask.date} onChange={e => setNewTask({ ...newTask, date: e.target.value })} className={cn("w-full", THEME.punk.input)} />
              <input value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Description" className={cn("w-full", THEME.punk.input)} />
              <input type="number" value={newTask.estimatedCost} onChange={e => setNewTask({ ...newTask, estimatedCost: parseFloat(e.target.value) || 0 })} placeholder="Est. Cost" className={cn("w-full", THEME.punk.input)} />
              <select value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })} className={cn("w-full", THEME.punk.input)}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <button onClick={handleAddCustomTask} className={cn("px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>Add Task</button>
            </div>
          </div>
        )}
        {eventCustomTasks.length === 0 ? (
          <p className="text-center opacity-50 py-4">No custom tasks yet.</p>
        ) : (
          <div className="space-y-2">
            {eventCustomTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 p-3 bg-gray-50 border-2 border-black">
                <div className="flex-1">
                  <div className="font-bold">{task.title}</div>
                  <div className="text-xs opacity-60">{task.date} | {task.status} | {formatMoney(task.estimatedCost || 0)}</div>
                </div>
                <button onClick={() => handleDeleteCustomTask(task.id)} className="p-2 text-red-500 hover:bg-red-100"><Icon name="Trash2" size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cn("p-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Cost Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between"><span>Event Base Cost:</span><span className="font-bold">{formatMoney(getEffectiveCost(currentEvent))}</span></div>
          <div className="flex justify-between"><span>Entry Cost:</span><span className="font-bold">{formatMoney(currentEvent.entryCost || 0)}</span></div>
          <div className="flex justify-between"><span>Tasks Total:</span><span className="font-bold">{formatMoney(tasksCost + customTasksCost)}</span></div>
          <div className="flex justify-between border-t-4 border-black pt-2 text-lg"><span className="font-black">TOTAL:</span><span className="font-black">{formatMoney(totalCost + (currentEvent.entryCost || 0))}</span></div>
        </div>
      </div>
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
          <div className="flex border-4 border-black">
            <button onClick={() => setViewMode('list')} className={cn("px-3 py-2 font-bold text-xs", viewMode === 'list' ? "bg-black text-white" : "bg-white")} title="List View"><Icon name="List" size={16} /></button>
            <button onClick={() => setViewMode('grid')} className={cn("px-3 py-2 font-bold text-xs border-l-4 border-black", viewMode === 'grid' ? "bg-black text-white" : "bg-white")} title="Grid View"><Icon name="PieChart" size={16} /></button>
          </div>
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

// Expense Detail View
export const ExpenseDetailView = ({ expense, onBack }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...expense });

  const handleSave = async () => { await actions.updateExpense(expense.id, form); };
  const handleFieldChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

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
            <select value={form.status || 'Complete'} onChange={e => { handleFieldChange('status', e.target.value); setTimeout(handleSave, 0); }} className={cn("w-full", THEME.punk.input)}>
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
            <label className="block text-xs font-bold uppercase mb-1">Paid Amount</label>
            <input type="number" value={form.paidCost || 0} onChange={e => handleFieldChange('paidCost', parseFloat(e.target.value) || 0)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Vendor</label>
            <select value={form.vendorId || ''} onChange={e => { handleFieldChange('vendorId', e.target.value); setTimeout(handleSave, 0); }} className={cn("w-full", THEME.punk.input)}>
              <option value="">No Vendor</option>
              {(data.vendors || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Description</label>
            <textarea value={form.description || ''} onChange={e => handleFieldChange('description', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} placeholder="Expense details..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} placeholder="Additional notes..." />
          </div>
        </div>
      </div>

      <div className={cn("p-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Cost Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between"><span>Estimated:</span><span className="font-bold">{formatMoney(currentExpense.estimatedCost || 0)}</span></div>
          <div className="flex justify-between"><span>Quoted:</span><span className="font-bold">{formatMoney(currentExpense.quotedCost || 0)}</span></div>
          <div className="flex justify-between border-t-4 border-black pt-2 text-lg"><span className="font-black">PAID:</span><span className="font-black text-green-600">{formatMoney(getEffectiveCost(currentExpense))}</span></div>
        </div>
      </div>
    </div>
  );
};


// Videos List View - Following unified Item/Page architecture (same template as Songs/Releases)
export const VideosListView = ({ onSelectVideo }) => {
  const { data, actions } = useStore();
  const [sortBy, setSortBy] = useState('releaseDate');
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

  const videoTypes = [
    { key: 'lyric', label: 'Lyric Video' },
    { key: 'enhancedLyric', label: 'Enhanced Lyric' },
    { key: 'music', label: 'Music Video' },
    { key: 'visualizer', label: 'Visualizer' },
    { key: 'custom', label: 'Custom' }
  ];

  const getVideoTypeLabels = (video) => {
    return videoTypes.filter(t => video.types?.[t.key]).map(t => t.label);
  };

  const videos = useMemo(() => {
    let filtered = [...allVideos];
    if (filterType !== 'all') {
      filtered = filtered.filter(v => v.types?.[filterType]);
    }
    filtered.sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (sortBy === 'estimatedCost') { valA = getEffectiveCost(a); valB = getEffectiveCost(b); }
      if (sortDir === 'asc') { return valA < valB ? -1 : valA > valB ? 1 : 0; }
      else { return valA > valB ? -1 : valA < valB ? 1 : 0; }
    });
    return filtered;
  }, [allVideos, sortBy, sortDir, filterType]);

  const handleAddVideo = async () => {
    const newVideo = await actions.addStandaloneVideo({
      title: 'New Video',
      releaseDate: new Date().toISOString().split('T')[0],
      types: {}
    });
    if (onSelectVideo) onSelectVideo(newVideo);
  };

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Videos</h2>
        <div className="flex flex-wrap gap-2">
          <div className="flex border-4 border-black">
            <button onClick={() => setViewMode('list')} className={cn("px-3 py-2 font-bold text-xs", viewMode === 'list' ? "bg-black text-white" : "bg-white")} title="List View">
              <Icon name="List" size={16} />
            </button>
            <button onClick={() => setViewMode('grid')} className={cn("px-3 py-2 font-bold text-xs border-l-4 border-black", viewMode === 'grid' ? "bg-black text-white" : "bg-white")} title="Grid View">
              <Icon name="PieChart" size={16} />
            </button>
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
            <option value="all">All Types</option>
            {videoTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <button onClick={handleAddVideo} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Video</button>
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
                  <div className="flex justify-between"><span className="opacity-60">Source:</span><span className="font-bold">{video._source === 'song' ? video._songTitle : 'Standalone'}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Date:</span><span className="font-bold">{video.releaseDate || 'TBD'}</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Progress:</span><span className="font-bold">{videoProgress(video)}%</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Est. Cost:</span><span className="font-bold">{formatMoney(getEffectiveCost(video))}</span></div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {getVideoTypeLabels(video).map(label => (
                    <span key={label} className="px-2 py-1 bg-purple-100 text-[10px] font-bold border border-purple-500">{label}</span>
                  ))}
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
                <th className="p-3 text-left">Source</th>
                <th className="p-3 text-left">Types</th>
                <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('releaseDate')}>Date <SortIcon field="releaseDate" /></th>
                <th className="p-3 text-right">Progress</th>
                <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('estimatedCost')}>Est. Cost <SortIcon field="estimatedCost" /></th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 ? (
                <tr><td colSpan="6" className="p-10 text-center opacity-50">No videos yet. Click Add Video to create one.</td></tr>
              ) : (
                videos.map(video => (
                  <tr key={video.id} onClick={() => onSelectVideo && onSelectVideo(video)} className="border-b border-gray-200 hover:bg-yellow-50 cursor-pointer">
                    <td className="p-3 font-bold">{video.title}</td>
                    <td className="p-3">{video._source === 'song' ? video._songTitle : 'Standalone'}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {getVideoTypeLabels(video).map(label => (
                          <span key={label} className="px-2 py-1 bg-purple-100 text-[10px] font-bold border border-purple-500">{label}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">{video.releaseDate || '-'}</td>
                    <td className="p-3 text-right">{videoProgress(video)}%</td>
                    <td className="p-3 text-right">{formatMoney(getEffectiveCost(video))}</td>
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

// Video Detail View - Following unified Item/Page architecture
export const VideoDetailView = ({ video, onBack }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...video });
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', date: '', description: '', estimatedCost: 0, status: 'Not Started' });
  const [taskFilterStatus, setTaskFilterStatus] = useState('all');

  const teamMembers = useMemo(() => data.teamMembers || [], [data.teamMembers]);
  const videoTypes = [
    { key: 'lyric', label: 'Lyric Video' },
    { key: 'enhancedLyric', label: 'Enhanced Lyric' },
    { key: 'music', label: 'Music Video' },
    { key: 'visualizer', label: 'Visualizer' },
    { key: 'custom', label: 'Custom' }
  ];

  const handleSave = async () => {
    if (video._source === 'standalone') {
      await actions.updateStandaloneVideo(video.id, form);
    } else {
      await actions.updateSongVideo(video._songId, video.id, form);
    }
  };

  const handleFieldChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

  const handleAddCustomTask = async () => {
    if (video._source === 'standalone') {
      await actions.addStandaloneVideoCustomTask(video.id, newTask);
    } else {
      await actions.addSongVideoCustomTask(video._songId, video.id, newTask);
    }
    setNewTask({ title: '', date: '', description: '', estimatedCost: 0, status: 'Not Started' });
    setShowAddTask(false);
  };

  const handleDeleteCustomTask = async (taskId) => {
    if (confirm('Delete this task?')) {
      if (video._source === 'standalone') {
        await actions.deleteStandaloneVideoCustomTask(video.id, taskId);
      } else {
        await actions.deleteSongVideoCustomTask(video._songId, video.id, taskId);
      }
    }
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
  const tasksCost = videoTasks.reduce((sum, t) => sum + getEffectiveCost(t), 0);
  const customTasksCost = videoCustomTasks.reduce((sum, t) => sum + getEffectiveCost(t), 0);
  const totalCost = getEffectiveCost(currentVideo) + tasksCost + customTasksCost;

  const filteredVideoTasks = useMemo(() => {
    let tasks = [...videoTasks];
    if (taskFilterStatus !== 'all') tasks = tasks.filter(t => t.status === taskFilterStatus);
    return tasks;
  }, [videoTasks, taskFilterStatus]);

  const assignedTeamMembers = useMemo(() => {
    const memberIds = new Set();
    allVideoTasks.forEach(task => {
      (task.assignedMembers || []).forEach(m => memberIds.add(m.memberId));
    });
    return teamMembers.filter(m => memberIds.has(m.id));
  }, [allVideoTasks, teamMembers]);

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

      {/* Basic Information */}
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
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Video Types</label>
            <div className="flex flex-wrap gap-3">
              {videoTypes.map(type => (
                <label key={type.key} className="flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    checked={form.types?.[type.key] || false} 
                    onChange={e => {
                      const newTypes = { ...(form.types || {}), [type.key]: e.target.checked };
                      handleFieldChange('types', newTypes);
                      setTimeout(handleSave, 0);
                    }} 
                    className="w-4 h-4"
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Exclusive Type</label>
            <select value={form.exclusiveType || 'None'} onChange={e => handleFieldChange('exclusiveType', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)}>
              {EXCLUSIVITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Platforms</label>
            <input value={(form.platforms || []).join(', ')} onChange={e => handleFieldChange('platforms', e.target.value.split(',').map(v => v.trim()).filter(Boolean))} onBlur={handleSave} placeholder="YouTube, Vimeo, etc." className={cn("w-full", THEME.punk.input)} />
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
          <div className="flex items-center gap-2">
            <span className="px-3 py-2 text-xs font-black bg-yellow-200 border-2 border-black">Progress: {videoProgressValue}%</span>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} placeholder="Video notes..." />
          </div>
        </div>
      </div>

      {/* Display Information */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Display Information</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Assigned Team</label>
            <div className="space-y-1">
              {assignedTeamMembers.length === 0 ? (
                <span className="text-xs opacity-50">No team members assigned</span>
              ) : assignedTeamMembers.map(m => (
                <div key={m.id} className="px-2 py-1 bg-purple-100 border-2 border-black text-xs font-bold">{m.name}</div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Summary</label>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black"><span>Auto Tasks:</span><span className="font-bold">{videoTasks.length}</span></div>
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black"><span>Custom Tasks:</span><span className="font-bold">{videoCustomTasks.length}</span></div>
              <div className="flex justify-between px-2 py-1 bg-yellow-100 border border-black"><span>Progress:</span><span className="font-bold">{videoProgressValue}%</span></div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Source</label>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black"><span>Type:</span><span className="font-bold">{video._source === 'song' ? 'Song Video' : 'Standalone'}</span></div>
              {video._source === 'song' && (
                <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black"><span>Song:</span><span className="font-bold">{video._songTitle}</span></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Module */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex flex-wrap justify-between items-center mb-4 border-b-4 border-black pb-2 gap-2">
          <h3 className="font-black uppercase">Tasks</h3>
          <select value={taskFilterStatus} onChange={e => setTaskFilterStatus(e.target.value)} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-right">Est. Cost</th>
                <th className="p-2 text-left">Assignments</th>
              </tr>
            </thead>
            <tbody>
              {filteredVideoTasks.length === 0 ? (
                <tr><td colSpan="5" className="p-4 text-center opacity-50">No auto-generated tasks yet.</td></tr>
              ) : (
                filteredVideoTasks.map(task => (
                  <tr key={task.id} className="border-b border-gray-200 bg-blue-50">
                    <td className="p-2 font-bold">{task.type}</td>
                    <td className="p-2">{task.date || '-'}</td>
                    <td className="p-2">
                      <select value={task.status || 'Not Started'} onChange={e => {
                        const updatedTasks = videoTasks.map(t => t.id === task.id ? { ...t, status: e.target.value } : t);
                        if (video._source === 'standalone') {
                          actions.updateStandaloneVideo(video.id, { tasks: updatedTasks });
                        } else {
                          actions.updateSongVideo(video._songId, video.id, { tasks: updatedTasks });
                        }
                      }} className="border-2 border-black p-1 text-xs">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-2 text-right">{formatMoney(task.estimatedCost || 0)}</td>
                    <td className="p-2 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {(task.assignedMembers || []).map(m => {
                          const member = teamMembers.find(tm => tm.id === m.memberId);
                          return <span key={m.memberId} className="px-2 py-1 bg-purple-100 border-2 border-black font-bold">{member?.name || 'Member'}</span>;
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Tasks */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Custom Tasks</h3>
          <button onClick={() => setShowAddTask(!showAddTask)} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-black text-white")}>{showAddTask ? 'Cancel' : '+ Add Task'}</button>
        </div>
        {showAddTask && (
          <div className="bg-gray-50 p-4 mb-4 border-2 border-black">
            <div className="grid md:grid-cols-2 gap-3">
              <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task Title" className={cn("w-full", THEME.punk.input)} />
              <input type="date" value={newTask.date} onChange={e => setNewTask({ ...newTask, date: e.target.value })} className={cn("w-full", THEME.punk.input)} />
              <input value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Description" className={cn("w-full", THEME.punk.input)} />
              <input type="number" value={newTask.estimatedCost} onChange={e => setNewTask({ ...newTask, estimatedCost: parseFloat(e.target.value) || 0 })} placeholder="Est. Cost" className={cn("w-full", THEME.punk.input)} />
              <select value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })} className={cn("w-full", THEME.punk.input)}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <button onClick={handleAddCustomTask} className={cn("px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>Add Task</button>
            </div>
          </div>
        )}
        {videoCustomTasks.length === 0 ? (
          <p className="text-center opacity-50 py-4">No custom tasks yet.</p>
        ) : (
          <div className="space-y-2">
            {videoCustomTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 p-3 bg-gray-50 border-2 border-black">
                <div className="flex-1">
                  <div className="font-bold">{task.title}</div>
                  <div className="text-xs opacity-60">{task.date} | {task.status} | {formatMoney(task.estimatedCost || 0)}</div>
                </div>
                <button onClick={() => handleDeleteCustomTask(task.id)} className="p-2 text-red-500 hover:bg-red-100"><Icon name="Trash2" size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cost Summary */}
      <div className={cn("p-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Cost Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between"><span>Video Base Cost:</span><span className="font-bold">{formatMoney(getEffectiveCost(currentVideo))}</span></div>
          <div className="flex justify-between"><span>Tasks Total:</span><span className="font-bold">{formatMoney(tasksCost + customTasksCost)}</span></div>
          <div className="flex justify-between border-t-4 border-black pt-2 text-lg"><span className="font-black">TOTAL:</span><span className="font-black">{formatMoney(totalCost)}</span></div>
        </div>
      </div>
    </div>
  );
};

// Global Tasks List View - Following unified Item/Page architecture (same template as Songs/Releases)
export const GlobalTasksListView = ({ onSelectTask }) => {
  const { data, actions } = useStore();
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArchived, setFilterArchived] = useState('active');
  const [viewMode, setViewMode] = useState('list');

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => (
    <span>{sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
  );

  const allCategories = useMemo(() => {
    const legacyCategories = GLOBAL_TASK_CATEGORIES.map(name => ({ id: `legacy-${name}`, name, isLegacy: true }));
    const itemCategories = (data.taskCategories || []).map(c => ({ ...c, isLegacy: false }));
    const merged = [];
    const nameSet = new Set();
    itemCategories.forEach(c => { merged.push(c); nameSet.add(c.name); });
    legacyCategories.forEach(c => { if (!nameSet.has(c.name)) merged.push(c); });
    return merged;
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
          <div className="flex border-4 border-black">
            <button onClick={() => setViewMode('list')} className={cn("px-3 py-2 font-bold text-xs", viewMode === 'list' ? "bg-black text-white" : "bg-white")} title="List View">
              <Icon name="List" size={16} />
            </button>
            <button onClick={() => setViewMode('grid')} className={cn("px-3 py-2 font-bold text-xs border-l-4 border-black", viewMode === 'grid' ? "bg-black text-white" : "bg-white")} title="Grid View">
              <Icon name="PieChart" size={16} />
            </button>
          </div>
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
          <button onClick={handleAddTask} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Task</button>
        </div>
      </div>

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
                  <tr key={task.id} className={cn("border-b border-gray-200 hover:bg-yellow-50", task.isArchived && "opacity-50")}>
                    <td className="p-3 font-bold cursor-pointer" onClick={() => onSelectTask && onSelectTask(task)}>{task.taskName}</td>
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

// Global Task Detail View - Following unified Item/Page architecture
export const GlobalTaskDetailView = ({ task, onBack }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...task });
  const [newAssignments, setNewAssignments] = useState({ memberId: '', cost: 0 });

  const teamMembers = useMemo(() => data.teamMembers || [], [data.teamMembers]);
  const allCategories = useMemo(() => {
    const legacyCategories = GLOBAL_TASK_CATEGORIES.map(name => ({ id: `legacy-${name}`, name, isLegacy: true }));
    const itemCategories = (data.taskCategories || []).map(c => ({ ...c, isLegacy: false }));
    const merged = [];
    const nameSet = new Set();
    itemCategories.forEach(c => { merged.push(c); nameSet.add(c.name); });
    legacyCategories.forEach(c => { if (!nameSet.has(c.name)) merged.push(c); });
    return merged;
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

      {/* Basic Information */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Task Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Task Name</label>
            <input value={form.taskName || ''} onChange={e => handleFieldChange('taskName', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Category</label>
            <select value={form.category || 'Other'} onChange={e => { handleFieldChange('category', e.target.value); setTimeout(handleSave, 0); }} className={cn("w-full", THEME.punk.input)}>
              {allCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Date</label>
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
            <label className="block text-xs font-bold uppercase mb-1">Assigned To</label>
            <input value={form.assignedTo || ''} onChange={e => handleFieldChange('assignedTo', e.target.value)} onBlur={handleSave} placeholder="Person name" className={cn("w-full", THEME.punk.input)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Description</label>
            <textarea value={form.description || ''} onChange={e => handleFieldChange('description', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} placeholder="Task description..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} placeholder="Additional notes..." />
          </div>
        </div>
      </div>

      {/* Display Information */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Display Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Assigned Team Members</label>
            <div className="space-y-1 mb-3">
              {(form.assignedMembers || []).length === 0 ? (
                <span className="text-xs opacity-50">No team members assigned</span>
              ) : (form.assignedMembers || []).map((m, index) => {
                const member = teamMembers.find(tm => tm.id === m.memberId);
                return (
                  <div key={index} className="flex justify-between items-center px-2 py-1 bg-purple-100 border-2 border-black">
                    <span className="text-xs font-bold">{member?.name || 'Member'} ({formatMoney(m.cost)})</span>
                    <button onClick={() => removeAssignment(index)} className="text-red-500 text-xs">✕</button>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <select value={newAssignments.memberId} onChange={e => setNewAssignments(prev => ({ ...prev, memberId: e.target.value }))} className={cn("flex-1 text-xs", THEME.punk.input)}>
                <option value="">Assign member</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input type="number" value={newAssignments.cost} onChange={e => setNewAssignments(prev => ({ ...prev, cost: e.target.value }))} placeholder="$" className={cn("w-20 text-xs", THEME.punk.input)} />
              <button onClick={addAssignment} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-pink-600 text-white")}>+</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Summary</label>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black"><span>Category:</span><span className="font-bold">{currentTask.category}</span></div>
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black"><span>Status:</span><span className="font-bold">{currentTask.status}</span></div>
              <div className="flex justify-between px-2 py-1 bg-gray-100 border border-black"><span>Due Date:</span><span className="font-bold">{currentTask.date || 'TBD'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className={cn("p-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Cost Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between"><span>Estimated:</span><span className="font-bold">{formatMoney(currentTask.estimatedCost || 0)}</span></div>
          <div className="flex justify-between"><span>Quoted:</span><span className="font-bold">{formatMoney(currentTask.quotedCost || 0)}</span></div>
          <div className="flex justify-between border-t-4 border-black pt-2 text-lg"><span className="font-black">PAID:</span><span className="font-black text-green-600">{formatMoney(getEffectiveCost(currentTask))}</span></div>
        </div>
      </div>
    </div>
  );
};
