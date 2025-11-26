import { useState, useMemo } from 'react';
import { useStore, STATUS_OPTIONS, SONG_CATEGORIES, VIDEO_TYPES, RELEASE_TYPES, VERSION_TYPES, GLOBAL_TASK_CATEGORIES } from './Store';
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
          <button onClick={handleAddSong} className={cn("px-4 py-2 bg-black text-white", THEME.punk.btn)}>+ Add Song</button>
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
  const deadlinesCost = (currentSong.deadlines || []).reduce((sum, d) => sum + (d.estimatedCost || 0), 0);
  const customTasksCost = (currentSong.customTasks || []).reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
  const totalCost = (currentSong.estimatedCost || 0) + deadlinesCost + customTasksCost;

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className={cn("px-4 py-2 bg-white flex items-center gap-2", THEME.punk.btn)}>
          <Icon name="ChevronLeft" size={16} /> Back to Songs
        </button>
        <button onClick={handleDeleteSong} className={cn("px-4 py-2 bg-red-500 text-white", THEME.punk.btn)}>
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
            <label className="block text-xs font-bold uppercase mb-1">Video Type</label>
            <select value={form.videoType || 'None'} onChange={e => { handleFieldChange('videoType', e.target.value); }} onBlur={handleSave} className={cn("w-full", THEME.punk.input)}>
              {VIDEO_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
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
            <label className="block text-xs font-bold uppercase mb-1">Estimated Cost</label>
            <input type="number" value={form.estimatedCost || 0} onChange={e => handleFieldChange('estimatedCost', parseFloat(e.target.value) || 0)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Extra Versions Needed</label>
            <input value={form.extraVersionsNeeded || ''} onChange={e => handleFieldChange('extraVersionsNeeded', e.target.value)} onBlur={handleSave} placeholder="e.g., radio edit, acoustic, live loop" className={cn("w-full", THEME.punk.input)} />
          </div>
        </div>
      </div>

      {/* Deadlines Section (2.2.2) */}
      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Deadlines</h3>
          <button onClick={handleRecalculateDeadlines} className={cn("px-3 py-1 text-xs bg-blue-500 text-white", THEME.punk.btn)}>Recalculate from Release Date</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-right">Est. Cost</th>
                <th className="p-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(currentSong.deadlines || []).map(deadline => (
                <tr key={deadline.id} className="border-b border-gray-200">
                  <td className="p-2 font-bold">{deadline.type}{deadline.isOverridden && <span className="text-xs text-orange-500 ml-1">(edited)</span>}</td>
                  <td className="p-2"><input type="date" value={deadline.date || ''} onChange={e => handleDeadlineChange(deadline.id, 'date', e.target.value)} className="border-2 border-black p-1 text-xs" /></td>
                  <td className="p-2"><select value={deadline.status || 'Not Started'} onChange={e => handleDeadlineChange(deadline.id, 'status', e.target.value)} className="border-2 border-black p-1 text-xs">{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td className="p-2"><input type="number" value={deadline.estimatedCost || 0} onChange={e => handleDeadlineChange(deadline.id, 'estimatedCost', parseFloat(e.target.value) || 0)} className="border-2 border-black p-1 text-xs w-20 text-right" /></td>
                  <td className="p-2"><input value={deadline.notes || ''} onChange={e => handleDeadlineChange(deadline.id, 'notes', e.target.value)} className="border-2 border-black p-1 text-xs w-full" placeholder="Notes..." /></td>
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
          <button onClick={() => setShowAddTask(!showAddTask)} className={cn("px-3 py-1 text-xs bg-black text-white", THEME.punk.btn)}>{showAddTask ? 'Cancel' : '+ Add Task'}</button>
        </div>
        {showAddTask && (
          <div className="bg-gray-50 p-4 mb-4 border-2 border-black">
            <div className="grid md:grid-cols-2 gap-3">
              <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task Title" className={cn("w-full", THEME.punk.input)} />
              <input type="date" value={newTask.date} onChange={e => setNewTask({ ...newTask, date: e.target.value })} className={cn("w-full", THEME.punk.input)} />
              <input value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="Description" className={cn("w-full", THEME.punk.input)} />
              <input type="number" value={newTask.estimatedCost} onChange={e => setNewTask({ ...newTask, estimatedCost: parseFloat(e.target.value) || 0 })} placeholder="Estimated Cost" className={cn("w-full", THEME.punk.input)} />
              <select value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })} className={cn("w-full", THEME.punk.input)}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <button onClick={handleAddCustomTask} className={cn("px-4 py-2 bg-green-500 text-white", THEME.punk.btn)}>Add Task</button>
            </div>
          </div>
        )}
        {(currentSong.customTasks || []).length === 0 ? (
          <p className="text-center opacity-50 py-4">No custom tasks yet.</p>
        ) : (
          <div className="space-y-2">
            {(currentSong.customTasks || []).map(task => (
              <div key={task.id} className="flex items-center gap-2 p-3 bg-gray-50 border-2 border-black">
                <div className="flex-1">
                  <div className="font-bold">{task.title}</div>
                  <div className="text-xs opacity-60">{task.date} | {task.status} | {formatMoney(task.estimatedCost || 0)}</div>
                  {task.description && <div className="text-sm mt-1">{task.description}</div>}
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
          <div className="flex justify-between"><span>Song Base Cost:</span><span className="font-bold">{formatMoney(currentSong.estimatedCost || 0)}</span></div>
          <div className="flex justify-between"><span>Deadlines Total:</span><span className="font-bold">{formatMoney(deadlinesCost)}</span></div>
          <div className="flex justify-between"><span>Custom Tasks Total:</span><span className="font-bold">{formatMoney(customTasksCost)}</span></div>
          <div className="flex justify-between border-t-4 border-black pt-2 text-lg"><span className="font-black">TOTAL:</span><span className="font-black">{formatMoney(totalCost)}</span></div>
        </div>
      </div>
    </div>
  );
};

// Global Tasks View (Spec 2.3)
export const GlobalTasksView = () => {
  const { data, actions } = useStore();
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({ taskName: '', category: 'Other', date: '', description: '', assignedTo: '', status: 'Not Started', estimatedCost: 0, notes: '' });

  const tasks = useMemo(() => {
    let filtered = [...(data.globalTasks || [])];
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
  }, [data.globalTasks, sortBy, sortDir, filterCategory, filterStatus, searchText]);

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
        <button onClick={() => setShowAddForm(!showAddForm)} className={cn("px-4 py-2 bg-black text-white", THEME.punk.btn)}>{showAddForm ? 'Cancel' : '+ Add Task'}</button>
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
            <button onClick={handleAddTask} className={cn("px-4 py-2 bg-green-500 text-white", THEME.punk.btn)}>Add Task</button>
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
                <button onClick={handleUpdateTask} className={cn("flex-1 px-4 py-2 bg-green-500 text-white", THEME.punk.btn)}>Save</button>
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
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan="8" className="p-10 text-center opacity-50">No global tasks yet.</td></tr>
            ) : tasks.map(task => (
              <tr key={task.id} className="border-b border-gray-200 hover:bg-yellow-50">
                <td className="p-3">{task.date || '-'}</td>
                <td className="p-3 font-bold">{task.taskName}</td>
                <td className="p-3">{task.category}</td>
                <td className="p-3 max-w-xs truncate">{task.description}</td>
                <td className="p-3">{task.assignedTo || '-'}</td>
                <td className="p-3 text-right">{formatMoney(task.estimatedCost || 0)}</td>
                <td className="p-3"><span className={cn("px-2 py-1 text-xs font-bold", task.status === 'Done' ? 'bg-green-200' : task.status === 'In Progress' ? 'bg-blue-200' : task.status === 'Delayed' ? 'bg-red-200' : 'bg-gray-200')}>{task.status}</span></td>
                <td className="p-3 text-center">
                  <button onClick={() => setEditingTask({ ...task })} className="p-1 hover:bg-blue-100 text-blue-500 mr-1"><Icon name="Settings" size={14} /></button>
                  <button onClick={() => handleDeleteTask(task.id)} className="p-1 hover:bg-red-100 text-red-500"><Icon name="Trash2" size={14} /></button>
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
        <button onClick={handleAddRelease} className={cn("px-4 py-2 bg-black text-white", THEME.punk.btn)}>+ Add Release</button>
      </div>
      <div className={cn("overflow-x-auto", THEME.punk.card)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black text-white">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Release Date</th>
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

  const getSongTitle = (songId) => {
    const song = data.songs.find(s => s.id === songId);
    return song ? song.title : '(Unknown Song)';
  };

  return (
    <div className="p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className={cn("px-4 py-2 bg-white flex items-center gap-2", THEME.punk.btn)}><Icon name="ChevronLeft" size={16} /> Back to Releases</button>
        <button onClick={handleDeleteRelease} className={cn("px-4 py-2 bg-red-500 text-white", THEME.punk.btn)}><Icon name="Trash2" size={16} /></button>
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
            <label className="block text-xs font-bold uppercase mb-1">Estimated Cost</label>
            <input type="number" value={form.estimatedCost || 0} onChange={e => handleFieldChange('estimatedCost', parseFloat(e.target.value) || 0)} onBlur={handleSave} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => handleFieldChange('notes', e.target.value)} onBlur={handleSave} className={cn("w-full h-24", THEME.punk.input)} />
          </div>
        </div>
      </div>

      <div className={cn("p-6 mb-6", THEME.punk.card)}>
        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
          <h3 className="font-black uppercase">Required Recordings</h3>
          <button onClick={() => setShowAddReq(!showAddReq)} className={cn("px-3 py-1 text-xs bg-black text-white", THEME.punk.btn)}>{showAddReq ? 'Cancel' : '+ Add Requirement'}</button>
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
              <button onClick={handleAddRequirement} className={cn("px-4 py-2 bg-green-500 text-white", THEME.punk.btn)}>Add</button>
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

      <div className={cn("p-6", THEME.punk.card)}>
        <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Cost Summary</h3>
        <div className="flex justify-between text-lg">
          <span className="font-black">Release Estimated Cost:</span>
          <span className="font-black">{formatMoney(currentRelease.estimatedCost || 0)}</span>
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

    // Song Deadlines
    (data.songs || []).forEach(song => {
      (song.deadlines || []).forEach(deadline => {
        items.push({ id: 'deadline-' + deadline.id, date: deadline.date, sourceType: 'Song Deadline', label: deadline.type, name: song.title, category: song.category, status: deadline.status, estimatedCost: deadline.estimatedCost, notes: deadline.notes, songId: song.id });
      });
      // Song Custom Tasks
      (song.customTasks || []).forEach(task => {
        items.push({ id: 'custom-' + task.id, date: task.date, sourceType: 'Song Custom', label: 'Custom task', name: song.title, category: song.category, status: task.status, estimatedCost: task.estimatedCost, notes: task.description || task.notes, songId: song.id });
      });
    });

    // Global Tasks
    (data.globalTasks || []).forEach(task => {
      items.push({ id: 'global-' + task.id, date: task.date, sourceType: 'Global', label: 'Task', name: task.taskName, category: task.category, status: task.status, estimatedCost: task.estimatedCost, notes: task.description, songId: null });
    });

    // Releases
    (data.releases || []).forEach(release => {
      items.push({ id: 'release-' + release.id, date: release.releaseDate, sourceType: 'Release', label: 'Release', name: release.name, category: release.type, status: null, estimatedCost: release.estimatedCost, notes: release.notes, songId: null });
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
      case 'Song Deadline': return 'bg-blue-100 border-blue-500';
      case 'Song Custom': return 'bg-purple-100 border-purple-500';
      case 'Global': return 'bg-orange-100 border-orange-500';
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
              <option value="Song Deadline">Song Deadlines</option>
              <option value="Song Custom">Song Custom Tasks</option>
              <option value="Global">Global Tasks</option>
              <option value="Release">Releases</option>
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
