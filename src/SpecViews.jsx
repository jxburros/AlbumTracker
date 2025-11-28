import { useState, useMemo } from 'react';
import { useStore, STATUS_OPTIONS, SONG_CATEGORIES, RELEASE_TYPES, VERSION_TYPES, GLOBAL_TASK_CATEGORIES, EXCLUSIVITY_OPTIONS, getEffectiveCost } from './Store';
import { THEME, formatMoney, cn } from './utils';
import { Icon } from './Components';

// Song List View (Spec 2.1)
export const SongListView = ({ onSelectSong }) => {
  const { data, actions } = useStore();
  const [sortBy, setSortBy] = useState('releaseDate');
  const [sortDir, setSortDir] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSingles, setFilterSingles] = useState(false);

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
    const newSong = await actions.addSong({ title: 'New Song', category: 'Album', releaseDate: '', isSingle: false, videoType: 'None' });
    if (onSelectSong) onSelectSong(newSong);
  };

  const toggleSort = (field) => {
    if (sortBy === field) { setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }
    else { setSortBy(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => (<span className="ml-1 text-xs">{sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>);

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Songs</h2>
        <div className="flex flex-wrap gap-2">
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
      <div className={cn("overflow-x-auto", THEME.punk.card)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('title')}>Title <SortIcon field="title" /></th>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('category')}>Category <SortIcon field="category" /></th>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort('releaseDate')}>Release Date <SortIcon field="releaseDate" /></th>
              <th className="p-3 text-center">Single?</th>
              <th className="p-3 text-left">Video Type</th>
              <th className="p-3 text-left">Exclusive</th>
              <th className="p-3 text-center">Stems?</th>
              <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('estimatedCost')}>Est. Cost <SortIcon field="estimatedCost" /></th>
            </tr>
          </thead>
          <tbody>
            {songs.length === 0 ? (
              <tr><td colSpan="7" className="p-10 text-center opacity-50">No songs yet. Click Add Song to create one.</td></tr>
            ) : (
              songs.map(song => (
                <tr key={song.id} onClick={() => onSelectSong && onSelectSong(song)} className="border-b border-gray-200 hover:bg-yellow-50 cursor-pointer">
                  <td className="p-3 font-bold">{song.title}</td>
                  <td className="p-3">{song.category}</td>
                  <td className="p-3">{song.releaseDate || '-'}</td>
                  <td className="p-3 text-center">{song.isSingle ? 'Yes' : 'No'}</td>
                  <td className="p-3">{song.videoType}</td>
                  <td className="p-3">{song.exclusiveType && song.exclusiveType !== 'None' ? song.exclusiveType : '-'}</td>
                  <td className="p-3 text-center">{song.stemsNeeded ? 'Yes' : 'No'}</td>
                  <td className="p-3 text-right">{formatMoney(song.estimatedCost || 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Song Detail View (Spec 2.2)
export const SongDetailView = ({ song, onBack }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...song });
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', date: '', description: '', estimatedCost: 0, status: 'Not Started', notes: '' });
  const [newVersionName, setNewVersionName] = useState('Template Version');
  const [newSongMusician, setNewSongMusician] = useState({ memberId: '', instruments: '' });
  const [newVersionMusicians, setNewVersionMusicians] = useState({});
  const [newAssignments, setNewAssignments] = useState({});

  const teamMembers = data.teamMembers || [];

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
    if (budget > 0 && nextTotal > budget) return; // prevent over-allocation
    const updatedMembers = [...(taskObj.assignedMembers || []), { memberId: entry.memberId, cost: parseFloat(entry.cost) || 0 }];
    updater(updatedMembers);
    setNewAssignments(prev => ({ ...prev, [taskKey]: { memberId: '', cost: 0 } }));
  };

  const handleSave = async () => { await actions.updateSong(song.id, form); };
  const handleFieldChange = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); };

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

  const currentSong = data.songs.find(s => s.id === song.id) || song;
  const songTasks = currentSong.deadlines || [];
  const songCustomTasks = currentSong.customTasks || [];
  // Use getEffectiveCost for proper cost precedence (paid > quoted > estimated)
  const tasksCost = songTasks.reduce((sum, d) => sum + getEffectiveCost(d), 0);
  const customTasksCost = songCustomTasks.reduce((sum, t) => sum + getEffectiveCost(t), 0);
  const totalCost = getEffectiveCost(currentSong) + tasksCost + customTasksCost;

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

      {/* Basic Information Section (2.2.1) */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Basic Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Title</label>
            <input value={form.title || ''} onChange={e => handleFieldChange('title', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Category</label>
            <select value={form.category || 'Album'} onChange={e => { handleFieldChange('category', e.target.value); }} onBlur={handleSave} className={cn("w-full", THEME.punk.input)}>
              {SONG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Release Date</label>
            <input type="date" value={form.releaseDate || ''} onChange={e => handleFieldChange('releaseDate', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Core Release</label>
            <select value={form.coreReleaseId || ''} onChange={e => handleFieldChange('coreReleaseId', e.target.value)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)}>
              <option value="">Select Release</option>
              {(data.releases || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" checked={form.isSingle || false} onChange={e => { handleFieldChange('isSingle', e.target.checked); setTimeout(handleSave, 0); }} className="w-5 h-5" />
              Is Single
            </label>
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" checked={form.stemsNeeded || false} onChange={e => { handleFieldChange('stemsNeeded', e.target.checked); setTimeout(handleSave, 0); }} className="w-5 h-5" />
              Stems Needed
            </label>
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
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Exclusive Notes</label>
            <input value={form.exclusiveNotes || ''} onChange={e => handleFieldChange('exclusiveNotes', e.target.value)} onBlur={handleSave} placeholder="Platform names, time windows, etc." className={cn("w-full", THEME.punk.input)} />
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
        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase mb-1">Core Instruments</label>
          <input value={(form.instruments || []).join(', ')} onChange={e => handleFieldChange('instruments', e.target.value.split(',').map(i => i.trim()).filter(Boolean))} onBlur={handleSave} placeholder="guitar, synth, drums" className={cn("w-full", THEME.punk.input)} />
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase">Song Musicians</label>
            <span className="text-[10px] font-black">Linked players + instruments</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            <select value={newSongMusician.memberId} onChange={e => setNewSongMusician({ ...newSongMusician, memberId: e.target.value })} className={cn("px-3 py-2 text-xs", THEME.punk.input)}>
              <option value="">Select Team Member</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input value={newSongMusician.instruments} onChange={e => setNewSongMusician({ ...newSongMusician, instruments: e.target.value })} placeholder="instruments (comma separated)" className={cn("px-3 py-2 text-xs", THEME.punk.input)} />
            <button onClick={() => {
              if (!newSongMusician.memberId) return;
              actions.addSongMusician(song.id, { id: crypto.randomUUID(), memberId: newSongMusician.memberId, instruments: (newSongMusician.instruments || '').split(',').map(i => i.trim()).filter(Boolean) });
              setNewSongMusician({ memberId: '', instruments: '' });
            }} className={cn("px-3 py-2 text-xs", THEME.punk.btn, "bg-black text-white")}>Add Musician</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(currentSong.musicians || []).map(m => {
              const member = teamMembers.find(tm => tm.id === m.memberId);
              return (
                <span key={m.id} className="px-2 py-1 border-2 border-black bg-yellow-100 text-xs font-bold flex items-center gap-2">
                  {member?.name || 'Member'} — {(m.instruments || []).join(', ')}
                  <button onClick={() => actions.removeSongMusician(song.id, m.id)} className="text-red-600">×</button>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>

      {/* Versions - Phase 1: Enhanced with video types, tasks, availability windows */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Versions & Releases</h3>
          <div className="flex gap-2">
            <input value={newVersionName} onChange={e => setNewVersionName(e.target.value)} className={cn("px-3 py-2 text-xs", THEME.punk.input)} />
            <button onClick={() => actions.addSongVersion(song.id, { name: newVersionName, releaseDate: currentSong.releaseDate })} className={cn("px-3 py-2 text-xs", THEME.punk.btn, "bg-black text-white")}>Generate Template Version</button>
          </div>
        </div>
        <div className="space-y-4">
          {(currentSong.versions || []).map(v => (
            <div key={v.id} className={cn("p-4 border-2 border-black", v.id === 'core' ? 'bg-yellow-50' : 'bg-white')}>
              <div className="flex flex-wrap gap-3 items-center mb-3">
                <input value={v.name} onChange={e => actions.updateSongVersion(song.id, v.id, { name: e.target.value })} className={cn("px-2 py-1 text-sm font-bold", THEME.punk.input)} />
                {v.id !== 'core' && (
                  <button onClick={() => { if (confirm('Delete this version?')) actions.deleteSongVersion(song.id, v.id); }} className="p-1 text-red-500 hover:bg-red-100"><Icon name="Trash2" size={14} /></button>
                )}
                {v.id === 'core' && <span className="px-2 py-1 bg-yellow-200 text-xs font-bold border border-black">CORE</span>}
              </div>
              
              {/* Availability Windows */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
                <div>
                  <label className="block font-bold uppercase mb-1">Release Date</label>
                  <input type="date" value={v.releaseDate || ''} onChange={e => actions.updateSongVersion(song.id, v.id, { releaseDate: e.target.value })} className={cn("w-full px-2 py-1", THEME.punk.input)} />
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">Exclusive Type</label>
                  <select value={v.exclusiveType || 'None'} onChange={e => actions.updateSongVersion(song.id, v.id, { exclusiveType: e.target.value })} className={cn("w-full px-2 py-1", THEME.punk.input)}>
                    {EXCLUSIVITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">Excl. Start</label>
                  <input type="date" value={v.exclusiveStartDate || ''} onChange={e => actions.updateSongVersion(song.id, v.id, { exclusiveStartDate: e.target.value })} className={cn("w-full px-2 py-1", THEME.punk.input)} />
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">Excl. End</label>
                  <input type="date" value={v.exclusiveEndDate || ''} onChange={e => actions.updateSongVersion(song.id, v.id, { exclusiveEndDate: e.target.value })} className={cn("w-full px-2 py-1", THEME.punk.input)} />
                </div>
              </div>
              
              {/* Video Type Checkboxes - Phase 1 */}
              <div className="mb-3 p-2 bg-gray-50 border border-black">
                <div className="text-xs font-bold uppercase mb-2">Video Types</div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {[
                    { key: 'lyric', label: 'Lyric Video' },
                    { key: 'enhancedLyric', label: 'Enhanced Lyric' },
                    { key: 'music', label: 'Music Video' },
                    { key: 'visualizer', label: 'Visualizer' },
                    { key: 'custom', label: 'Custom' }
                  ].map(type => (
                    <label key={type.key} className="flex items-center gap-1">
                      <input 
                        type="checkbox" 
                        checked={v.videoTypes?.[type.key] || false} 
                        onChange={e => actions.updateSongVersion(song.id, v.id, { 
                          videoTypes: { ...(v.videoTypes || {}), [type.key]: e.target.checked } 
                        })} 
                        className="w-4 h-4"
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Instruments */}
              <div className="mb-3">
                <label className="block text-xs font-bold uppercase mb-1">Instruments</label>
                <input value={(v.instruments || []).join(', ')} onChange={e => actions.updateSongVersion(song.id, v.id, { instruments: e.target.value.split(',').map(i => i.trim()).filter(Boolean) })} className={cn("w-full px-2 py-1 text-sm", THEME.punk.input)} placeholder="guitar, synth, drums" />
              </div>
              
              {/* Multi-release linking */}
              <div className="flex flex-wrap gap-2 items-center text-xs mb-3">
                <span className="font-bold">Releases:</span>
                <select onChange={e => actions.attachVersionToRelease(song.id, v.id, e.target.value, data.releases.find(r => r.id === e.target.value)?.releaseDate)} className={cn("px-2 py-1 text-xs", THEME.punk.input)} value="">
                  <option value="">Attach to release...</option>
                  {(data.releases || []).filter(r => !(v.releaseIds || []).includes(r.id)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                {(v.releaseIds || []).map(rid => {
                  const rel = data.releases.find(r => r.id === rid);
                  const overrideDate = v.releaseOverrides?.[rid];
                  return (
                    <span key={rid} className="px-2 py-1 border-2 border-black bg-yellow-100 font-bold flex items-center gap-1">
                      {rel?.name || 'Release'} — {overrideDate || rel?.releaseDate || 'TBD'}
                      <button onClick={() => actions.detachVersionFromRelease(song.id, v.id, rid)} className="text-red-600 hover:bg-red-100 ml-1" title="Unlink release">×</button>
                    </span>
                  );
                })}
              </div>
              
              {/* Musicians */}
              <div className="mb-3">
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
              
              {/* Version Tasks (for non-core versions) */}
              {v.id !== 'core' && (v.tasks || []).length > 0 && (
                <div className="mt-3 border-t border-black pt-3">
                  <div className="text-xs font-bold uppercase mb-2">Version Tasks</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-1 text-left">Type</th>
                          <th className="p-1 text-left">Date</th>
                          <th className="p-1 text-left">Status</th>
                          <th className="p-1 text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(v.tasks || []).map(task => (
                          <tr key={task.id} className="border-b border-gray-200">
                            <td className="p-1 font-bold">{task.type}</td>
                            <td className="p-1">
                              <input type="date" value={task.date || ''} onChange={e => actions.updateVersionTask(song.id, v.id, task.id, { date: e.target.value })} className="border border-black p-1 text-xs w-28" />
                            </td>
                            <td className="p-1">
                              <select value={task.status || 'Not Started'} onChange={e => actions.updateVersionTask(song.id, v.id, task.id, { status: e.target.value })} className="border border-black p-1 text-xs">
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className="p-1 text-right">
                              <input type="number" value={task.estimatedCost || 0} onChange={e => actions.updateVersionTask(song.id, v.id, task.id, { estimatedCost: parseFloat(e.target.value) || 0 })} className="border border-black p-1 text-xs w-16 text-right" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Song Tasks Section - Auto-generated tasks based on release date */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Song Tasks</h3>
          <button onClick={handleRecalculateDeadlines} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-blue-500 text-white")}>Recalculate from Release Date</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-right">Est. Cost</th>
                <th className="p-2 text-left">Assignments</th>
                <th className="p-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {songTasks.length === 0 ? (
                <tr><td colSpan="7" className="p-4 text-center opacity-50">No tasks yet. Set a release date and click Recalculate.</td></tr>
              ) : songTasks.map(task => (
                <tr key={task.id} className="border-b border-gray-200">
                  <td className="p-2 font-bold">{task.type}{task.isOverridden && <span className="text-xs text-orange-500 ml-1">(edited)</span>}</td>
                  <td className="p-2"><span className="px-2 py-1 text-xs bg-gray-200">{task.category || '-'}</span></td>
                  <td className="p-2"><input type="date" value={task.date || ''} onChange={e => handleDeadlineChange(task.id, 'date', e.target.value)} className="border-2 border-black p-1 text-xs" /></td>
                  <td className="p-2"><select value={task.status || 'Not Started'} onChange={e => handleDeadlineChange(task.id, 'status', e.target.value)} className="border-2 border-black p-1 text-xs">{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td className="p-2"><input type="number" value={task.estimatedCost || 0} onChange={e => handleDeadlineChange(task.id, 'estimatedCost', parseFloat(e.target.value) || 0)} className="border-2 border-black p-1 text-xs w-20 text-right" /></td>
                  <td className="p-2 text-xs space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {(task.assignedMembers || []).map(m => {
                        const member = teamMembers.find(tm => tm.id === m.memberId);
                        return <span key={m.memberId + m.cost} className="px-2 py-1 bg-purple-100 border-2 border-black font-bold">{member?.name || 'Member'} ({formatMoney(m.cost)})</span>;
                      })}
                    </div>
                    <div className="flex gap-1 items-center">
                      <select value={newAssignments[task.id]?.memberId || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), memberId: e.target.value } }))} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
                        <option value="">Assign member</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <input type="number" value={newAssignments[task.id]?.cost || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), cost: e.target.value } }))} placeholder="Cost" className={cn("px-2 py-1 text-xs w-20", THEME.punk.input)} />
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
                        return <span key={m.memberId + m.cost} className="px-2 py-1 border-2 border-black bg-purple-100 text-xs font-bold">{member?.name || 'Member'} ({formatMoney(m.cost)})</span>;
                      })}
                    </div>
                    <div className="flex gap-1 items-center">
                      <select value={newAssignments[task.id]?.memberId || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), memberId: e.target.value } }))} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
                        <option value="">Assign member</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <input type="number" value={newAssignments[task.id]?.cost || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), cost: e.target.value } }))} placeholder="Cost" className={cn("px-2 py-1 text-xs w-20", THEME.punk.input)} />
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

      {/* Cost Summary (2.2.4) */}
      <div className={cn("p-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Cost Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between"><span>Song Base Cost:</span><span className="font-bold">{formatMoney(getEffectiveCost(currentSong))}</span></div>
          <div className="flex justify-between"><span>Song Tasks Total:</span><span className="font-bold">{formatMoney(tasksCost)}</span></div>
          <div className="flex justify-between"><span>Custom Tasks Total:</span><span className="font-bold">{formatMoney(customTasksCost)}</span></div>
          <div className="flex justify-between border-t-4 border-black pt-2 text-lg"><span className="font-black">TOTAL:</span><span className="font-black">{formatMoney(totalCost)}</span></div>
        </div>
      </div>
    </div>
  );
};

// Global Tasks View (Spec 2.3) - Phase 4: Enhanced with archived/done filtering
export const GlobalTasksView = () => {
  const { data, actions } = useStore();
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArchived, setFilterArchived] = useState('active'); // 'all', 'active', 'archived', 'done'
  const [searchText, setSearchText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({ taskName: '', category: 'Other', date: '', description: '', assignedTo: '', status: 'Not Started', estimatedCost: 0, notes: '' });
  const [newAssignments, setNewAssignments] = useState({});

  const teamMembers = data.teamMembers || [];

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
    
    if (filterCategory !== 'all') filtered = filtered.filter(t => t.category === filterCategory);
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

  return (
    <div className="p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>Global Tasks</h2>
        <button onClick={() => setShowAddForm(!showAddForm)} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>{showAddForm ? 'Cancel' : '+ Add Task'}</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search tasks..." className={cn("px-3 py-2 flex-1 min-w-[200px]", THEME.punk.input)} />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
          <option value="all">All Categories</option>
          {GLOBAL_TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
            <select value={newTask.category} onChange={e => setNewTask({ ...newTask, category: e.target.value })} className={cn("w-full", THEME.punk.input)}>{GLOBAL_TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
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
              <select value={editingTask.category} onChange={e => setEditingTask({ ...editingTask, category: e.target.value })} className={cn("w-full", THEME.punk.input)}>{GLOBAL_TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
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
                      return <span key={m.memberId + m.cost} className="px-2 py-1 border-2 border-black bg-purple-100 font-bold">{member?.name || 'Member'} ({formatMoney(m.cost)})</span>;
                    })}
                  </div>
                  <div className="flex gap-1 items-center">
                    <select value={newAssignments[task.id]?.memberId || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), memberId: e.target.value } }))} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
                      <option value="">Assign member</option>
                      {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <input type="number" value={newAssignments[task.id]?.cost || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), cost: e.target.value } }))} placeholder="Cost" className={cn("px-2 py-1 text-xs w-20", THEME.punk.input)} />
                    <button onClick={() => addAssignment(task.id, task, (assignedMembers) => actions.updateGlobalTask(task.id, { assignedMembers }))} className={cn("px-2 py-1 text-xs", THEME.punk.btn, "bg-pink-600 text-white")}>Add</button>
                    {taskBudget(task) > 0 && <span className="text-[10px] font-bold">Remaining: {formatMoney(taskBudget(task) - (task.assignedMembers || []).reduce((s, m) => s + (m.cost || 0), 0))}</span>}
                  </div>
                </td>
                <td className="p-3"><span className={cn("px-2 py-1 text-xs font-bold", task.status === 'Done' ? 'bg-green-200' : task.status === 'In Progress' ? 'bg-blue-200' : task.status === 'Delayed' ? 'bg-red-200' : 'bg-gray-200')}>{task.status}</span></td>
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

