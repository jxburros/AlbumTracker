import { useState, useMemo, useEffect } from 'react';
import { useStore, STATUS_OPTIONS, getTaskDueDate, getPrimaryDate, getEffectiveCost } from './Store';
import { THEME, COLORS, formatMoney, cn } from './utils';
import { Icon } from './Components';
import { DetailPane } from './ItemComponents';

export const ListView = ({ onEdit }) => {
    const { data, actions } = useStore();
    const [filter, setFilter] = useState('all');

    const buildTree = (pid) => data.tasks.filter(t => t.parentId === pid && !t.archived).map(t => ({...t, children: buildTree(t.id)}));
    const tree = buildTree(null);

    const handleAdd = (type, pid) => {
        const stageId = filter !== 'all' ? filter : (data.stages[0]?.id || '');
        actions.add('tasks', { title: `New ${type}`, isCategory: type === 'category', parentId: pid, status: 'todo', stageId });
    };

    const TaskRow = ({ task, level = 0 }) => {
        const [open, setOpen] = useState(true);
        const cost = task.actualCost || task.quotedCost || task.estimatedCost || 0;
        
        return (
            <div className="select-none">
                <div className={cn("flex items-center gap-2 p-2 border-b border-gray-200 hover:bg-gray-50 cursor-pointer", task.isCategory ? "bg-gray-100" : "")}
                     style={{ paddingLeft: `${level * 20 + 8}px` }}
                     onClick={() => onEdit(task)}>
                    <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className={cn("p-1 hover:bg-gray-300 rounded", task.children.length ? "visible" : "invisible")}><Icon name={open ? "ChevronDown" : "ChevronRight"} size={14} /></button>
                    <div className={cn("p-1 rounded", task.isCategory ? "bg-black text-white" : "bg-gray-200")}><Icon name={task.isCategory ? "Folder" : "Circle"} size={14} /></div>
                    <span className="flex-1 font-bold truncate">{task.title}</span>
                    {task.dueDate && <span className="text-[10px] bg-yellow-300 px-1 border border-black font-bold">{task.dueDate}</span>}
                    {cost > 0 && <span className="text-[10px] font-bold px-1 border border-black bg-white">{formatMoney(cost)}</span>}
                    <button onClick={(e) => { e.stopPropagation(); handleAdd('task', task.id); }} className="p-1 hover:bg-gray-300 rounded"><Icon name="Plus" size={14} /></button>
                </div>
                {open && task.children.map(c => <TaskRow key={c.id} task={c} level={level + 1} />)}
            </div>
        );
    };

    return (
        <div className="view-shell">
            <div className="flex justify-between mb-6">
                <div className={cn("flex items-center px-2 bg-white", THEME.punk.border)}>
                   <span className="text-xs font-bold uppercase px-2">Filter:</span>
                   <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-transparent font-bold outline-none py-2 w-32">
                       <option value="all">All Stages</option>
                       {data.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
                <button onClick={() => handleAdd('category', null)} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Category</button>
            </div>
            <div className={cn("min-h-[500px]", THEME.punk.card)}>
                {tree.length === 0 ? <div className="p-10 text-center opacity-50">No tasks. Add a category to start.</div> : tree.map(n => <TaskRow key={n.id} task={n} />)}
            </div>
        </div>
    );
};

export const CalendarView = ({ onEdit }) => {
    const { data, actions } = useStore();
    const [date, setDate] = useState(new Date());
    const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '' });
    const [selectedItem, setSelectedItem] = useState(null);
    // Phase 5: Event custom tasks - Unified Task Handling: Use modal instead of inline form
    const [editingEventTask, setEditingEventTask] = useState(null);
    const year = date.getFullYear();
    const month = date.getMonth();

    const items = useMemo(() => {
        const map = {};
        
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

        // Legacy tasks
        data.tasks.filter(t => !t.archived).forEach(t => {
            const due = getTaskDueDate(t);
            if (!due) return;
            map[due] = map[due] || [];
            map[due].push({ ...t, dueDate: due, _kind: 'task' });
        });

        // Events
        data.events.forEach(e => {
            const eventDate = getPrimaryDate(e, data.releases || []);
            if (eventDate) {
                map[eventDate] = map[eventDate] || [];
                map[eventDate].push({ ...e, date: eventDate, _kind: 'event' });
            }
        });

        // Releases
        (data.releases || []).forEach(r => {
            const primaryReleaseDate = getPrimaryDate(r, data.releases || []);
            if (primaryReleaseDate) {
                map[primaryReleaseDate] = map[primaryReleaseDate] || [];
                map[primaryReleaseDate].push({
                    id: `release-${r.id}`,
                    _releaseId: r.id,
                    title: `${r.name} Release`,
                    date: primaryReleaseDate,
                    _kind: 'release',
                    releaseType: r.type
                });
            }
        });

        // Songs (release dates)
        (data.songs || []).forEach(song => {
            const songDate = getPrimaryDate(song, data.releases || [], linkedReleaseIdsForSong(song.id));
            if (songDate) {
                map[songDate] = map[songDate] || [];
                map[songDate].push({
                    id: `song-${song.id}`,
                    _songId: song.id,
                    title: `🎵 ${song.title}`,
                    date: songDate,
                    _kind: 'song'
                });
            }

            // Song tasks
            (song.deadlines || []).forEach(task => {
                const due = getTaskDueDate(task) || songDate;
                if (!due) return;
                map[due] = map[due] || [];
                map[due].push({
                    id: `song-task-${song.id}-${task.id}`,
                    _songId: song.id,
                    title: `${task.type} - ${song.title}`,
                    date: due,
                    status: task.status,
                    _kind: 'song-task'
                });
            });

            // Song versions (non-core versions with their own release dates)
            (song.versions || []).filter(v => v.id !== 'core').forEach(v => {
                const versionDate = getPrimaryDate(v, data.releases || [], linkedReleaseIdsForVersion(song.id, v.id));
                if (versionDate) {
                    map[versionDate] = map[versionDate] || [];
                    map[versionDate].push({
                        id: `version-${song.id}-${v.id}`,
                        _songId: song.id,
                        _versionId: v.id,
                        title: `🎵 ${v.name}`,
                        date: versionDate,
                        _kind: 'version'
                    });
                }
            });

            // Videos
            (song.videos || []).forEach(video => {
                const videoDate = getPrimaryDate(video, data.releases || [], linkedReleaseIdsForVideo(song.id, video.id));
                if (videoDate) {
                    map[videoDate] = map[videoDate] || [];
                    map[videoDate].push({
                        id: `video-${song.id}-${video.id}`,
                        _songId: song.id,
                        _videoId: video.id,
                        title: `📹 ${video.title}`,
                        date: videoDate,
                        _kind: 'video'
                    });
                }
            });
        });

        // Global tasks
        (data.globalTasks || []).filter(t => !t.isArchived).forEach(t => {
            const taskDate = getTaskDueDate(t);
            if (!taskDate) return;
            map[taskDate] = map[taskDate] || [];
            map[taskDate].push({
                id: `global-${t.id}`,
                _globalTaskId: t.id,
                title: `📋 ${t.taskName}`,
                date: taskDate,
                status: t.status,
                _kind: 'global-task'
            });
        });
        
        return map;
    }, [data.tasks, data.events, data.releases, data.songs, data.globalTasks]);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    
    // Navigate to today
    const goToToday = () => setDate(new Date());

    const getItemColor = (kind) => {
        switch (kind) {
            case 'release': return 'bg-green-400 text-black';
            case 'event': return 'bg-blue-500 text-white';
            case 'task': return 'bg-pink-500 text-white';
            case 'song': return 'bg-purple-500 text-white';
            case 'song-task': return 'bg-pink-300 text-black';
            case 'version': return 'bg-indigo-400 text-white';
            case 'video': return 'bg-orange-500 text-white';
            case 'global-task': return 'bg-yellow-400 text-black';
            default: return 'bg-gray-400 text-white';
        }
    };

    const handleItemClick = (item) => {
        if (item._kind === 'task' && onEdit) {
            onEdit(item);
        } else {
            setSelectedItem(item);
        }
    };

    const updateSelectedEvent = (field, value) => {
        if (selectedItem?._kind === 'event') {
            actions.update('events', selectedItem.id, { [field]: value });
            setSelectedItem(prev => prev ? { ...prev, [field]: value } : prev);
        }
    };

    return (
        <div className="h-full flex flex-col view-shell">
            {/* Header with navigation */}
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className={THEME.punk.textStyle}>{monthNames[month]} {year}</h2>
                <div className={cn("flex gap-2 border-4 p-1", "bg-pink-100 dark:bg-slate-700 border-black dark:border-slate-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(100,116,139,1)]")}>
                    <button onClick={() => setDate(new Date(year - 1, month, 1))} className={cn("p-2 w-10 text-xs font-bold border-4 border-black dark:border-slate-600", "bg-pink-300 dark:bg-slate-600 dark:text-white hover:bg-pink-200 dark:hover:bg-slate-500")} title="Previous Year">‹‹</button>
                    <button onClick={() => setDate(new Date(year, month - 1, 1))} className={cn("p-2 w-10 border-4 border-black dark:border-slate-600", "bg-pink-500 text-white hover:bg-pink-400 dark:bg-pink-600 dark:hover:bg-pink-500")}><Icon name="ChevronLeft" /></button>
                    <button onClick={goToToday} className={cn("px-3 py-2 text-xs font-bold border-4 border-black dark:border-slate-600", "bg-white dark:bg-slate-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-600")}>Today</button>
                    <button onClick={() => setDate(new Date(year, month + 1, 1))} className={cn("p-2 w-10 border-4 border-black dark:border-slate-600", "bg-pink-500 text-white hover:bg-pink-400 dark:bg-pink-600 dark:hover:bg-pink-500")}><Icon name="ChevronRight" /></button>
                    <button onClick={() => setDate(new Date(year + 1, month, 1))} className={cn("p-2 w-10 text-xs font-bold border-4 border-black dark:border-slate-600", "bg-pink-300 dark:bg-slate-600 dark:text-white hover:bg-pink-200 dark:hover:bg-slate-500")} title="Next Year">››</button>
                </div>
            </div>

            {/* Add Event Form - Per APP ARCHITECTURE.txt Section 5.4 */}
            <div className={cn("mb-4 p-4 flex flex-col gap-3", THEME.punk.card)}>
                <div className="grid md:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Title</label>
                        <input value={newEvent.title} onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))} placeholder="Event title" className={cn("w-full", THEME.punk.input)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Date</label>
                        <input type="date" value={newEvent.date} onChange={e => setNewEvent(prev => ({ ...prev, date: e.target.value }))} className={cn("w-full", THEME.punk.input)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Time</label>
                        <input type="time" value={newEvent.time || ''} onChange={e => setNewEvent(prev => ({ ...prev, time: e.target.value }))} className={cn("w-full", THEME.punk.input)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Location</label>
                        <input value={newEvent.location || ''} onChange={e => setNewEvent(prev => ({ ...prev, location: e.target.value }))} placeholder="Venue, city" className={cn("w-full", THEME.punk.input)} />
                    </div>
                </div>
                <div className="grid md:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Description</label>
                        <input value={newEvent.description} onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))} placeholder="Notes" className={cn("w-full", THEME.punk.input)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Entry Cost</label>
                        <input type="number" value={newEvent.entryCost || ''} onChange={e => setNewEvent(prev => ({ ...prev, entryCost: parseFloat(e.target.value) || 0 }))} placeholder="0" className={cn("w-full", THEME.punk.input)} />
                    </div>
                    <div className="flex items-center">
                        <label className="flex items-center gap-2 font-bold text-xs">
                            <input 
                                type="checkbox" 
                                checked={newEvent.includePreparation !== false}
                                onChange={e => setNewEvent(prev => ({ ...prev, includePreparation: e.target.checked }))}
                                className="w-4 h-4" 
                            />
                            Include Prep Tasks
                        </label>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                if (!newEvent.title || !newEvent.date) return;
                                // Use dedicated addEvent action with auto-task generation
                                actions.addEvent({ ...newEvent, type: 'Standalone Event' }, newEvent.includePreparation !== false);
                                setNewEvent({ title: '', date: '', description: '', time: '', location: '', entryCost: 0, includePreparation: true });
                            }}
                            className={cn("px-4 py-2 w-full", THEME.punk.btn, "bg-black text-white")}
                        >
                            + Add Event
                        </button>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-4 text-[10px] font-bold">
                <span className="px-2 py-1 bg-green-400 border border-black">Release</span>
                <span className="px-2 py-1 bg-blue-500 text-white border border-black">Event</span>
                <span className="px-2 py-1 bg-pink-500 text-white border border-black">Task</span>
                <span className="px-2 py-1 bg-purple-500 text-white border border-black">Song</span>
                <span className="px-2 py-1 bg-indigo-400 text-white border border-black">Version</span>
                <span className="px-2 py-1 bg-orange-500 text-white border border-black">Video</span>
                <span className="px-2 py-1 bg-yellow-400 border border-black">Global Task</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-black border-4 border-black text-center font-black text-white mb-px">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="py-3">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-black border-4 border-black flex-1 overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="bg-gray-100 h-24"></div>)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const list = items[dateStr] || [];
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    return (
                        <div key={d} className={cn("bg-white h-24 p-1 overflow-y-auto border-r border-b border-black hover:bg-yellow-50", isToday && "ring-2 ring-inset ring-pink-500")}>
                            <div className={cn("text-xs font-bold mb-1", isToday && "text-pink-600")}>{d}</div>
                            {list.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => handleItemClick(t)}
                                    className={cn(
                                        "text-[10px] p-1 mb-1 font-bold uppercase truncate border border-black cursor-pointer hover:opacity-80",
                                        getItemColor(t._kind)
                                    )}
                                    title={t.description || t.title}
                                >
                                    {t.title}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal for clicked items */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                    <div className={cn("w-full max-w-md p-6 bg-white max-h-[90vh] overflow-y-auto", THEME.punk.card)} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-black uppercase">{selectedItem.title}</h3>
                            <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-gray-200"><Icon name="X" size={16} /></button>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div><span className="font-bold">Type:</span> {selectedItem._kind}</div>
                            <div><span className="font-bold">Date:</span> {selectedItem.date}</div>
                            {selectedItem.status && <div><span className="font-bold">Status:</span> {selectedItem.status}</div>}
                            {selectedItem.description && <div><span className="font-bold">Description:</span> {selectedItem.description}</div>}
                            {selectedItem.releaseType && <div><span className="font-bold">Release Type:</span> {selectedItem.releaseType}</div>}
                        </div>
                        {/* Phase 5: Custom tasks for events */}
                        {selectedItem._kind === 'event' && (
                            <>
                                <DetailPane title="Event Detail Pane">
                                    <div className="space-y-2 text-xs">
                                        <div>
                                            <label className="block font-black uppercase mb-1">Notes</label>
                                            <textarea value={selectedItem.notes || ''} onChange={e => updateSelectedEvent('notes', e.target.value)} className={cn("w-full h-16", THEME.punk.input)} placeholder="Venue, ticketing notes" />
                                        </div>
                                        <div>
                                            <label className="block font-black uppercase mb-1">Platforms</label>
                                            <input value={(selectedItem.platforms || []).join(', ')} onChange={e => updateSelectedEvent('platforms', e.target.value.split(',').map(v => v.trim()).filter(Boolean))} className={cn("w-full", THEME.punk.input)} placeholder="YouTube, Venue, Stream" />
                                        </div>
                                        {/* Phase 2: Removed Exclusive Type and Estimated/Quoted/Paid Cost fields - Events derive cost from Tasks only */}
                                    </div>
                                </DetailPane>
                                <div className="mt-4 border-t-2 border-black pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-bold text-xs uppercase">Custom Tasks</div>
                                        <button 
                                            onClick={() => setEditingEventTask({
                                                title: 'New Task',
                                                date: '',
                                                status: 'Not Started',
                                                estimatedCost: 0,
                                                notes: '',
                                                isNew: true
                                            })}
                                            className={cn("px-2 py-1 text-xs", THEME.punk.btn, "bg-green-600 text-white")}
                                        >
                                            + Add Task
                                        </button>
                                    </div>
                                    {(selectedItem.customTasks || []).length === 0 ? (
                                        <div className="text-xs opacity-50 mb-2">No custom tasks yet.</div>
                                    ) : (
                                        <div className="space-y-2 mb-3">
                                            {(selectedItem.customTasks || []).map(task => (
                                                <div 
                                                    key={task.id} 
                                                    className="flex items-center justify-between p-2 border border-black bg-gray-50 text-xs cursor-pointer hover:bg-gray-100"
                                                    onClick={() => setEditingEventTask({ ...task, isNew: false })}
                                                >
                                                    <div>
                                                        <div className="font-bold">{task.title}</div>
                                                        <div className="opacity-60">{task.date} | {task.status}</div>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); actions.deleteEventCustomTask(selectedItem.id, task.id); }} 
                                                        className="text-red-500 p-1"
                                                    >
                                                        <Icon name="Trash2" size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => { actions.delete('events', selectedItem.id); setSelectedItem(null); }} 
                                    className={cn("mt-4 px-4 py-2 w-full", THEME.punk.btn, "bg-red-500 text-white")}
                                >
                                    Delete Event
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Event Task Edit Modal - Unified Task Handling Architecture */}
            {editingEventTask && selectedItem?._kind === 'event' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4" onClick={() => setEditingEventTask(null)}>
                    <div className={cn("w-full max-w-md p-6 bg-white max-h-[90vh] overflow-y-auto", THEME.punk.card)} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
                            <h3 className="font-black uppercase">
                                {editingEventTask.isNew ? 'Add Task' : 'Edit Task'}
                            </h3>
                            <button onClick={() => setEditingEventTask(null)} className="p-1 hover:bg-gray-200"><Icon name="X" size={16} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Task Name</label>
                                <input 
                                    value={editingEventTask.title || ''} 
                                    onChange={e => setEditingEventTask(prev => ({ ...prev, title: e.target.value }))} 
                                    className={cn("w-full", THEME.punk.input)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Due Date</label>
                                <input 
                                    type="date" 
                                    value={editingEventTask.date || ''} 
                                    onChange={e => setEditingEventTask(prev => ({ ...prev, date: e.target.value }))} 
                                    className={cn("w-full", THEME.punk.input)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Status</label>
                                <select
                                    value={editingEventTask.status || 'Not Started'}
                                    onChange={e => setEditingEventTask(prev => ({ ...prev, status: e.target.value }))}
                                    className={cn("w-full", THEME.punk.input)}
                                >
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Estimated Cost</label>
                                <input 
                                    type="number" 
                                    value={editingEventTask.estimatedCost || 0} 
                                    onChange={e => setEditingEventTask(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))} 
                                    className={cn("w-full", THEME.punk.input)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Notes</label>
                                <textarea 
                                    value={editingEventTask.notes || ''} 
                                    onChange={e => setEditingEventTask(prev => ({ ...prev, notes: e.target.value }))} 
                                    className={cn("w-full h-20", THEME.punk.input)}
                                    placeholder="Additional details..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6 pt-4 border-t-4 border-black">
                            <button 
                                onClick={async () => {
                                    if (!editingEventTask.title) return;
                                    if (editingEventTask.isNew) {
                                        await actions.addEventCustomTask(selectedItem.id, {
                                            title: editingEventTask.title,
                                            date: editingEventTask.date,
                                            status: editingEventTask.status,
                                            estimatedCost: editingEventTask.estimatedCost,
                                            notes: editingEventTask.notes
                                        });
                                    } else {
                                        await actions.updateEventCustomTask(selectedItem.id, editingEventTask.id, editingEventTask);
                                    }
                                    // Refresh selectedItem
                                    const updated = data.events.find(e => e.id === selectedItem.id);
                                    if (updated) setSelectedItem({ ...updated, _kind: 'event' });
                                    setEditingEventTask(null);
                                }}
                                className={cn("flex-1 px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}
                            >
                                Save
                            </button>
                            <button onClick={() => setEditingEventTask(null)} className={cn("px-4 py-2", THEME.punk.btn, "bg-gray-500 text-white")}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const GalleryView = () => {
    const { data, actions } = useStore();
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [editingPhoto, setEditingPhoto] = useState(null);

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            actions.add('photos', { 
                data: ev.target.result, 
                name: file.name,
                title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                description: '',
                uploadedAt: new Date().toISOString()
            });
        };
        reader.readAsDataURL(file);
    };

    const handleDownload = (photo) => {
        const link = document.createElement('a');
        link.href = photo.data;
        link.download = photo.name || 'photo.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = () => {
        data.photos.forEach((photo, index) => {
            setTimeout(() => {
                handleDownload(photo);
            }, index * 300); // Stagger downloads
        });
    };

    const handleUpdatePhoto = (photoId, updates) => {
        actions.update('photos', photoId, updates);
    };

    return (
        <div className="view-shell">
            <div className="flex flex-wrap justify-between items-center mb-8 border-b-4 border-black pb-4 gap-4">
                <h2 className={cn("text-3xl flex items-center gap-2", THEME.punk.textStyle)}><Icon name="Image" /> Gallery</h2>
                <div className="flex gap-2">
                    {data.photos.length > 0 && (
                        <button onClick={handleDownloadAll} className={cn("px-4 py-2 flex items-center gap-2", THEME.punk.btn, "bg-blue-500 text-white")}>
                            <Icon name="Download" size={16}/> Download All
                        </button>
                    )}
                    <label className={cn("px-4 py-2 cursor-pointer bg-white flex items-center gap-2", THEME.punk.btn)}>
                        <Icon name="Upload" size={16}/> Upload
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    </label>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.photos.map(p => (
                    <div key={p.id} className={cn("relative aspect-square group overflow-hidden cursor-pointer", THEME.punk.card)}>
                        <img 
                            src={p.data} 
                            alt={p.title || p.name}
                            className="w-full h-full object-cover"
                            onClick={() => setSelectedPhoto(p)}
                        />
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDownload(p)} className="bg-blue-500 text-white p-1 rounded" title="Download"><Icon name="Download" size={14} /></button>
                            <button onClick={() => setEditingPhoto(p)} className="bg-yellow-500 text-white p-1 rounded" title="Edit"><Icon name="Settings" size={14} /></button>
                            <button onClick={() => actions.delete('photos', p.id)} className="bg-red-500 text-white p-1 rounded" title="Delete"><Icon name="Trash2" size={14} /></button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-[10px] p-1">
                            <div className="truncate font-bold">{p.title || p.name}</div>
                            {p.description && <div className="truncate opacity-80">{p.description}</div>}
                        </div>
                    </div>
                ))}
                {data.photos.length === 0 && <div className="col-span-full py-20 text-center opacity-50">No photos yet.</div>}
            </div>

            {/* Photo Enlargement Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-white">
                                <div className="font-bold text-lg">{selectedPhoto.title || selectedPhoto.name}</div>
                                {selectedPhoto.description && <div className="text-sm opacity-80">{selectedPhoto.description}</div>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleDownload(selectedPhoto)} className="p-2 bg-blue-500 text-white rounded" title="Download"><Icon name="Download" size={20} /></button>
                                <button onClick={() => { setEditingPhoto(selectedPhoto); setSelectedPhoto(null); }} className="p-2 bg-yellow-500 text-white rounded" title="Edit"><Icon name="Settings" size={20} /></button>
                                <button onClick={() => setSelectedPhoto(null)} className="p-2 bg-gray-500 text-white rounded"><Icon name="X" size={20} /></button>
                            </div>
                        </div>
                        <img 
                            src={selectedPhoto.data} 
                            alt={selectedPhoto.title || selectedPhoto.name}
                            className="max-w-full max-h-[80vh] object-contain border-4 border-white"
                        />
                    </div>
                </div>
            )}

            {/* Edit Photo Modal */}
            {editingPhoto && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setEditingPhoto(null)}>
                    <div className={cn("w-full max-w-md p-6 bg-white", THEME.punk.card)} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black uppercase">Edit Photo</h3>
                            <button onClick={() => setEditingPhoto(null)} className="p-1 hover:bg-gray-200"><Icon name="X" size={16} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Title</label>
                                <input 
                                    value={editingPhoto.title || ''} 
                                    onChange={e => setEditingPhoto(prev => ({ ...prev, title: e.target.value }))} 
                                    className={cn("w-full", THEME.punk.input)} 
                                    placeholder="Photo title"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Description</label>
                                <textarea 
                                    value={editingPhoto.description || ''} 
                                    onChange={e => setEditingPhoto(prev => ({ ...prev, description: e.target.value }))} 
                                    className={cn("w-full h-24", THEME.punk.input)} 
                                    placeholder="Photo description"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => {
                                        handleUpdatePhoto(editingPhoto.id, { title: editingPhoto.title, description: editingPhoto.description });
                                        setEditingPhoto(null);
                                    }} 
                                    className={cn("flex-1 px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}
                                >
                                    Save
                                </button>
                                <button onClick={() => setEditingPhoto(null)} className={cn("flex-1 px-4 py-2 bg-gray-300", THEME.punk.btn)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const FilesView = () => {
    const { data, actions } = useStore();
    const [selectedFile, setSelectedFile] = useState(null);
    const [editingFile, setEditingFile] = useState(null);

    // Helper to determine if file is an image (previewable)
    const isImageFile = (file) => {
        if (!file) return false;
        // Check MIME type if available
        if (file.mimeType && file.mimeType.startsWith('image/')) return true;
        // Check by file extension
        const ext = (file.name || '').split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
    };

    // Get file extension for icon/display
    const getFileExtension = (file) => {
        const ext = (file.name || '').split('.').pop().toLowerCase();
        return ext || 'file';
    };

    // Get icon name based on file type
    const getFileIcon = (file) => {
        const ext = getFileExtension(file);
        switch (ext) {
            case 'pdf': return 'FileText';
            case 'doc':
            case 'docx': return 'FileText';
            case 'xls':
            case 'xlsx': return 'FileSpreadsheet';
            case 'ppt':
            case 'pptx': return 'FileSpreadsheet';
            case 'mp3':
            case 'wav':
            case 'flac':
            case 'm4a':
            case 'ogg':
            case 'aac': return 'Music';
            case 'mp4':
            case 'mov':
            case 'avi':
            case 'mkv':
            case 'webm': return 'Video';
            case 'zip':
            case 'rar':
            case '7z':
            case 'tar':
            case 'gz': return 'Archive';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'webp':
            case 'bmp':
            case 'svg': return 'Image';
            default: return 'File';
        }
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            actions.add('files', { 
                data: ev.target.result, 
                name: file.name,
                title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for title
                mimeType: file.type,
                size: file.size,
                description: '',
                uploadedAt: new Date().toISOString()
            });
        };
        reader.readAsDataURL(file);
    };

    const handleDownload = (file) => {
        const link = document.createElement('a');
        link.href = file.data;
        link.download = file.name || 'file';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = () => {
        data.files.forEach((file, index) => {
            setTimeout(() => {
                handleDownload(file);
            }, index * 300); // Stagger downloads
        });
    };

    const handleUpdateFile = (fileId, updates) => {
        actions.update('files', fileId, updates);
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="view-shell">
            <div className="flex flex-wrap justify-between items-center mb-8 border-b-4 border-black pb-4 gap-4">
                <h2 className={cn("text-3xl flex items-center gap-2", THEME.punk.textStyle)}><Icon name="File" /> Files</h2>
                <div className="flex gap-2">
                    {data.files.length > 0 && (
                        <button onClick={handleDownloadAll} className={cn("px-4 py-2 flex items-center gap-2", THEME.punk.btn, "bg-blue-500 text-white")}>
                            <Icon name="Download" size={16}/> Download All
                        </button>
                    )}
                    <label className={cn("px-4 py-2 cursor-pointer bg-white flex items-center gap-2", THEME.punk.btn)}>
                        <Icon name="Upload" size={16}/> Upload
                        <input type="file" className="hidden" onChange={handleUpload} />
                    </label>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.files.map(f => (
                    <div key={f.id} className={cn("relative aspect-square group overflow-hidden cursor-pointer", THEME.punk.card)}>
                        {isImageFile(f) ? (
                            <img 
                                src={f.data} 
                                alt={f.title || f.name}
                                className="w-full h-full object-cover"
                                onClick={() => setSelectedFile(f)}
                            />
                        ) : (
                            <div 
                                className="w-full h-full flex flex-col items-center justify-center bg-gray-100"
                                onClick={() => setSelectedFile(f)}
                            >
                                <Icon name={getFileIcon(f)} size={48} className="text-gray-600 mb-2" />
                                <div className="text-xs font-bold uppercase text-gray-600">.{getFileExtension(f)}</div>
                            </div>
                        )}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDownload(f)} className="bg-blue-500 text-white p-1 rounded" title="Download"><Icon name="Download" size={14} /></button>
                            <button onClick={() => setEditingFile(f)} className="bg-yellow-500 text-white p-1 rounded" title="Edit"><Icon name="Settings" size={14} /></button>
                            <button onClick={() => actions.delete('files', f.id)} className="bg-red-500 text-white p-1 rounded" title="Delete"><Icon name="Trash2" size={14} /></button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-[10px] p-1">
                            <div className="truncate font-bold">{f.title || f.name}</div>
                            {f.size && <div className="truncate opacity-80">{formatFileSize(f.size)}</div>}
                        </div>
                    </div>
                ))}
                {data.files.length === 0 && <div className="col-span-full py-20 text-center opacity-50">No files yet. Upload any file type.</div>}
            </div>

            {/* File Detail Modal */}
            {selectedFile && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedFile(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-white">
                                <div className="font-bold text-lg">{selectedFile.title || selectedFile.name}</div>
                                {selectedFile.description && <div className="text-sm opacity-80">{selectedFile.description}</div>}
                                {selectedFile.size && <div className="text-xs opacity-60">{formatFileSize(selectedFile.size)}</div>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleDownload(selectedFile)} className="p-2 bg-blue-500 text-white rounded" title="Download"><Icon name="Download" size={20} /></button>
                                <button onClick={() => { setEditingFile(selectedFile); setSelectedFile(null); }} className="p-2 bg-yellow-500 text-white rounded" title="Edit"><Icon name="Settings" size={20} /></button>
                                <button onClick={() => setSelectedFile(null)} className="p-2 bg-gray-500 text-white rounded"><Icon name="X" size={20} /></button>
                            </div>
                        </div>
                        {isImageFile(selectedFile) ? (
                            <img 
                                src={selectedFile.data} 
                                alt={selectedFile.title || selectedFile.name}
                                className="max-w-full max-h-[80vh] object-contain border-4 border-white"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 bg-white border-4 border-white">
                                <Icon name={getFileIcon(selectedFile)} size={96} className="text-gray-600 mb-4" />
                                <div className="text-2xl font-bold uppercase text-gray-600 mb-2">.{getFileExtension(selectedFile)}</div>
                                <div className="text-gray-500 text-sm">Preview not available for this file type</div>
                                <button onClick={() => handleDownload(selectedFile)} className={cn("mt-4 px-6 py-3", THEME.punk.btn, "bg-blue-500 text-white")}>
                                    <Icon name="Download" size={16} className="inline mr-2" /> Download File
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit File Modal */}
            {editingFile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setEditingFile(null)}>
                    <div className={cn("w-full max-w-md p-6 bg-white", THEME.punk.card)} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black uppercase">Edit File</h3>
                            <button onClick={() => setEditingFile(null)} className="p-1 hover:bg-gray-200"><Icon name="X" size={16} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Title</label>
                                <input 
                                    value={editingFile.title || ''} 
                                    onChange={e => setEditingFile(prev => ({ ...prev, title: e.target.value }))} 
                                    className={cn("w-full", THEME.punk.input)} 
                                    placeholder="File title"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Description</label>
                                <textarea 
                                    value={editingFile.description || ''} 
                                    onChange={e => setEditingFile(prev => ({ ...prev, description: e.target.value }))} 
                                    className={cn("w-full h-24", THEME.punk.input)} 
                                    placeholder="File description"
                                />
                            </div>
                            <div className="text-xs text-gray-500">
                                <div><strong>File Name:</strong> {editingFile.name}</div>
                                {editingFile.size && <div><strong>Size:</strong> {formatFileSize(editingFile.size)}</div>}
                                {editingFile.uploadedAt && <div><strong>Uploaded:</strong> {new Date(editingFile.uploadedAt).toLocaleString()}</div>}
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => {
                                        handleUpdateFile(editingFile.id, { title: editingFile.title, description: editingFile.description });
                                        setEditingFile(null);
                                    }} 
                                    className={cn("flex-1 px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}
                                >
                                    Save
                                </button>
                                <button onClick={() => setEditingFile(null)} className={cn("flex-1 px-4 py-2 bg-gray-300", THEME.punk.btn)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const TeamView = () => {
    const { data, actions } = useStore();
    // Per APP ARCHITECTURE.txt Section 5.5: Team Member properties
    const [newMember, setNewMember] = useState({
        name: '',
        role: '',
        roles: [],
        type: 'individual',
        contacts: { phone: '', email: '', website: '' },
        notes: '',
        links: { groups: [], organizations: [], members: [] },
        isMusician: false,
        instruments: [],
        // Section 5.5: Work Mode for Individuals
        workMode: 'In-Person',
        // Section 5.5: Organization Type for Organizations
        orgType: 'For-Profit',
        // Section 5.5: Group Type for Groups
        groupType: ''
    });
    const [editingMember, setEditingMember] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', 'musicians', 'individual', 'group', 'organization'
    const companies = (data.teamMembers || []).filter(m => m.type === 'company' || m.type === 'organization');
    const groups = (data.teamMembers || []).filter(m => m.type === 'group');
    const individuals = (data.teamMembers || []).filter(m => m.type === 'individual');

    const handleAdd = async () => {
        if (!newMember.name) return;
        await actions.addTeamMember(newMember);
        // Reset with all new fields per APP ARCHITECTURE.txt Section 5.5
        setNewMember({ name: '', role: '', roles: [], type: 'individual', contacts: { phone: '', email: '', website: '' }, notes: '', links: { groups: [], organizations: [], members: [] }, isMusician: false, instruments: [], workMode: 'In-Person', orgType: 'For-Profit', groupType: '' });
    };

    const handleUpdateMember = async () => {
        if (editingMember) {
            await actions.updateTeamMember(editingMember.id, editingMember);
            setEditingMember(null);
        }
    };

    const filteredMembers = useMemo(() => {
        let members = data.teamMembers || [];
        if (filter === 'musicians') {
            members = members.filter(m => m.isMusician);
        } else if (filter === 'individual') {
            members = members.filter(m => m.type === 'individual');
        } else if (filter === 'company' || filter === 'organization') {
            members = members.filter(m => m.type === 'company' || m.type === 'organization');
        } else if (filter === 'group') {
            members = members.filter(m => m.type === 'group');
        }
        return members;
    }, [data.teamMembers, filter]);

    const memberTaskLookup = useMemo(() => {
        const map = {};
        const push = (memberId, task, context) => {
            if (!memberId) return;
            if (!map[memberId]) map[memberId] = [];
            map[memberId].push({ title: task.title || task.taskName || task.type, status: task.status, context });
        };
        const considerList = (list, context) => {
            (list || []).forEach(task => {
                (task.assignedMembers || []).forEach(am => push(am.memberId, task, context));
            });
        };

        considerList(data.tasks || [], 'General Tasks');
        considerList(data.globalTasks || [], 'Global Tasks');
        (data.releases || []).forEach(rel => {
            considerList(rel.tasks || [], `Release: ${rel.name}`);
            considerList(rel.customTasks || [], `Release Custom: ${rel.name}`);
        });
        (data.songs || []).forEach(song => {
            considerList(song.deadlines || [], `Song: ${song.title}`);
            considerList(song.customTasks || [], `Song Custom: ${song.title}`);
            (song.versions || []).forEach(v => {
                considerList(v.tasks || [], `Version ${v.name} — ${song.title}`);
                considerList(v.customTasks || [], `Version Custom ${v.name} — ${song.title}`);
            });
        });
        return map;
    }, [data.tasks, data.globalTasks, data.releases, data.songs]);

    return (
        <div className="view-shell">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className={THEME.punk.textStyle}>Team</h2>
                <div className="flex gap-2">
                    <select value={filter} onChange={e => setFilter(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
                        <option value="all">All Members</option>
                        <option value="musicians">Musicians Only</option>
                        <option value="individual">Individuals</option>
                        <option value="group">Groups</option>
                        <option value="organization">Organizations</option>
                    </select>
                </div>
            </div>
            
            <div className={cn("p-4 mb-6", THEME.punk.card)}>
                <h3 className="font-black uppercase mb-4 border-b-2 border-black pb-2">Add New Team Member</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="Name" className={cn("w-full", THEME.punk.input)} />
                    <input value={(newMember.roles || []).join(', ')} onChange={e => setNewMember({ ...newMember, roles: e.target.value.split(',').map(r => r.trim()).filter(Boolean), role: e.target.value.split(',').map(r => r.trim()).filter(Boolean)[0] || '' })} placeholder="Roles (comma-separated)" className={cn("w-full", THEME.punk.input)} />
                    <div className="flex gap-2 items-center">
                        <label className="text-xs font-bold uppercase">Type</label>
                        <select value={newMember.type} onChange={e => setNewMember({ ...newMember, type: e.target.value })} className={cn("w-full", THEME.punk.input)}>
                            <option value="individual">Individual</option>
                            <option value="group">Group</option>
                            <option value="organization">Organization</option>
                        </select>
                    </div>
                    {/* Per APP ARCHITECTURE.txt Section 5.5: Work Mode for Individuals */}
                    {newMember.type === 'individual' && (
                        <div className="flex gap-2 items-center">
                            <label className="text-xs font-bold uppercase">Work Mode</label>
                            <select value={newMember.workMode || 'In-Person'} onChange={e => setNewMember({ ...newMember, workMode: e.target.value })} className={cn("w-full", THEME.punk.input)}>
                                <option value="In-Person">In-Person</option>
                                <option value="Remote">Remote</option>
                                <option value="Traveling">Traveling</option>
                            </select>
                        </div>
                    )}
                    {/* Per APP ARCHITECTURE.txt Section 5.5: Organization Type */}
                    {newMember.type === 'organization' && (
                        <div className="flex gap-2 items-center">
                            <label className="text-xs font-bold uppercase">Org Type</label>
                            <select value={newMember.orgType || 'For-Profit'} onChange={e => setNewMember({ ...newMember, orgType: e.target.value })} className={cn("w-full", THEME.punk.input)}>
                                <option value="For-Profit">For-Profit</option>
                                <option value="Nonprofit">Nonprofit</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    )}
                    {/* Per APP ARCHITECTURE.txt Section 5.5: Group Type */}
                    {newMember.type === 'group' && (
                        <div className="flex gap-2 items-center">
                            <label className="text-xs font-bold uppercase">Group Type</label>
                            <input value={newMember.groupType || ''} onChange={e => setNewMember({ ...newMember, groupType: e.target.value })} placeholder="e.g., Band, Crew" className={cn("w-full", THEME.punk.input)} />
                        </div>
                    )}
                    <input value={newMember.contacts?.phone || ''} onChange={e => setNewMember({ ...newMember, contacts: { ...(newMember.contacts || {}), phone: e.target.value } })} placeholder="Phone" className={cn("w-full", THEME.punk.input)} />
                    <input value={newMember.contacts?.email || ''} onChange={e => setNewMember({ ...newMember, contacts: { ...(newMember.contacts || {}), email: e.target.value } })} placeholder="Email" className={cn("w-full", THEME.punk.input)} />
                    <input value={newMember.contacts?.website || ''} onChange={e => setNewMember({ ...newMember, contacts: { ...(newMember.contacts || {}), website: e.target.value } })} placeholder="Website" className={cn("w-full", THEME.punk.input)} />

                    {/* Relationship links */}
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Groups</label>
                        <select multiple value={newMember.links?.groups || []} onChange={e => setNewMember({ ...newMember, links: { ...(newMember.links || {}), groups: Array.from(e.target.selectedOptions).map(o => o.value) } })} className={cn("w-full", THEME.punk.input)}>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Organizations</label>
                        <select multiple value={newMember.links?.organizations || []} onChange={e => setNewMember({ ...newMember, links: { ...(newMember.links || {}), organizations: Array.from(e.target.selectedOptions).map(o => o.value) } })} className={cn("w-full", THEME.punk.input)}>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    {newMember.type === 'group' && (
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase mb-1">Members</label>
                            <select multiple value={newMember.links?.members || []} onChange={e => setNewMember({ ...newMember, links: { ...(newMember.links || {}), members: Array.from(e.target.selectedOptions).map(o => o.value) } })} className={cn("w-full", THEME.punk.input)}>
                                {individuals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Phase 8: Musician flag and instruments */}
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 font-bold">
                            <input 
                                type="checkbox" 
                                checked={newMember.isMusician || false} 
                                onChange={e => setNewMember({ ...newMember, isMusician: e.target.checked })} 
                                className="w-5 h-5" 
                            />
                            Is Musician
                        </label>
                    </div>
                    {newMember.isMusician && (
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Instruments (comma-separated)</label>
                            <input 
                                value={(newMember.instruments || []).join(', ')} 
                                onChange={e => setNewMember({ ...newMember, instruments: e.target.value.split(',').map(i => i.trim()).filter(Boolean) })} 
                                placeholder="guitar, piano, drums"
                                className={cn("w-full", THEME.punk.input)} 
                            />
                        </div>
                    )}
                    
                    <textarea value={newMember.notes} onChange={e => setNewMember({ ...newMember, notes: e.target.value })} placeholder="Notes" className={cn("w-full h-20", THEME.punk.input)} />
                    <button onClick={handleAdd} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>
                        + Add Team Member
                    </button>
                </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
                {filteredMembers.map(v => (
                    <div key={v.id} className={cn("p-4 relative space-y-1", THEME.punk.card)}>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{v.name}</h3>
                            {v.isMusician && <span className="px-2 py-1 bg-purple-200 text-purple-800 text-[10px] font-bold border border-purple-500">🎵 MUSICIAN</span>}
                        </div>
                        <p className="text-sm opacity-80">{(v.roles && v.roles.length > 0 ? v.roles.join(', ') : v.role) || v.type}</p>
                        {((v.contacts?.email || v.email) || (v.contacts?.phone || v.phone) || v.contacts?.website) && (
                            <div className="text-xs space-y-1">
                                {(v.contacts?.email || v.email) && <p>📧 {v.contacts?.email || v.email}</p>}
                                {(v.contacts?.phone || v.phone) && <p>📞 {v.contacts?.phone || v.phone}</p>}
                                {v.contacts?.website && <p>🔗 {v.contacts.website}</p>}
                            </div>
                        )}
                        {v.links && (
                            <div className="text-[10px] font-bold space-y-1">
                                {(v.links.groups || []).length > 0 && <div>Groups: {(v.links.groups || []).map(id => groups.find(g => g.id === id)?.name || 'Group').join(', ')}</div>}
                                {(v.links.organizations || []).length > 0 && <div>Orgs: {(v.links.organizations || []).map(id => companies.find(c => c.id === id)?.name || 'Org').join(', ')}</div>}
                                {(v.links.members || []).length > 0 && <div>Members: {(v.links.members || []).map(id => individuals.find(m => m.id === id)?.name || 'Member').join(', ')}</div>}
                            </div>
                        )}
                        {v.isMusician && v.instruments && v.instruments.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {v.instruments.map(inst => (
                                    <span key={inst} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-300">
                                        {inst}
                                    </span>
                                ))}
                            </div>
                        )}
                        {v.notes && <p className="text-xs opacity-70 mt-2">{v.notes}</p>}
                        {(memberTaskLookup[v.id] || []).length > 0 && (
                            <div className="mt-2 p-2 bg-gray-50 border border-black text-[11px] space-y-1">
                                <div className="font-black uppercase">Linked Tasks</div>
                                {memberTaskLookup[v.id].map((task, idx) => (
                                    <div key={idx} className="flex justify-between gap-2">
                                        <span>{task.title}</span>
                                        <span className="text-[10px] uppercase">{task.context}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1">
                            {/* Per APP ARCHITECTURE.txt Section 5.5: Shortcut to create Standalone Task with Team Member pre-filled */}
                            <button 
                                onClick={async () => {
                                    const task = await actions.createTaskForTeamMember(v.id);
                                    if (task) {
                                        alert(`Created task "${task.title}" for ${v.name}`);
                                    }
                                }} 
                                className="text-green-600 hover:bg-green-100 p-1" 
                                title="Create task for this member"
                            >
                                <Icon name="Plus" size={16}/>
                            </button>
                            <button onClick={() => setEditingMember({ ...v, contacts: v.contacts || { phone: v.phone || '', email: v.email || '', website: '' }, links: v.links || { groups: [], organizations: [], members: [] }, roles: v.roles || (v.role ? [v.role] : []) })} className="text-blue-500 hover:bg-blue-100 p-1"><Icon name="Settings" size={16}/></button>
                            <button onClick={() => actions.deleteTeamMember(v.id)} className="text-red-500 hover:bg-red-100 p-1"><Icon name="Trash2" size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
            
            {filteredMembers.length === 0 && (
                <div className="text-center py-10 opacity-50">No team members found.</div>
            )}

            {/* Edit Member Modal */}
            {editingMember && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setEditingMember(null)}>
                    <div className={cn("w-full max-w-md p-6 bg-white max-h-[90vh] overflow-y-auto", THEME.punk.card)} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black uppercase">Edit Team Member</h3>
                            <button onClick={() => setEditingMember(null)} className="p-1 hover:bg-gray-200"><Icon name="X" size={16} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Name</label>
                                <input value={editingMember.name || ''} onChange={e => setEditingMember(prev => ({ ...prev, name: e.target.value }))} className={cn("w-full", THEME.punk.input)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Roles</label>
                                <input value={(editingMember.roles || []).join(', ')} onChange={e => {
                                    const values = e.target.value.split(',').map(r => r.trim()).filter(Boolean);
                                    setEditingMember(prev => ({ ...prev, roles: values, role: values[0] || '' }));
                                }} className={cn("w-full", THEME.punk.input)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Type</label>
                                <select value={editingMember.type} onChange={e => setEditingMember(prev => ({ ...prev, type: e.target.value }))} className={cn("w-full", THEME.punk.input)}>
                                    <option value="individual">Individual</option>
                                    <option value="group">Group</option>
                                    <option value="organization">Organization</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Phone</label>
                                <input value={editingMember.contacts?.phone || ''} onChange={e => setEditingMember(prev => ({ ...prev, contacts: { ...(prev.contacts || {}), phone: e.target.value } }))} className={cn("w-full", THEME.punk.input)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Email</label>
                                <input value={editingMember.contacts?.email || ''} onChange={e => setEditingMember(prev => ({ ...prev, contacts: { ...(prev.contacts || {}), email: e.target.value } }))} className={cn("w-full", THEME.punk.input)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Website</label>
                                <input value={editingMember.contacts?.website || ''} onChange={e => setEditingMember(prev => ({ ...prev, contacts: { ...(prev.contacts || {}), website: e.target.value } }))} className={cn("w-full", THEME.punk.input)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Groups</label>
                                <select multiple value={editingMember.links?.groups || []} onChange={e => setEditingMember(prev => ({ ...prev, links: { ...(prev.links || {}), groups: Array.from(e.target.selectedOptions).map(o => o.value) } }))} className={cn("w-full", THEME.punk.input)}>
                                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Organizations</label>
                                <select multiple value={editingMember.links?.organizations || []} onChange={e => setEditingMember(prev => ({ ...prev, links: { ...(prev.links || {}), organizations: Array.from(e.target.selectedOptions).map(o => o.value) } }))} className={cn("w-full", THEME.punk.input)}>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            {editingMember.type === 'group' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Members</label>
                                    <select multiple value={editingMember.links?.members || []} onChange={e => setEditingMember(prev => ({ ...prev, links: { ...(prev.links || {}), members: Array.from(e.target.selectedOptions).map(o => o.value) } }))} className={cn("w-full", THEME.punk.input)}>
                                        {individuals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={editingMember.isMusician || false} 
                                    onChange={e => setEditingMember(prev => ({ ...prev, isMusician: e.target.checked }))} 
                                    className="w-5 h-5" 
                                />
                                <label className="font-bold">Is Musician</label>
                            </div>
                            {editingMember.isMusician && (
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Instruments</label>
                                    <input 
                                        value={(editingMember.instruments || []).join(', ')} 
                                        onChange={e => setEditingMember(prev => ({ ...prev, instruments: e.target.value.split(',').map(i => i.trim()).filter(Boolean) }))} 
                                        placeholder="guitar, piano, drums"
                                        className={cn("w-full", THEME.punk.input)} 
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Notes</label>
                                <textarea value={editingMember.notes || ''} onChange={e => setEditingMember(prev => ({ ...prev, notes: e.target.value }))} className={cn("w-full h-20", THEME.punk.input)} />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleUpdateMember} className={cn("flex-1 px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>Save</button>
                                <button onClick={() => setEditingMember(null)} className={cn("flex-1 px-4 py-2 bg-gray-300", THEME.punk.btn)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const MiscView = () => {
    const { data, actions } = useStore();
    const [expenseDraft, setExpenseDraft] = useState({ description: '', amount: '', category: 'General' });
    const [showArchived, setShowArchived] = useState(false);

    const costedItems = useMemo(() => {
        const rows = [];
        const pushItem = (name, source, date, cost, notes = '') => {
            if ((cost || 0) <= 0) return;
            rows.push({ id: `${source}-${name}-${date}`, name, source, date: date || 'TBD', cost, notes });
        };

        data.tasks.forEach(t => pushItem(t.title, 'Standalone Task', t.dueDate, getEffectiveCost(t), t.notes));

        (data.songs || []).forEach(song => {
            (song.deadlines || []).forEach(task => pushItem(`${task.type} — ${song.title}`, 'Song Task', task.date, getEffectiveCost(task), task.notes));
            (song.customTasks || []).forEach(task => pushItem(`${task.title} — ${song.title}`, 'Song Custom', task.date, getEffectiveCost(task), task.notes || task.description));
            (song.versions || []).forEach(v => {
                pushItem(`${v.name} — ${song.title}`, 'Version', v.releaseDate, getEffectiveCost(v), v.notes);
                (v.tasks || []).forEach(task => pushItem(`${task.type} — ${v.name}`, 'Version Task', task.date, getEffectiveCost(task), task.notes));
            });
            (song.videos || []).forEach(video => {
                pushItem(`${video.title} — ${song.title}`, 'Video', video.releaseDate, getEffectiveCost(video), video.notes);
                (video.tasks || []).forEach(task => pushItem(`${task.type} — ${video.title}`, 'Video Task', task.date, getEffectiveCost(task), task.notes));
            });
        });

        (data.globalTasks || []).forEach(task => pushItem(task.taskName, 'Global Task', task.date, getEffectiveCost(task), task.notes));
        (data.releases || []).forEach(rel => {
            pushItem(rel.name, 'Release', rel.releaseDate, getEffectiveCost(rel), rel.notes || rel.detailNotes);
            (rel.tasks || []).forEach(task => pushItem(`${task.type} — ${rel.name}`, 'Release Task', task.date, getEffectiveCost(task), task.notes));
            (rel.customTasks || []).forEach(task => pushItem(`${task.title} — ${rel.name}`, 'Release Custom', task.date, getEffectiveCost(task), task.description));
        });

        (data.events || []).forEach(evt => {
            pushItem(evt.title, 'Event', evt.date, getEffectiveCost(evt), evt.notes);
            (evt.customTasks || []).forEach(task => pushItem(`${task.title} — ${evt.title}`, 'Event Task', task.date, getEffectiveCost(task), task.notes));
        });

        // Per APP ARCHITECTURE.txt Section 1.2: Show Expense Items
        (data.expenses || []).filter(e => !e.isArchived || showArchived).forEach(e => pushItem(e.name, 'Expense', e.date, getEffectiveCost(e), e.description));

        (data.misc || []).forEach(m => pushItem(m.description, 'Misc', m.date, m.amount, 'Legacy expense'));

        return rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }, [data, showArchived]);

    // Per APP ARCHITECTURE.txt Section 1.2: Use new Expense Item type
    const addExpenseItem = () => {
        const amount = parseFloat(expenseDraft.amount);
        if (!expenseDraft.description || isNaN(amount)) return;
        actions.addExpense({
            name: expenseDraft.description,
            paidCost: amount,
            category: expenseDraft.category,
            date: new Date().toISOString().split('T')[0],
            status: 'Complete'
        });
        setExpenseDraft({ description: '', amount: '', category: 'General' });
    };

    // Expense Items list
    const expenseItems = useMemo(() => {
        return (data.expenses || []).filter(e => !e.isArchived || showArchived);
    }, [data.expenses, showArchived]);

    return (
        <div className="view-shell">
            <div className="flex flex-wrap justify-between mb-6 items-center gap-4">
                <h2 className={THEME.punk.textStyle}>Expenses</h2>
                <div className="flex flex-wrap gap-2 items-center">
                    <label className="flex items-center gap-2 text-xs font-bold">
                        <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="w-4 h-4" />
                        Show Archived
                    </label>
                    <input value={expenseDraft.description} onChange={e => setExpenseDraft(prev => ({ ...prev, description: e.target.value }))} placeholder="Description" className={cn("px-3 py-2 text-sm", THEME.punk.input)} />
                    <input type="number" value={expenseDraft.amount} onChange={e => setExpenseDraft(prev => ({ ...prev, amount: e.target.value }))} placeholder="$" className={cn("px-3 py-2 text-sm w-28", THEME.punk.input)} />
                    <input value={expenseDraft.category} onChange={e => setExpenseDraft(prev => ({ ...prev, category: e.target.value }))} placeholder="Category" className={cn("px-3 py-2 text-sm w-32", THEME.punk.input)} />
                    <button onClick={addExpenseItem} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Expense</button>
                </div>
            </div>
            
            {/* Expense Items Section - Per APP ARCHITECTURE.txt Section 1.2 */}
            {expenseItems.length > 0 && (
                <div className={cn("mb-6 p-4", THEME.punk.card)}>
                    <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Expense Items</h3>
                    <div className="space-y-2">
                        {expenseItems.map(expense => (
                            <div key={expense.id} className={cn("p-3 flex justify-between items-center", expense.isArchived ? "opacity-50" : "", "bg-white border-2 border-black")}>
                                <div className="flex-1">
                                    <div className="font-bold">{expense.name}</div>
                                    <div className="text-xs opacity-60">
                                        {expense.date} | {expense.category} | {expense.status}
                                    </div>
                                    {expense.description && <div className="text-sm mt-1">{expense.description}</div>}
                                </div>
                                <div className="text-right mr-4">
                                    <div className="font-black text-lg">{formatMoney(getEffectiveCost(expense))}</div>
                                </div>
                                <div className="flex gap-2">
                                    {!expense.isArchived ? (
                                        <button onClick={() => actions.archiveExpense(expense.id)} className="text-orange-500 font-bold text-xs uppercase p-2 hover:bg-orange-50"><Icon name="Archive" size={16} /></button>
                                    ) : (
                                        <button onClick={() => actions.updateExpense(expense.id, { isArchived: false })} className="text-green-500 font-bold text-xs uppercase p-2 hover:bg-green-50">Restore</button>
                                    )}
                                    <button onClick={() => { if (confirm('Delete this expense?')) actions.deleteExpense(expense.id); }} className="text-red-500 font-bold text-xs uppercase p-2 hover:bg-red-50"><Icon name="Trash2" size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* All Costed Items Summary */}
            <div className={cn("mb-4 p-3", THEME.punk.card)}>
                <h3 className="font-black uppercase mb-4 border-b-4 border-black pb-2">All Costed Items</h3>
                <div className="grid grid-cols-4 text-[10px] font-black uppercase mb-2 border-b-2 border-black pb-2">
                    <span>Item</span><span>Source</span><span>Date</span><span className="text-right">Cost</span>
                </div>
                <div className="divide-y divide-gray-200">
                    {costedItems.length === 0 ? (
                        <div className="p-4 text-center opacity-50">No costed items recorded.</div>
                    ) : costedItems.map(item => (
                        <div key={item.id} className="grid grid-cols-4 py-2 text-sm gap-2">
                            <div>
                                <div className="font-bold">{item.name}</div>
                                {item.notes && <div className="text-[11px] opacity-60">{item.notes}</div>}
                            </div>
                            <div className="text-xs font-bold">{item.source}</div>
                            <div className="text-xs">{item.date}</div>
                            <div className="text-right font-black">{formatMoney(item.cost)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const ArchiveView = () => {
    const { data, actions } = useStore();
    const archivedTasks = data.tasks.filter(t => t.archived);
    const archivedGlobal = (data.globalTasks || []).filter(t => t.isArchived);
    return (
        <div className="p-6">
            <h2 className={cn("mb-6", THEME.punk.textStyle)}>Trash</h2>
            <div className="space-y-2">
              {archivedTasks.map(t => (
                <div key={t.id} className={cn("p-3 flex justify-between items-center", THEME.punk.card)}>
                  <div>
                    <div className="font-bold">{t.title}</div>
                    <div className="text-xs opacity-60">Archived {t.archivedAt ? new Date(t.archivedAt).toLocaleString() : 'recently'} by {t.archivedBy || 'Unknown'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>actions.restoreItem('tasks', t.id)} className="text-green-600 font-bold text-xs uppercase">Restore</button>
                    <button onClick={()=>actions.delete('tasks', t.id)} className="text-red-600 font-bold text-xs uppercase">Delete</button>
                  </div>
                </div>
              ))}
              {archivedGlobal.map(t => (
                <div key={t.id} className={cn("p-3 flex justify-between items-center", THEME.punk.card)}>
                  <div>
                    <div className="font-bold">{t.title}</div>
                    <div className="text-xs opacity-60">Global task archived {t.archivedAt ? new Date(t.archivedAt).toLocaleString() : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>actions.updateGlobalTask(t.id, { isArchived: false, archived: false })} className="text-green-600 font-bold text-xs uppercase">Restore</button>
                    <button onClick={()=>actions.deleteGlobalTask(t.id)} className="text-red-600 font-bold text-xs uppercase">Delete</button>
                  </div>
                </div>
              ))}
              {(data.auditLog || []).slice(0, 10).map(log => (
                <div key={log.id} className={cn("p-3 text-xs", THEME.punk.card)}>
                  <div className="font-bold uppercase">{log.action}</div>
                  <div>{log.entityType} / {log.entityId}</div>
                  <div className="opacity-60">{new Date(log.timestamp).toLocaleString()} — {log.actor}</div>
                  {log.reason && <div className="italic">{log.reason}</div>}
                </div>
              ))}
            </div>
        </div>
    );
};

export const ActiveView = ({ onEdit }) => {
    const { data } = useStore();
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Collect all tasks from various sources
    const allTasks = useMemo(() => {
        const tasks = [];
        
        // Legacy tasks from the original tasks array
        const legacyTasks = data.tasks.filter(t => !t.archived && !t.isCategory && t.status !== 'done');
        legacyTasks.forEach(t => {
            tasks.push({
                ...t,
                source: 'Legacy',
                sourceName: t.title,
                effectiveCost: t.actualCost || t.quotedCost || t.estimatedCost || 0,
                isPaid: t.actualCost > 0
            });
        });
        
        // Song tasks (deadlines) and custom tasks
        (data.songs || []).forEach(song => {
            (song.deadlines || []).filter(d => d.status !== 'Done').forEach(d => {
                tasks.push({
                    id: `song-${song.id}-${d.id}`,
                    title: d.type,
                    dueDate: getTaskDueDate(d),
                    status: d.status,
                    source: 'Song',
                    sourceName: song.title,
                    estimatedCost: d.estimatedCost || 0,
                    quotedCost: d.quotedCost || 0,
                    paidCost: d.paidCost || 0,
                    effectiveCost: d.paidCost || d.quotedCost || d.estimatedCost || 0,
                    isPaid: (d.paidCost || 0) > 0
                });
            });
            (song.customTasks || []).filter(t => t.status !== 'Done').forEach(t => {
                tasks.push({
                    id: `song-custom-${song.id}-${t.id}`,
                    title: t.title,
                    dueDate: getTaskDueDate(t),
                    status: t.status,
                    source: 'Song',
                    sourceName: song.title,
                    estimatedCost: t.estimatedCost || 0,
                    quotedCost: t.quotedCost || 0,
                    paidCost: t.paidCost || 0,
                    effectiveCost: t.paidCost || t.quotedCost || t.estimatedCost || 0,
                    isPaid: (t.paidCost || 0) > 0
                });
            });
        });
        
        // Global tasks
        (data.globalTasks || []).filter(t => t.status !== 'Done' && !t.isArchived).forEach(t => {
            tasks.push({
                id: `global-${t.id}`,
                title: t.taskName,
                dueDate: getTaskDueDate(t),
                status: t.status,
                source: 'Global',
                sourceName: t.category,
                estimatedCost: t.estimatedCost || 0,
                quotedCost: t.quotedCost || 0,
                paidCost: t.paidCost || 0,
                effectiveCost: t.paidCost || t.quotedCost || t.estimatedCost || 0,
                isPaid: (t.paidCost || 0) > 0
            });
        });
        
        // Release tasks
        (data.releases || []).forEach(release => {
            (release.tasks || []).filter(t => t.status !== 'Done').forEach(t => {
                tasks.push({
                    id: `release-${release.id}-${t.id}`,
                    title: t.type,
                    dueDate: getTaskDueDate(t) || release.releaseDate,
                    status: t.status,
                    source: 'Release',
                    sourceName: release.name,
                    estimatedCost: t.estimatedCost || 0,
                    quotedCost: t.quotedCost || 0,
                    paidCost: t.paidCost || 0,
                    effectiveCost: t.paidCost || t.quotedCost || t.estimatedCost || 0,
                    isPaid: (t.paidCost || 0) > 0
                });
            });
        });
        
        return tasks;
    }, [data.tasks, data.songs, data.globalTasks, data.releases]);
    
    // Filter tasks into categories
    const inProgress = allTasks.filter(t => t.status === 'In Progress');
    const overdue = allTasks.filter(t => t.dueDate && t.dueDate < today);
    const dueSoon = allTasks.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= nextWeek);
    const unpaid = allTasks.filter(t => !t.isPaid && t.effectiveCost > 0);
    
    const TaskCard = ({ task, highlight }) => (
        <div 
            key={task.id} 
            onClick={() => task.source === 'Legacy' ? onEdit(task) : undefined} 
            className={cn(
                "p-4 cursor-pointer hover:bg-yellow-50 border-l-4",
                THEME.punk.card,
                highlight === 'overdue' ? 'border-l-red-500 bg-red-50' :
                highlight === 'dueSoon' ? 'border-l-yellow-500 bg-yellow-50' :
                highlight === 'inProgress' ? 'border-l-blue-500 bg-blue-50' :
                highlight === 'unpaid' ? 'border-l-purple-500 bg-purple-50' :
                'border-l-gray-300'
            )}
        >
            <div className="font-bold text-lg">{task.title}</div>
            <div className="text-xs font-bold text-gray-600">{task.source}: {task.sourceName}</div>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
                {task.dueDate && <span className={cn("px-2 py-1 font-bold border border-black", task.dueDate < today ? 'bg-red-200' : task.dueDate <= nextWeek ? 'bg-yellow-200' : 'bg-gray-200')}>
                    {task.dueDate < today ? 'OVERDUE: ' : 'Due: '}{task.dueDate}
                </span>}
                <span className={cn("px-2 py-1 font-bold border border-black", task.status === 'In Progress' ? 'bg-blue-200' : 'bg-gray-200')}>{task.status}</span>
                {task.effectiveCost > 0 && <span className={cn("px-2 py-1 font-bold border border-black", task.isPaid ? 'bg-green-200' : 'bg-purple-200')}>{task.isPaid ? 'Paid' : 'Unpaid'}: {formatMoney(task.effectiveCost)}</span>}
            </div>
        </div>
    );
    
    return (
        <div className="view-shell">
            <h2 className={cn("mb-6", THEME.punk.textStyle)}>Active Tasks</h2>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className={cn("p-4 text-center", THEME.punk.card, "bg-red-50")}>
                    <div className="text-3xl font-black text-red-600">{overdue.length}</div>
                    <div className="text-xs font-bold uppercase">Overdue</div>
                </div>
                <div className={cn("p-4 text-center", THEME.punk.card, "bg-yellow-50")}>
                    <div className="text-3xl font-black text-yellow-600">{dueSoon.length}</div>
                    <div className="text-xs font-bold uppercase">Due This Week</div>
                </div>
                <div className={cn("p-4 text-center", THEME.punk.card, "bg-blue-50")}>
                    <div className="text-3xl font-black text-blue-600">{inProgress.length}</div>
                    <div className="text-xs font-bold uppercase">In Progress</div>
                </div>
                <div className={cn("p-4 text-center", THEME.punk.card, "bg-purple-50")}>
                    <div className="text-3xl font-black text-purple-600">{unpaid.length}</div>
                    <div className="text-xs font-bold uppercase">Unpaid</div>
                </div>
            </div>
            
            {/* Overdue Tasks */}
            {overdue.length > 0 && (
                <div className="mb-6">
                    <h3 className="font-black uppercase text-red-600 mb-3 border-b-4 border-red-600 pb-2">⚠️ Overdue Tasks</h3>
                    <div className="grid gap-3">{overdue.map(t => <TaskCard key={t.id} task={t} highlight="overdue" />)}</div>
                </div>
            )}
            
            {/* Due This Week */}
            {dueSoon.length > 0 && (
                <div className="mb-6">
                    <h3 className="font-black uppercase text-yellow-600 mb-3 border-b-4 border-yellow-600 pb-2">📅 Due This Week</h3>
                    <div className="grid gap-3">{dueSoon.map(t => <TaskCard key={t.id} task={t} highlight="dueSoon" />)}</div>
                </div>
            )}
            
            {/* In Progress */}
            {inProgress.length > 0 && (
                <div className="mb-6">
                    <h3 className="font-black uppercase text-blue-600 mb-3 border-b-4 border-blue-600 pb-2">🔄 In Progress</h3>
                    <div className="grid gap-3">{inProgress.map(t => <TaskCard key={t.id} task={t} highlight="inProgress" />)}</div>
                </div>
            )}
            
            {/* Unpaid Tasks */}
            {unpaid.length > 0 && (
                <div className="mb-6">
                    <h3 className="font-black uppercase text-purple-600 mb-3 border-b-4 border-purple-600 pb-2">💰 Unpaid Tasks</h3>
                    <div className="grid gap-3">{unpaid.map(t => <TaskCard key={t.id} task={t} highlight="unpaid" />)}</div>
                </div>
            )}
            
            {allTasks.length === 0 && (
                <div className="text-center py-10 opacity-50">No active tasks found.</div>
            )}
        </div>
    );
};

export const SettingsView = () => {
    const { data, actions, mode, mods } = useStore();
    const settings = data.settings || {};
    const themeMode = settings.themeMode || 'light';
    const accent = settings.themeColor || 'pink';
    const isConnected = mode === 'cloud';
    const isLoading = mode === 'loading';
    const [templateDrafts, setTemplateDrafts] = useState(settings.templates || []);
    const [importText, setImportText] = useState('');
    const [migrationNotes, setMigrationNotes] = useState(settings.migrationNotes || '');
    const [migrationRanAt, setMigrationRanAt] = useState(settings.migrationRanAt || '');
    const [modImportText, setModImportText] = useState('');
    const [modStatus, setModStatus] = useState('');

    useEffect(() => {
      setTemplateDrafts(settings.templates || []);
    }, [settings.templates]);

    const handleAddTemplate = () => {
      const next = [...templateDrafts, { id: crypto.randomUUID(), name: 'New Template', era: settings.defaultEra || 'Modern', body: '' }];
      setTemplateDrafts(next);
      actions.saveSettings({ templates: next });
    };

    const handleTemplateChange = (id, key, value) => {
      const updated = templateDrafts.map(t => t.id === id ? { ...t, [key]: value } : t);
      setTemplateDrafts(updated);
      actions.saveSettings({ templates: updated });
    };

    const handleTemplateDelete = (id) => {
      const updated = templateDrafts.filter(t => t.id !== id);
      setTemplateDrafts(updated);
      actions.saveSettings({ templates: updated });
    };

    const handleImportTemplates = () => {
      try {
        const parsed = JSON.parse(importText);
        if (Array.isArray(parsed)) {
          setTemplateDrafts(parsed);
          actions.saveSettings({ templates: parsed });
          setImportText('');
        }
      } catch (e) {
        alert('Unable to import templates. Please provide valid JSON.');
      }
    };

    const exportTemplates = () => {
      const blob = new Blob([JSON.stringify(templateDrafts, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'album-tracker-templates.json';
      a.click();
      URL.revokeObjectURL(url);
    };

    const modExample = JSON.stringify({
      id: 'release-ops-mod',
      name: 'Release Ops Booster',
      version: '0.1.0',
      author: 'Community',
      description: 'Adds a few release-ready quick actions.',
      actions: [
        { id: 'prep-release', type: 'createTask', label: 'Prep Release Metadata', template: { description: 'Fill out ISRC/UPC + credits', status: 'In-Progress' } },
        { id: 'add-checklist', type: 'addTemplate', label: 'Release Checklist Template', template: { name: 'Release Checklist', body: '- ISRCs\n- Credits\n- DSP metadata' } },
        { id: 'open-style-guide', type: 'openLink', label: 'Open Style Guide', url: 'https://example.com/style-guide' }
      ]
    }, null, 2);

    const handleImportMod = () => {
      try {
        const parsed = JSON.parse(modImportText);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        list.forEach(mod => actions.registerMod(mod));
        setModStatus(`Imported ${list.length} mod${list.length === 1 ? '' : 's'}.`);
        setModImportText('');
      } catch (e) {
        alert('Unable to import mods. Please provide valid JSON.');
      }
    };

    const handleRunModAction = async (modId, actionId) => {
      const result = await actions.runModAction(modId, actionId);
      if (result) setModStatus('Ran mod action successfully.');
    };

    const handleToggleMod = (modId, enabled) => {
      actions.toggleMod(modId, enabled);
    };

    const handleRemoveMod = (modId) => {
      actions.removeMod(modId);
    };

    const migrationPreview = {
      tasks: data.tasks.length,
      songs: (data.songs || []).length,
      releases: (data.releases || []).length,
      globalTasks: (data.globalTasks || []).length,
      templates: templateDrafts.length,
      storage: mode === 'cloud' ? 'Cloud' : 'Local'
    };

    const backupAllData = () => {
      const payload = { ...data, settings: { ...settings, templates: templateDrafts } };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `album-tracker-backup-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      actions.saveSettings({ lastBackup: new Date().toISOString() });
    };

    const runMigrationFlow = async () => {
      const marker = await actions.runMigration(migrationNotes);
      setMigrationRanAt(marker.migrationRanAt);
    };

    return (
        <div className="p-6 max-w-xl">
            <h2 className={cn("mb-6", THEME.punk.textStyle)}>Settings</h2>
            <div className={cn("p-6 space-y-6", THEME.punk.card)}>
                {/* Project Info */}
                <div>
                    <label className="font-bold block mb-1">Album</label>
                    <input
                        value={settings.albumTitle || ''}
                        onChange={e => actions.saveSettings({ albumTitle: e.target.value })}
                        className={cn("w-full", THEME.punk.input)}
                    />
                </div>
                <div>
                    <label className="font-bold block mb-1">Artist</label>
                    <input
                        value={settings.artistName || ''}
                        onChange={e => actions.saveSettings({ artistName: e.target.value })}
                        className={cn("w-full", THEME.punk.input)}
                    />
                </div>

                {/* Default Era */}
                <div>
                  <label className="font-bold block mb-1">Default Era</label>
                  <select
                    value={settings.defaultEraId || ''}
                    onChange={e => actions.saveSettings({ defaultEraId: e.target.value })}
                    className={cn("w-full", THEME.punk.input)}
                  >
                    <option value="">No default</option>
                    {(data.eras || []).map(era => <option key={era.id} value={era.id}>{era.name}</option>)}
                  </select>
                </div>

                {/* Theme Mode */}
                <div className="pt-4 border-t-4 border-black">
                    <h3 className="font-black text-xs uppercase mb-2">Theme Mode</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => actions.saveSettings({ themeMode: 'light' })}
                            className={cn(
                                "py-3 text-xs font-black uppercase",
                                THEME.punk.btn,
                                themeMode === 'light' ? "bg-black text-white" : "bg-white"
                            )}
                        >
                            Light
                        </button>
                        <button
                            onClick={() => actions.saveSettings({ themeMode: 'dark' })}
                            className={cn(
                                "py-3 text-xs font-black uppercase",
                                THEME.punk.btn,
                                themeMode === 'dark' ? "bg-black text-white" : "bg-white"
                            )}
                        >
                            Dark
                        </button>
                    </div>
                </div>

                {/* Accent Color */}
                <div className="pt-4 border-t-4 border-black">
                    <h3 className="font-black text-xs uppercase mb-2">Accent Color</h3>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(COLORS).map(([key, cls]) => {
                            const parts = cls.split(' ');
                            const bgClass = parts[0];
                            const textClass = parts[2];
                            const isActive = key === accent;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => actions.saveSettings({ themeColor: key })}
                                    className={cn(
                                        "flex flex-col items-center gap-1 text-[10px] font-black uppercase",
                                        isActive ? "opacity-100" : "opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-8 h-8 rounded-full border-4 border-black",
                                            bgClass
                                        )}
                                    />
                                    <span className={textClass}>{key}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Default Era */}
                <div className="pt-4 border-t-4 border-black">
                  <h3 className="font-black text-xs uppercase mb-2">Default Era</h3>
                  <select
                    value={settings.defaultEra || 'Modern'}
                    onChange={e => actions.saveSettings({ defaultEra: e.target.value })}
                    className={cn("w-full", THEME.punk.input)}
                  >
                    {['Debut', 'Fearless', 'Speak Now', 'Red', '1989', 'Reputation', 'Lover', 'Folklore', 'Evermore', 'Midnights', 'Modern'].map(era => (
                      <option key={era} value={era}>{era}</option>
                    ))}
                  </select>
                  <p className="text-xs opacity-70 mt-2">Used as the fallback era for new templates and migration previews.</p>
                </div>

                {/* Auto Task Toggles */}
                <div className="pt-4 border-t-4 border-black space-y-3">
                  <h3 className="font-black text-xs uppercase">Auto-Generated Tasks</h3>
                  {[{ key: 'autoTaskSongs', label: 'Auto-generate song tasks' }, { key: 'autoTaskVideos', label: 'Auto-generate video tasks' }, { key: 'autoTaskReleases', label: 'Auto-generate release tasks' }].map(toggle => (
                    <label key={toggle.key} className="flex items-center gap-2 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={settings[toggle.key] !== false}
                        onChange={e => actions.saveSettings({ [toggle.key]: e.target.checked })}
                      />
                      {toggle.label}
                    </label>
                  ))}
                </div>

                {/* Templates */}
                <div className="pt-4 border-t-4 border-black space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xs uppercase">Templates</h3>
                    <button onClick={handleAddTemplate} className={cn("px-3 py-2 text-xs", THEME.punk.btn, "bg-black text-white")}>+ Add Template</button>
                  </div>
                  <div className="space-y-3">
                    {templateDrafts.map(t => (
                      <div key={t.id} className={cn("p-3 space-y-2", THEME.punk.card)}>
                        <input value={t.name} onChange={e => handleTemplateChange(t.id, 'name', e.target.value)} className={cn("w-full", THEME.punk.input)} placeholder="Template name" />
                        <select value={t.era || settings.defaultEra || 'Modern'} onChange={e => handleTemplateChange(t.id, 'era', e.target.value)} className={cn("w-full", THEME.punk.input)}>
                          {['Debut', 'Fearless', 'Speak Now', 'Red', '1989', 'Reputation', 'Lover', 'Folklore', 'Evermore', 'Midnights', 'Modern'].map(era => (
                            <option key={era} value={era}>{era}</option>
                          ))}
                        </select>
                        <textarea value={t.body || ''} onChange={e => handleTemplateChange(t.id, 'body', e.target.value)} className={cn("w-full", THEME.punk.input)} rows={3} placeholder="Template body" />
                        <div className="flex justify-between text-xs">
                          <span className="opacity-60">Last updated {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : 'now'}</span>
                          <button onClick={() => handleTemplateDelete(t.id)} className="text-red-600 font-bold uppercase">Delete</button>
                        </div>
                      </div>
                    ))}
                    {templateDrafts.length === 0 && <div className={cn("p-3 text-xs", THEME.punk.card)}>No templates yet. Add one to start building repeatable tasks.</div>}
                  </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button onClick={exportTemplates} className={cn("flex-1 px-3 py-2 text-xs", THEME.punk.btn, "bg-green-600 text-white")}>Export Templates</button>
                    <button onClick={handleImportTemplates} className={cn("flex-1 px-3 py-2 text-xs", THEME.punk.btn, "bg-blue-600 text-white")}>Import Templates</button>
                  </div>
                  <textarea value={importText} onChange={e => setImportText(e.target.value)} className={cn("w-full", THEME.punk.input)} rows={3} placeholder="Paste template JSON to import" />
                </div>
              </div>

                {/* Mods */}
                <div className="pt-4 border-t-4 border-black space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xs uppercase">Mods</h3>
                    {modStatus && <span className="text-[10px] font-bold text-green-700">{modStatus}</span>}
                  </div>
                  <p className="text-xs opacity-70">Drop in community or personal mods to add quick actions, templates, or helper links without touching the core app.</p>
                  <div className="space-y-3">
                    {(mods || []).map(mod => (
                      <div key={mod.id} className={cn("p-3 space-y-2", THEME.punk.card)}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold">{mod.name} <span className="text-[10px] opacity-60">v{mod.version}</span></div>
                            <div className="text-[11px] opacity-70">By {mod.author}</div>
                            <div className="text-xs opacity-80 mt-1">{mod.description}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2 text-xs">
                            <label className="flex items-center gap-2 font-bold">
                              <input type="checkbox" checked={mod.enabled !== false} onChange={e => handleToggleMod(mod.id, e.target.checked)} />
                              Enabled
                            </label>
                            <button onClick={() => handleRemoveMod(mod.id)} className="text-red-600 font-bold uppercase">Remove</button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {(mod.actions || []).map(action => (
                            <div key={action.id} className="flex items-center justify-between text-sm">
                              <div>
                                <div className="font-bold">{action.label}</div>
                                <div className="text-[11px] opacity-60">{action.type}</div>
                              </div>
                              <button onClick={() => handleRunModAction(mod.id, action.id)} className={cn("px-3 py-1 text-xs", THEME.punk.btn, "bg-black text-white")}>Run</button>
                            </div>
                          ))}
                          {(mod.actions || []).length === 0 && <div className="text-xs opacity-60">No actions defined.</div>}
                        </div>
                      </div>
                    ))}
                    {(mods || []).length === 0 && (
                      <div className={cn("p-3 text-xs", THEME.punk.card)}>
                        No mods installed yet. Paste a JSON mod to get started.
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <div className="text-[10px] font-black uppercase opacity-60">Import or Author</div>
                      <button onClick={() => setModImportText(modExample)} className={cn("px-3 py-1 text-[10px]", THEME.punk.btn)}>Load Example</button>
                    </div>
                    <textarea value={modImportText} onChange={e => setModImportText(e.target.value)} className={cn("w-full", THEME.punk.input)} rows={6} placeholder="Paste mod JSON here" />
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={handleImportMod} className={cn("px-3 py-2 text-xs", THEME.punk.btn, "bg-blue-600 text-white")}>Import Mod</button>
                      <button
                        onClick={() => {
                          const payload = mods.length > 0 ? mods : [{ id: 'example-mod', name: 'Example', version: '0.1.0', actions: [] }];
                          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'album-tracker-mods.json';
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className={cn("px-3 py-2 text-xs", THEME.punk.btn, "bg-green-700 text-white")}
                      >
                        Export Mods
                      </button>
                    </div>
                    <div className="text-[11px] opacity-70">Supported actions: createTask, createGlobalTask, addTemplate, addStage, addTag, openLink.</div>
                  </div>
                </div>

                {/* Migration Onboarding */}
                <div className="pt-4 border-t-4 border-black space-y-3">
                  <h3 className="font-black text-xs uppercase">Migration Onboarding</h3>
                  <div className={cn("p-3 text-xs space-y-2", THEME.punk.card)}>
                    <div className="font-bold">Preview</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(migrationPreview).map(([key, value]) => (
                        <div key={key} className="flex justify-between border-b border-dashed border-black/30 pb-1">
                          <span className="uppercase font-bold">{key}</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2">
                      <label className="block font-bold mb-1">Notes</label>
                      <textarea value={migrationNotes} onChange={e => setMigrationNotes(e.target.value)} className={cn("w-full", THEME.punk.input)} rows={3} placeholder="Add any migration notes or blockers" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={backupAllData} className={cn("flex-1 px-3 py-2 text-xs", THEME.punk.btn, "bg-purple-600 text-white")}>Backup ({mode === 'cloud' ? 'Cloud' : 'Local'})</button>
                      <button onClick={runMigrationFlow} className={cn("flex-1 px-3 py-2 text-xs", THEME.punk.btn, "bg-amber-500 text-white")}>Run Migration</button>
                    </div>
                    {migrationRanAt && <div className="text-[10px] opacity-70">Last migration: {new Date(migrationRanAt).toLocaleString()}</div>}
                  </div>
                </div>

                {/* Stages */}
                <div className="pt-4 border-t-4 border-black">
                  <h3 className="font-black text-xs uppercase mb-2">Workflow Stages</h3>
                  <div className="space-y-2">
                    {(data.stages || []).map(stage => (
                      <div key={stage.id} className="flex items-center gap-2">
                        <input value={stage.name} onChange={e => actions.updateStage(stage.id, { name: e.target.value })} className={cn("flex-1", THEME.punk.input)} />
                        <button onClick={() => actions.deleteStage(stage.id)} className="text-red-500 font-bold text-xs">Delete</button>
                      </div>
                    ))}
                    <button onClick={() => actions.addStage({ name: `Stage ${ (data.stages?.length || 0) + 1}` })} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Stage</button>
                  </div>
                </div>

                {/* Tags */}
                <div className="pt-4 border-t-4 border-black">
                  <h3 className="font-black text-xs uppercase mb-2">Tags</h3>
                  <div className="space-y-2">
                    {(data.tags || []).map(tag => (
                      <div key={tag.id} className="flex items-center gap-2">
                        <input value={tag.name} onChange={e => actions.updateTag(tag.id, { name: e.target.value })} className={cn("flex-1", THEME.punk.input)} />
                        <input type="color" value={tag.color || '#000000'} onChange={e => actions.updateTag(tag.id, { color: e.target.value })} className="w-16 h-10 border-4 border-black" />
                        <button onClick={() => actions.deleteTag(tag.id)} className="text-red-500 font-bold text-xs">Delete</button>
                      </div>
                    ))}
                    <button onClick={() => actions.addTag({ name: `Tag ${(data.tags?.length || 0) + 1}` })} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Tag</button>
                  </div>
                </div>

                {/* Cloud connection */}
                <div className="pt-4 border-t-4 border-black">
                    <h3 className="font-black text-xs uppercase mb-2">Cloud Sync</h3>
                    
                    {/* Connection Status */}
                    <div className={cn("p-3 mb-3 text-xs font-bold border-4 border-black", isConnected ? "bg-green-100" : isLoading ? "bg-yellow-100" : "bg-gray-100")}>
                        Status: {isLoading ? "Loading..." : isConnected ? "✓ Connected (Cloud Mode)" : "○ Local Storage Only"}
                    </div>
                    
                    <p className="text-xs mb-3 opacity-70">
                        {isConnected 
                            ? "Your data is syncing across all devices via Firebase. Disconnect to switch back to local storage." 
                            : "Currently using local storage. Connect to Firebase to sync data across PC and mobile devices."}
                    </p>
                    
                    {!isConnected && (
                        <div className="text-xs mb-3 p-3 bg-blue-50 border-2 border-blue-300">
                            <p className="font-bold mb-1">📱 Want to sync across devices?</p>
                            <p className="opacity-80">Follow the setup guide to connect Firebase and access your data from both PC and Android phone!</p>
                            <p className="mt-2 opacity-70">See FIREBASE_SETUP.md in the project repository for detailed instructions.</p>
                        </div>
                    )}
                    
                    <button
                        onClick={() => {
                            const c = prompt("Paste Firebase config JSON:\n\nExample:\n{\n  \"apiKey\": \"YOUR_API_KEY\",\n  \"authDomain\": \"...\",\n  \"projectId\": \"...\",\n  \"storageBucket\": \"...\",\n  \"messagingSenderId\": \"...\",\n  \"appId\": \"...\"\n}");
                            if (c) {
                                try {
                                    const config = JSON.parse(c);
                                    // Validate required fields
                                    if (!config.apiKey || !config.authDomain || !config.projectId) {
                                        alert("Missing required fields. Please ensure your Firebase config includes apiKey, authDomain, and projectId.");
                                        return;
                                    }
                                    actions.connectCloud(config);
                                } catch (e) {
                                    alert(`Invalid JSON format: ${e.message}\n\nPlease check your Firebase config and try again. Make sure to copy the entire configuration object.`);
                                }
                            }
                        }}
                        className={cn("w-full py-3 mb-2", THEME.punk.btn, "bg-blue-500 text-white")}
                        disabled={isConnected}
                    >
                        {isConnected ? "Already Connected" : "Connect to Firebase"}
                    </button>
                    
                    {isConnected && (
                        <button
                            onClick={() => {
                                if (confirm("Disconnect from Firebase? Your local data will be preserved, but you'll lose cloud sync until you reconnect.")) {
                                    actions.disconnect();
                                }
                            }}
                            className={cn("w-full py-3", THEME.punk.btn, "bg-red-500 text-white")}
                        >
                            Disconnect from Firebase
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