// Releases List View (Spec 2.4)
export const ReleasesListView = ({ onSelectRelease }) => {
  const { data, actions } = useStore();

  const handleAddRelease = async () => {
    const newRelease = await actions.addRelease({ name: 'New Release', type: 'Album', releaseDate: '', estimatedCost: 0, notes: '' });
    if (onSelectRelease) onSelectRelease(newRelease);
  };

  const releases = data.releases || [];

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className={THEME.punk.textStyle}>Releases</h2>
        <button onClick={handleAddRelease} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Release</button>
      </div>
      <div className={cn("overflow-x-auto", THEME.punk.card)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Release Date</th>
              <th className="p-3 text-center">Physical</th>
              <th className="p-3 text-right">Estimated Cost</th>
            </tr>
          </thead>
          <tbody>
            {releases.length === 0 ? (
              <tr><td colSpan="4" className="p-10 text-center opacity-50">No releases yet. Click Add Release to create one.</td></tr>
            ) : releases.map(release => (
              <tr key={release.id} onClick={() => onSelectRelease && onSelectRelease(release)} className="border-b border-gray-200 hover:bg-yellow-50 cursor-pointer">
                <td className="p-3 font-bold">{release.name}</td>
                <td className="p-3">{release.type}</td>
                <td className="p-3">{release.releaseDate || '-'}</td>
                <td className="p-3 text-center">{release.hasPhysicalCopies ? 'Yes' : 'No'}</td>
                <td className="p-3 text-right">{formatMoney(release.estimatedCost || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Release Detail View (Spec 2.5)
export const ReleaseDetailView = ({ release, onBack }) => {
  const { data, actions } = useStore();
  const [form, setForm] = useState({ ...release });
  const [showAddReq, setShowAddReq] = useState(false);
  const [newReq, setNewReq] = useState({ songId: '', versionType: 'Album', status: 'Not Started', notes: '' });
  const [newAssignments, setNewAssignments] = useState({});
  // Phase 3: Custom tasks state
  const [showAddCustomTask, setShowAddCustomTask] = useState(false);
  const [newCustomTask, setNewCustomTask] = useState({ title: '', date: '', description: '', estimatedCost: 0, status: 'Not Started' });

  const teamMembers = data.teamMembers || [];

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

      {/* Release Tasks Section */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Release Tasks</h3>
          <button onClick={() => actions.recalculateReleaseTasksAction(release.id)} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-blue-500 text-white")}>Recalculate from Release Date</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-right">Est. Cost</th>
                <th className="p-2 text-left">Assignments</th>
                <th className="p-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(currentRelease.tasks || []).length === 0 ? (
                <tr><td colSpan="7" className="p-4 text-center opacity-50">No tasks yet. Set a release date and click Recalculate.</td></tr>
              ) : (currentRelease.tasks || []).map(task => (
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
                        return <span key={m.memberId + m.cost} className="px-2 py-1 bg-purple-100 border-2 border-black font-bold">{member?.name || 'Member'} ({formatMoney(m.cost)})</span>;
                      })}
                    </div>
                    <div className="flex gap-1 items-center">
                      <select value={newAssignments[task.id]?.memberId || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), memberId: e.target.value } }))} className={cn("px-2 py-1 text-xs", THEME.punk.input)}>
                        <option value="">Assign member</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <input type="number" value={newAssignments[task.id]?.cost || ''} onChange={e => setNewAssignments(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), cost: e.target.value } }))} placeholder="Cost" className={cn("px-2 py-1 text-xs w-20", THEME.punk.input)} />
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

// Combined Timeline View (Spec 2.6)
export const CombinedTimelineView = () => {
  const { data } = useStore();
  const [filterSource, setFilterSource] = useState('all');
  const [filterSong, setFilterSong] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const timelineItems = useMemo(() => {
    const items = [];

    // Song Tasks (formerly deadlines)
    (data.songs || []).forEach(song => {
      const songTasks = song.deadlines || [];
      songTasks.forEach(task => {
        items.push({
          id: 'song-task-' + task.id,
          date: task.date,
          sourceType: 'Song Task',
          label: task.type,
          name: song.title,
          category: task.category || song.category,
          status: task.status,
          estimatedCost: task.estimatedCost,
          notes: task.notes,
          songId: song.id
        });
      });
      // Song Custom Tasks
      const customTasks = song.customTasks || [];
      customTasks.forEach(task => {
        items.push({
          id: 'custom-' + task.id,
          date: task.date,
          sourceType: 'Song Custom',
          label: 'Custom task',
          name: song.title,
          category: song.category,
          status: task.status,
          estimatedCost: task.estimatedCost,
          notes: task.description || task.notes,
          songId: song.id
        });
      });
    });

    // Global Tasks
    (data.globalTasks || []).forEach(task => {
      items.push({
        id: 'global-' + task.id,
        date: task.date,
        sourceType: 'Global',
        label: 'Task',
        name: task.taskName,
        category: task.category,
        status: task.status,
        estimatedCost: task.estimatedCost,
        notes: task.description,
        songId: null
      });
    });

    // Releases and their tasks
    (data.releases || []).forEach(release => {
      // Release date itself
      items.push({ id: 'release-' + release.id, date: release.releaseDate, sourceType: 'Release', label: 'Release', name: release.name, category: release.type, status: null, estimatedCost: release.estimatedCost, notes: release.notes, songId: null });
      // Release tasks
      (release.tasks || []).forEach(task => {
        items.push({ id: 'release-task-' + task.id, date: task.date, sourceType: 'Release Task', label: task.type, name: release.name, category: task.category, status: task.status, estimatedCost: task.estimatedCost, notes: task.notes, songId: null });
      });
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
  }, [data.songs, data.globalTasks, data.releases, filterSource, filterSong, filterStatus, dateFrom, dateTo]);

  const getSourceColor = (sourceType) => {
    switch (sourceType) {
      case 'Song Task': return 'bg-blue-100 border-blue-500';
      case 'Song Custom': return 'bg-purple-100 border-purple-500';
      case 'Global': return 'bg-orange-100 border-orange-500';
      case 'Release Task': return 'bg-teal-100 border-teal-500';
      case 'Release': return 'bg-green-100 border-green-500';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="p-6 pb-24">
      <h2 className={cn("mb-6", THEME.punk.textStyle)}>Combined Timeline</h2>

      <div className={cn("p-4 mb-6 bg-gray-50", THEME.punk.card)}>
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Source</label>
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className={cn("w-full", THEME.punk.input)}>
              <option value="all">All Sources</option>
              <option value="Song Task">Song Tasks</option>
              <option value="Song Custom">Song Custom Tasks</option>
              <option value="Global">Global Tasks</option>
              <option value="Release">Releases</option>
              <option value="Release Task">Release Tasks</option>
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
              <tr key={item.id} className={cn("border-b border-gray-200", getSourceColor(item.sourceType))}>
                <td className="p-3 font-bold">{item.date || '-'}</td>
                <td className="p-3"><span className="px-2 py-1 text-xs font-bold bg-white border border-black">{item.sourceType}</span></td>
                <td className="p-3">{item.label}</td>
                <td className="p-3 font-bold">{item.name}</td>
                <td className="p-3">{item.category}</td>
                <td className="p-3">{item.status && <span className={cn("px-2 py-1 text-xs font-bold", item.status === 'Done' ? 'bg-green-200' : item.status === 'In Progress' ? 'bg-blue-200' : item.status === 'Delayed' ? 'bg-red-200' : 'bg-gray-200')}>{item.status}</span>}</td>
                <td className="p-3 text-right">{formatMoney(item.estimatedCost || 0)}</td>
                <td className="p-3 max-w-xs truncate">{item.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      // Tasks that are in progress
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
    const totalCost = allTasks.reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
    const totalPaid = allTasks.reduce((sum, t) => sum + (t.actualCost || t.paidCost || 0), 0);
    const remaining = allTasks.reduce((sum, t) => {
      if (t.actualCost || t.paidCost) return sum;
      return sum + (t.quotedCost || t.estimatedCost || 0);
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
